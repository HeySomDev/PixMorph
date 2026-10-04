# PixMorph

A premium portrait enhancement PWA powered by AI. Transform your photos into professional DSLR-style portraits with intelligent retouching and enhancement.

## Features

- 📱 Progressive Web App with full-screen install experience
- 🖼️ Drag-and-drop image upload workflow
- ☁️ Cloudflare Workers-based processing pipeline
- 🤖 AI portrait enhancement and cleanup
- 🚫 No browser address bar in the app shell
- 🔒 Fixed enhancement prompt for consistent output

## Default Enhancement Prompt

"Keep the person recognizable and preserve the original facial structure. Turn this into a premium DSLR-style portrait, natural skin retouching, remove acne and minor skin imperfections, cinematic depth of field, sharp eyes, detailed hair and beard, vibrant but natural colors, warm golden-hour lighting, professional photography look, blurred background."

## Workflow

1. User drags an image into the app.
2. The image is sent to the Worker.
3. The worker forwards the request to an AI image model.
4. The model processes the photo using the default prompt.
5. The enhanced image is returned to the client.
6. The result is displayed in the app with a clean, focused portrait experience.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- PWA support: manifest + install flow
- Edge runtime: Cloudflare Workers
- AI pipeline: external model/API integration

## Project Structure

```bash
PixMorph/
├── src/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── worker/
│   └── index.js
├── public/
│   └── manifest.webmanifest
├── package.json
├── wrangler.toml
├── .gitignore
└── README.md
```

## Getting Started

```bash
git clone https://github.com/HeySomDev/PixMorph.git
cd PixMorph
npm install
npm run dev
```

## Notes

This project is intended as a polished AI portrait enhancement interface designed for a fullscreen, app-like experience.
