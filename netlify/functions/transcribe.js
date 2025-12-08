import { createClient } from '@deepgram/sdk';

// Determine API endpoint
const USE_EU_ENDPOINT = process.env.USE_EU_ENDPOINT !== 'false';
const API_ENDPOINT = USE_EU_ENDPOINT ? 'https://api.eu.deepgram.com' : 'https://api.deepgram.com';

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY, {
  global: {
    fetch: {
      options: {
        url: API_ENDPOINT
      }
    }
  }
});

// Helper function to apply speaker names
function applySpeakerNames(result, speakerNames) {
  if (!speakerNames || Object.keys(speakerNames).length === 0) {
    return result;
  }

  if (result.type === 'utterances' && Array.isArray(result.content)) {
    result.content = result.content.map(utterance => ({
      ...utterance,
      speaker: speakerNames[utterance.speaker] || `Speaker ${utterance.speaker}`
    }));
  }

  return result;
}

// Helper function to calculate cost
function calculateCost(durationSeconds, model) {
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

// Netlify Function handler
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get transcription options
    const modelName = formData.get('model') || 'nova-3';
    const options = {
      model: modelName,
      smart_format: formData.get('smart_format') !== 'false',
      language: formData.get('language') || 'en',
      utterances: formData.get('utterances') !== 'false',
      punctuate: true,
      paragraphs: true,
      diarize: formData.get('enable_speakers') === 'true',
      detect_language: formData.get('language') === 'auto'
    };

    // Parse speaker names
    let speakerNames = {};
    const speakerNamesStr = formData.get('speaker_names');
    if (speakerNamesStr) {
      try {
        const names = JSON.parse(speakerNamesStr);
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

    // Read audio file as buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Transcribe using Deepgram
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      options
    );

    if (error) {
      console.error('Deepgram API error:', error);
      throw new Error(`Deepgram API error: ${JSON.stringify(error)}`);
    }

    // Extract metadata
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
        transcriptResult = applySpeakerNames(transcriptResult, speakerNames);
      } else if (alternative.transcript) {
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

    // Calculate cost
    const estimatedCost = calculateCost(duration, modelName);

    return new Response(JSON.stringify({
      success: true,
      result: transcriptResult,
      metadata: {
        model: modelName,
        diarization_enabled: options.diarize,
        language: channels[0]?.detected_language || options.language,
        duration: duration,
        duration_formatted: `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`,
        estimated_cost: `$${estimatedCost}`,
        request_id: metadata.request_id
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(JSON.stringify({
      error: 'Transcription failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/transcribe"
};
