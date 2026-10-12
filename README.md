# VoiceMack

VoiceMack is an AI-powered voice studio for turning text into speech and creating audio-first content. It combines text-to-speech tools with background music generation, audio-to-video creation, and an AI assistant.

## Features

- Generate speech from text with selectable voices and delivery styles.
- Add expressive speech cues such as laughter, breaths, and backchannel responses.
- Generate or upload background music, mix it with speech, and preview the result.
- Turn uploaded or generated audio into a video, choose an aspect ratio, and download the MP4.
- Keep generated speech and video in local history.
- Use one AI Copilot chat for multilingual conversation, image analysis and generation, voice input, and spoken replies.
- Generate narrated videos from a text prompt or create a video from an attached audio clip directly in chat.
- Explore the Lahore voice showcase.
- Use browser speech as a fallback when AI speech generation is unavailable.

## Tech Stack

- React 19, TypeScript, and Vite
- Express server for local development and API routing
- Netlify Functions for deployed API endpoints
- Google Gemini APIs for speech, music, and video workflows
- OpenAI APIs for Copilot chat, image analysis and generation, transcription, narration, and speech
- Gemini API for audio-driven video generation
- IndexedDB for local audio and video history

## Requirements

- Node.js and npm
- A Google Gemini API key for speech, music, and video features
- An OpenAI API key for the AI Copilot

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and add your API keys:

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

   The Copilot key must stay on the server. If a key has been shared publicly or in a chat, revoke it and create a replacement before adding it to `.env`.

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed in the terminal, usually `http://localhost:3000`.

Never commit your `.env` file or expose your API key in client-side code.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Express and Vite development server. |
| `npm run lint` | Run the TypeScript check. |
| `npm run build` | Build the production frontend into `dist/`. |
| `npm run preview` | Preview the production frontend locally. |

## Deploying to Netlify

Connect the repository to Netlify. The included `netlify.toml` configures the build command, publish directory, functions directory, and API redirects. Add `GEMINI_API_KEY` and `OPENAI_API_KEY` in the site's environment variables for all AI features.

## Privacy

Generated audio and video history are stored in the browser. Text, prompts, and audio submitted to AI features are sent to the service providers needed to fulfill those requests. See the in-app Privacy Policy for details.

## Copyright

Copyright (c) 2026 Kausar Mia. All rights reserved. See [COPYRIGHT.md](COPYRIGHT.md).