require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { createClient } = require('@deepgram/sdk');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3456;

// Determine API endpoint based on environment variable (default to EU)
const USE_EU_ENDPOINT = process.env.USE_EU_ENDPOINT !== 'false';
const API_ENDPOINT = USE_EU_ENDPOINT ? 'https://api.eu.deepgram.com' : 'https://api.deepgram.com';

// Initialize Deepgram client with configurable endpoint
const deepgram = createClient(process.env.DEEPGRAM_API_KEY, {
  global: {
    fetch: {
      options: {
        url: API_ENDPOINT
      }
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB limit
  }
});

// Helper function to clean up uploaded files
async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

// Helper function to apply speaker names to transcript
function applySpeakerNames(result, speakerNames) {
  if (!speakerNames || Object.keys(speakerNames).length === 0) {
    return result;
  }

  // Apply names to utterances if present
  if (result.type === 'utterances' && Array.isArray(result.content)) {
    result.content = result.content.map(utterance => ({
      ...utterance,
      speaker: speakerNames[utterance.speaker] || `Speaker ${utterance.speaker}`
    }));
  }

  return result;
}

// Helper function to calculate cost based on Deepgram pricing
function calculateCost(durationSeconds, model) {
  // Deepgram pricing (as of 2025)
  const pricing = {
    'nova-3': 0.0059,
    'nova-2': 0.0043,
    'base': 0.0025,
    'enhanced': 0.0037
  };
  const pricePerMinute = pricing[model] || 0.0059;
  const minutes = durationSeconds / 60;
  return (minutes * pricePerMinute).toFixed(4);
}

// Main transcription endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;

    // Parse options from request
    const modelName = req.body.model || 'nova-3';
    const options = {
      model: modelName,
      smart_format: req.body.smart_format !== 'false',
      language: req.body.language || 'en',
      utterances: req.body.utterances !== 'false',
      punctuate: true,
      paragraphs: true,
      diarize: req.body.enable_speakers === 'true',
      detect_language: req.body.language === 'auto'
    };

    // Parse speaker names if provided
    let speakerNames = {};
    if (req.body.speaker_names) {
      try {
        const names = JSON.parse(req.body.speaker_names);
        speakerNames = names.reduce((acc, name, index) => {
          if (name && name.trim()) {
            acc[index] = name.trim();
          }
          return acc;
        }, {});
      } catch (e) {
        console.error('Error parsing speaker names:', e);
      }
    }

    // Read file content
    const audioBuffer = await fs.readFile(filePath);

    // Transcribe using Deepgram SDK
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      options
    );

    if (error) {
      console.error('Deepgram API error:', error);
      throw new Error(`Deepgram API error: ${JSON.stringify(error)}`);
    }

    // Extract duration and metadata
    const metadata = result.metadata || {};
    const duration = metadata.duration || 0;
    const channels = result.results?.channels || [];

    // Extract transcript
    let transcriptResult;
    if (channels.length > 0 && channels[0]) {
      const channel = channels[0];
      const alternative = channel.alternatives?.[0];

      if (!alternative) {
        throw new Error('No alternative transcription found in response');
      }

      if (options.utterances && alternative.paragraphs) {
        // Format with utterances (includes speaker info if diarization enabled)
        const paragraphs = alternative.paragraphs.paragraphs || [];
        transcriptResult = {
          type: 'utterances',
          content: paragraphs.map(p => ({
            speaker: p.speaker !== undefined ? p.speaker : null,
            start: p.start,
            end: p.end,
            text: p.sentences?.map(s => s.text).join(' ') || '',
            confidence: alternative.confidence
          }))
        };

        // Apply custom speaker names
        transcriptResult = applySpeakerNames(transcriptResult, speakerNames);
      } else if (alternative.transcript) {
        // Simple transcript
        transcriptResult = {
          type: 'text',
          content: alternative.transcript
        };
      } else {
        throw new Error('Unable to extract transcript from response');
      }
    } else {
      throw new Error('Invalid response format from Deepgram');
    }

    // Clean up the uploaded file
    await cleanupFile(filePath);

    // Calculate estimated cost
    const estimatedCost = calculateCost(duration, modelName);

    res.json({
      success: true,
      result: transcriptResult,
      metadata: {
        model: modelName,
        diarization_enabled: options.diarize,
        language: channels[0]?.detected_language || options.language,
        duration: duration,
        duration_formatted: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
        estimated_cost: `$${estimatedCost}`,
        request_id: metadata.request_id,
        api_endpoint: USE_EU_ENDPOINT ? 'EU' : 'US'
      }
    });

  } catch (error) {
    console.error('Transcription error:', error);

    // Clean up file if it exists
    if (filePath) {
      await cleanupFile(filePath);
    }

    res.status(500).json({
      error: 'Transcription failed',
      message: error.message,
      details: error.response?.data || null
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the transcriber`);
  console.log(`Using Deepgram ${USE_EU_ENDPOINT ? 'EU' : 'US'} endpoint: ${API_ENDPOINT}`);
});
