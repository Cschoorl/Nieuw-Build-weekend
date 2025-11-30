// Speech-to-text proxy endpoint
// This proxies requests to ElevenLabs to keep API key secure

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, xi-api-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ 
            error: 'ElevenLabs API key not configured',
            hint: 'Add ELEVENLABS_API_KEY to your Vercel environment variables'
        });
    }

    try {
        // For Vercel serverless, we need to handle the raw body
        // The client sends FormData which we forward to ElevenLabs
        
        const fetch = (await import('node-fetch')).default;
        const FormData = (await import('form-data')).default;
        
        // Create new FormData for ElevenLabs
        const formData = new FormData();
        
        // Get the file from the request
        // Vercel automatically parses multipart/form-data
        if (req.body && req.body.file) {
            formData.append('file', req.body.file, 'audio.wav');
            formData.append('model_id', req.body.model_id || 'scribe_v1');
        } else {
            // Forward raw body if parsing didn't work
            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    ...req.headers
                },
                body: req.body
            });
            
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                ...formData.getHeaders()
            },
            body: formData
        });

        const data = await response.json();
        return res.status(response.status).json(data);

    } catch (error) {
        console.error('Transcription error:', error);
        return res.status(500).json({
            error: 'Transcription failed',
            message: error.message
        });
    }
};
