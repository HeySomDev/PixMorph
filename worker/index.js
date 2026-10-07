/**
 * PixMorph - Cloudflare Workers AI
 * Uses native Cloudflare AI models - No external API needed
 */

const promptText = "A cinematic Hollywood movie still portrait of the man, shot on 35mm lens, Arri Alexa camera setup, dramatic and moody studio rim lighting, perfect skin pores and natural stubble, ultra-realistic, razor-sharp focus, rich color grading, zero blur, zero cartoon effect, 8k resolution, authentic photographic masterpiece.";

const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    TIMEOUT: 120000,
};

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
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

            return await serveStatic(request, env, corsHeaders);
        } catch (error) {
            return errorResponse(error, corsHeaders);
        }
    },
};

async function handleEnhance(request, env, corsHeaders) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return new Response(
                JSON.stringify({ success: false, error: 'No image provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (imageFile.size > CONFIG.MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ success: false, error: 'File too large' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Convert image to buffer
        const imageBuffer = await imageFile.arrayBuffer();

        // Call Cloudflare AI
        const enhancedBuffer = await enhanceWithCloudflareAI(imageBuffer, env);
        const base64Enhanced = bufferToBase64(enhancedBuffer);

        return new Response(
            JSON.stringify({
                success: true,
                enhanced_image: `data:image/jpeg;base64,${base64Enhanced}`,
                processed_at: new Date().toISOString(),
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Enhancement error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}

async function enhanceWithCloudflareAI(imageBuffer, env) {
    try {
        if (!env.AI) {
            throw new Error('Cloudflare AI not available');
        }

        // Use Cloudflare's built-in Stable Diffusion model
        const response = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
            prompt: promptText,
            image: new Uint8Array(imageBuffer),
        });

        if (!response || !response.image) {
            throw new Error('AI model returned empty response');
        }

        return response.image;
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error(`AI processing failed: ${error.message}`);
    }
}

async function serveStatic(request, env, corsHeaders) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    try {
        const response = await env.ASSETS.fetch(new Request(new URL(pathname, request.url)));

        if (response.status === 404) {
            return await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
        }

        const newResponse = new Response(response.body, response);
        if (!pathname.endsWith('.html')) {
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

function bufferToBase64(buffer) {
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
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}
