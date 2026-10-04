/**
 * PixMorph - Cloudflare Workers AI
 * Production-ready portrait enhancement
 * Requires: AI_MODEL_API_KEY environment variable in wrangler.toml
 */

const FIXED_PROMPT = "Keep the person recognizable and preserve the original facial structure. Turn this into a premium DSLR-style portrait, natural skin retouching, remove acne and minor skin imperfections, cinematic depth of field, sharp eyes, detailed hair and beard, vibrant but natural colors, warm golden-hour lighting, professional photography look, blurred background.";

const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    TIMEOUT: 120000,
    AI_ENDPOINT: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3-medium',
};

/**
 * Main Worker Export
 */
export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            const url = new URL(request.url);
            const path = url.pathname;

            if (path === '/api/enhance' && request.method === 'POST') {
                return await handleEnhance(request, env, corsHeaders, ctx);
            }

            if (path === '/api/health' && request.method === 'GET') {
                return new Response(
                    JSON.stringify({
                        status: 'ok',
                        version: '1.0.0',
                        timestamp: new Date().toISOString(),
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    }
                );
            }

            return await serveStatic(request, env, corsHeaders);
        } catch (error) {
            console.error('Worker error:', error);
            return errorResponse(error, corsHeaders);
        }
    },
};

/**
 * Handle Image Enhancement
 */
async function handleEnhance(request, env, corsHeaders, ctx) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return new Response(
                JSON.stringify({ success: false, error: 'No image provided' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        if (imageFile.size > CONFIG.MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `File too large. Max: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // Convert image to base64
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64Image = arrayBufferToBase64(arrayBuffer);

        // Call AI Model
        const enhancedImage = await callAIModel(base64Image, env);

        return new Response(
            JSON.stringify({
                success: true,
                enhanced_image: enhancedImage,
                processed_at: new Date().toISOString(),
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                },
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
 * Call AI Model API with API Key
 */
async function callAIModel(base64Image, env) {
    const apiKey = env.AI_MODEL_API_KEY;

    if (!apiKey) {
        throw new Error('AI_MODEL_API_KEY not configured in environment variables');
    }

    try {
        const response = await fetch(CONFIG.AI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: base64Image,
                parameters: {
                    prompt: FIXED_PROMPT,
                    negative_prompt: 'blurry, distorted, low quality, ugly',
                    guidance_scale: 7.5,
                    num_inference_steps: 25,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        const result = await response.arrayBuffer();
        const base64Result = arrayBufferToBase64(result);

        return `data:image/jpeg;base64,${base64Result}`;
    } catch (error) {
        console.error('AI Model Error:', error);
        throw new Error(`AI processing failed: ${error.message}`);
    }
}

/**
 * Serve Static Files
 */
async function serveStatic(request, env, corsHeaders) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    try {
        const response = await env.ASSETS.fetch(
            new Request(new URL(pathname, request.url))
        );

        if (response.status === 404) {
            return await env.ASSETS.fetch(
                new Request(new URL('/index.html', request.url))
            );
        }

        const newResponse = new Response(response.body, response);

        if (pathname.endsWith('.html')) {
            newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (
            pathname.endsWith('.js') ||
            pathname.endsWith('.css') ||
            pathname.endsWith('.svg')
        ) {
            newResponse.headers.set('Cache-Control', 'public, max-age=86400');
        }

        Object.entries(corsHeaders).forEach(([key, value]) => {
            newResponse.headers.set(key, value);
        });

        return newResponse;
    } catch (error) {
        console.error('Static file error:', error);
        return new Response('Not found', { status: 404, headers: corsHeaders });
    }
}

/**
 * Utility Functions
 */

function arrayBufferToBase64(buffer) {
    if (buffer instanceof Uint8Array) {
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

function errorResponse(error, corsHeaders) {
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
