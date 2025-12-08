import { createClient } from '@deepgram/sdk';

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

// Cloudflare Pages Function handler
export async function onRequestPost(context) {
  const { request, env } = context;

  // IP Whitelist - only allow specific IPs
  const ALLOWED_IPS = ['165.85.178.96', '178.224.222.124'];
  const clientIP = request.headers.get('CF-Connecting-IP');

  if (!ALLOWED_IPS.includes(clientIP)) {
    return new Response('Access Denied: Your IP address is not authorized.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // Initialize Deepgram client
    const USE_EU_ENDPOINT = env.USE_EU_ENDPOINT !== 'false';
    const API_ENDPOINT = USE_EU_ENDPOINT ? 'https://api.eu.deepgram.com' : 'https://api.deepgram.com';

    if (!env.DEEPGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const deepgram = createClient(env.DEEPGRAM_API_KEY, {
      global: {
        fetch: {
          options: {
            url: API_ENDPOINT
          }
        }
      }
    });

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check file size (Cloudflare Workers has 100MB limit on paid plan)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        error: 'File too large',
        message: `File size (${(audioFile.size / 1024 / 1024).toFixed(2)}MB) exceeds the 100MB limit. Please use a smaller file or compress your audio.`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get transcription options
    const modelName = formData.get('model') || 'nova-3';
    const languageParam = formData.get('language') || 'en';
    const options = {
      model: modelName,
      smart_format: formData.get('smart_format') !== 'false',
      utterances: formData.get('utterances') !== 'false',
      punctuate: true,
      paragraphs: true,
      diarize: formData.get('enable_speakers') === 'true'
    };

    // Only set language OR detect_language, not both
    if (languageParam === 'auto') {
      options.detect_language = true;
    } else {
      options.language = languageParam;
    }

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

    // For files larger than 10MB, use R2 + URL-based transcription
    const USE_URL_METHOD = audioFile.size > 10 * 1024 * 1024;
    let result, error;

    if (USE_URL_METHOD && env.AUDIO_BUCKET) {
      // Upload to R2 and get public URL
      const fileKey = `${Date.now()}-${audioFile.name}`;
      const arrayBuffer = await audioFile.arrayBuffer();

      await env.AUDIO_BUCKET.put(fileKey, arrayBuffer, {
        httpMetadata: {
          contentType: audioFile.type
        }
      });

      // Create a publicly accessible URL (you'll need to configure R2 public access)
      const r2Url = `https://pub-${env.AUDIO_BUCKET_ID}.r2.dev/${fileKey}`;

      // Transcribe using URL
      ({ result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: r2Url },
        options
      ));

      // Clean up R2 object
      await env.AUDIO_BUCKET.delete(fileKey);
    } else {
      // For smaller files, use direct buffer upload
      const arrayBuffer = await audioFile.arrayBuffer();
      // Convert ArrayBuffer to Uint8Array (Cloudflare Workers compatible)
      const audioBuffer = new Uint8Array(arrayBuffer);

      ({ result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        options
      ));
    }

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
}
