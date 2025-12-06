require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { createClient } = require('@deepgram/sdk');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3456;

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

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

// Main transcription endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;

    // Parse options from request
    const options = {
      model: req.body.model || 'nova-3',  // Latest Nova-3 model
      smart_format: req.body.smart_format !== 'false',
      language: req.body.language || 'en',
      utterances: req.body.utterances !== 'false',
      punctuate: true,
      paragraphs: true,
      diarize: req.body.enable_speakers === 'true',  // NEW: Speaker diarization
      detect_language: req.body.language === 'auto'
    };

    // Parse speaker names if provided
    let speakerNames = {};
    if (req.body.speaker_names) {
      try {
        const names = JSON.parse(req.body.speaker_names);
        // Convert array to object: {0: "John", 1: "Sarah"}
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
      throw new Error(`Deepgram API error: ${error.message}`);
    }

    // Extract transcript
    let transcriptResult;
    if (result.results && result.results.channels && result.results.channels[0]) {
      const channel = result.results.channels[0];
      const alternative = channel.alternatives[0];

      if (options.utterances && alternative.paragraphs) {
        // Format with utterances (includes speaker info if diarization enabled)
        const paragraphs = alternative.paragraphs.paragraphs || [];
        transcriptResult = {
          type: 'utterances',
          content: paragraphs.map(p => ({
            speaker: p.speaker !== undefined ? p.speaker : null,
            start: p.start,
            end: p.end,
            text: p.sentences.map(s => s.text).join(' '),
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

    res.json({
      success: true,
      result: transcriptResult,
      metadata: {
        model: options.model,
        diarization_enabled: options.diarize,
        language: result.results?.channels?.[0]?.detected_language || options.language
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
});
