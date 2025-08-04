require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3456;

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
      model: req.body.model || 'nova-3',
      smart_format: req.body.smart_format !== 'false',
      language: req.body.language || 'auto',
      utterances: req.body.utterances !== 'false',
      detect_language: req.body.language === 'auto',
      output_format: req.body.output_format || 'text'
    };

    // Build query parameters
    const params = new URLSearchParams({
      model: options.model,
      smart_format: options.smart_format,
      utterances: options.utterances
    });

    // Handle language settings
    if (!options.detect_language) {
      params.append('language', options.language);
    } else {
      params.append('detect_language', 'true');
    }

    // Add format-specific parameters
    if (options.output_format === 'webvtt' || options.output_format === 'srt') {
      params.append('format', options.output_format);
    }

    // Read file content
    const fileContent = await fs.readFile(filePath);
    
    // Determine content type
    const mimeType = req.file.mimetype || 'audio/wav';
    
    // Make request to Deepgram API
    const deepgramUrl = `${process.env.DEEPGRAM_API_URL || 'https://eu.api.deepgram.com/v1/listen'}?${params.toString()}`;
    
    const response = await axios.post(deepgramUrl, fileContent, {
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    // Handle different output formats
    let result;
    switch (options.output_format) {
      case 'json':
        result = response.data;
        break;
      case 'webvtt':
      case 'srt':
        result = {
          type: 'caption',
          format: options.output_format,
          content: response.data
        };
        break;
      default:
        // Extract transcript text
        if (response.data.results && response.data.results.channels && response.data.results.channels[0]) {
          const channel = response.data.results.channels[0];
          
          if (options.utterances && channel.alternatives && channel.alternatives[0].paragraphs) {
            // Format with utterances
            const paragraphs = channel.alternatives[0].paragraphs.paragraphs || [];
            result = {
              type: 'utterances',
              content: paragraphs.map(p => ({
                speaker: p.speaker,
                start: p.start,
                end: p.end,
                text: p.sentences.map(s => s.text).join(' ')
              }))
            };
          } else if (channel.alternatives && channel.alternatives[0].transcript) {
            // Simple transcript
            result = {
              type: 'text',
              content: channel.alternatives[0].transcript
            };
          } else {
            throw new Error('Unable to extract transcript from response');
          }
        } else {
          throw new Error('Invalid response format from Deepgram');
        }
    }

    // Clean up the uploaded file
    await cleanupFile(filePath);
    
    res.json({ success: true, result });

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