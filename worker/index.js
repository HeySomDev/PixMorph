/**
 * PixMorph Cloudflare Worker
 * Handles image enhancement requests and proxies to AI model API
 */

// Configuration - Update these with your actual API credentials
const CONFIG = {
    // For Hugging Face Inference API
    HF_API_URL: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3-medium',
    HF_API_KEY: 'YOUR_HUGGINGFACE_API_KEY_HERE',

    // For OpenAI API (alternative)
    // OPENAI_API_URL: 'https://api.openai.com/v1/images/generations',
    // OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY_HERE',

    // For Replicate API (alternative)
    // REPLICATE_API_URL: 'https://api.replicate.com/v1/predictions',
    // REPLICATE_API_KEY: 'YOUR_REPLICATE_API_KEY_HERE',

    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    TIMEOUT: 120000, // 2 minutes
};

/**
 * Main Worker Handler
 */
export default {
    async fetch(request, env, ctx) {
        // Enable CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Route handler
            const url = new URL(request.url);

            if (url.pathname === '/api/enhance' && request.method === 'POST') {
                return await handleEnhance(request, env, corsHeaders);
            }

            if (url.pathname === '/api/health' && request.method === 'GET') {
                return new Response(
                    JSON.stringify({ status: 'ok', version: '1.0.0' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            // Serve static files from public directory
            return await serveStatic(request, env, corsHeaders);
        } catch (error) {
            return errorResponse(error, corsHeaders);
        }
    },
};

/**
 * Handle Image Enhancement Request
 */
async function handleEnhance(request, env, corsHeaders) {
    try {
        // Parse form data
        const formData = await request.formData();
        const imageFile = formData.get('image');
        const prompt = formData.get('prompt');

        if (!imageFile) {
            return new Response(
                JSON.stringify({ success: false, error: 'No image provided' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // Validate file size
        if (imageFile.size > CONFIG.MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ success: false, error: 'File too large' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // Convert image to base64
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = arrayBufferToBase64(arrayBuffer);

        // Call AI model API
        const enhancedImage = await callAIModel(base64Image, prompt, env);

        return new Response(
            JSON.stringify({
                success: true,
                enhanced_image: enhancedImage,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Enhancement error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Enhancement failed',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
}

/**
 * Call AI Model API
 * Supports Hugging Face, OpenAI, and Replicate
 */
async function callAIModel(base64Image, prompt, env) {
    // Use Hugging Face Inference API (recommended)
    const apiKey = env.HF_API_KEY || CONFIG.HF_API_KEY;
    const modelUrl = env.HF_API_URL || CONFIG.HF_API_URL;

    if (!apiKey || apiKey === 'YOUR_HUGGINGFACE_API_KEY_HERE') {
        throw new Error('API key not configured. Please set HF_API_KEY in wrangler.toml');
    }

    try {
        const response = await fetch(modelUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: {
                    prompt: prompt,
                    image: base64Image,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        const result = await response.json();

        // Convert result to base64 data URL
        if (Array.isArray(result) && result[0]) {
            if (result[0].data) {
                return `data:image/jpeg;base64,${result[0].data}`;
            }
        }

        if (result.url) {
            return result.url;
        }

        throw new Error('Unexpected API response format');
    } catch (error) {
        console.error('AI Model API Error:', error);
        throw new Error(`Failed to enhance image: ${error.message}`);
    }
}

/**
 * Serve Static Files
 */
async function serveStatic(request, env, corsHeaders) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Default to index.html for root
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    try {
        // Try to fetch from Cloudflare KV or Assets
        let response = await env.ASSETS.fetch(request);

        if (response.status === 404) {
            // Return index.html for SPA routing
            response = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
        }

        // Add cache headers
        const newResponse = new Response(response.body, response);
        if (pathname.endsWith('.html')) {
            newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            newResponse.headers.set('Cache-Control', 'public, max-age=86400');
        }

        Object.entries(corsHeaders).forEach(([key, value]) => {
            newResponse.headers.set(key, value);
        });

        return newResponse;
    } catch (error) {
        return new Response('Not found', { status: 404, headers: corsHeaders });
    }
}

/**
 * Utility Functions
 */

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function errorResponse(error, corsHeaders) {
    console.error('Worker error:', error);
    return new Response(
        JSON.stringify({
            success: false,
            error: error.message || 'Internal server error',
        }),
        {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
    );
}
