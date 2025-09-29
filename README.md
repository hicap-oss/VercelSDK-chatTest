# Vercel AI SDK v5 Test App

Basic test app using Vercel AI SDK (v5) with the OpenAI-compatible provider to try `gemini-2.5-pro` and `claude-sonnet-4` against `https://api.hicap.ai/v2/openai`.

## Setup

1. Copy env template and add your key:

```bash
cp .env.local.example .env.local
echo "PROVIDER_API_KEY=YOUR_KEY_HERE" >> .env.local
```

2. Install dependencies and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser, choose a model, and send a message.

## Notes

- API route is at `app/api/chat/route.ts` and streams using `toUIMessageStreamResponse`, mirroring the referenced `chat-api.txt` behavior.
- Provider is initialized via `createOpenAICompatible` with `baseURL` set to `https://api.hicap.ai/v2/openai`.
- You can pass a custom `system` prompt in the request body if needed.


