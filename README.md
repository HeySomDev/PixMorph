# PixMorph - AI Portrait Enhancement

**Premium portrait enhancement powered by Hugging Face AI**

## ⚡ Quick Setup

1. **Get API Key**: Go to [Hugging Face](https://huggingface.co/settings/tokens) and create an API token

2. **Add to wrangler.toml**:
   ```toml
   [env.production.secrets]
   AI_MODEL_API_KEY = "your-hugging-face-api-key-here"
   ```

3. **Deploy**:
   ```bash
   npm install
   wrangler login
   npm run deploy
   ```

That's it! No more configuration needed.

## Features

✨ **AI-Powered Enhancement**
- Fixed portrait enhancement prompt
- Natural skin retouching
- Professional lighting
- Cinematic depth of field

📱 **Progressive Web App**
- Install as native app
- Full-screen experience
- No address bar
- Works offline

🚀 **Production Ready**
- Cloudflare Workers deployment
- Optimized caching
- Error handling
- Mobile-first design

## Enhancement Profile

```
Keep the person recognizable and preserve the original facial structure. 
Turn this into a premium DSLR-style portrait, natural skin retouching, 
remove acne and minor skin imperfections, cinematic depth of field, 
sharp eyes, detailed hair and beard, vibrant but natural colors, 
warm golden-hour lighting, professional photography look, blurred background.
```

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Cloudflare Workers
- **AI**: Hugging Face Inference API
- **PWA**: Service Worker + Manifest
- **Deployment**: Wrangler

## Project Structure

```
PixMorph/
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── sw.js
│   └── manifest.webmanifest
├── worker/
│   └── index.js
├── wrangler.toml
├── package.json
└── README.md
```

## API Endpoints

### POST /api/enhance
Enhance an image with AI.

```bash
curl -X POST https://your-app.workers.dev/api/enhance \
  -F "image=@photo.jpg"
```

**Response**:
```json
{
  "success": true,
  "enhanced_image": "data:image/jpeg;base64,...",
  "processed_at": "2024-01-01T12:00:00Z"
}
```

### GET /api/health
Health check.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Deploy Steps

```bash
# 1. Install dependencies
npm install

# 2. Login to Cloudflare
wrangler login

# 3. Update wrangler.toml with your API key
# Add your Hugging Face API key to:
# [env.production.secrets]
# AI_MODEL_API_KEY = "hf_..."

# 4. Deploy
npm run deploy

# 5. Test
# Open https://pixmorph.your-domain.workers.dev
```

## Support

For issues:
1. Check Cloudflare Workers logs: `wrangler tail`
2. Verify API key is set: `wrangler secret list`
3. Test health endpoint: `curl https://your-app.workers.dev/api/health`

## License

MIT
