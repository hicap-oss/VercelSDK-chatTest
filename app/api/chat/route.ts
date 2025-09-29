// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const runtime = 'edge';
export const maxDuration = 120;

const provider = createOpenAICompatible({
  name: 'hicap',
  baseURL: 'https://api.hicap.ai/v2/openai/dev',
  headers: { 'api-key': process.env.PROVIDER_API_KEY || '' },
  includeUsage: true,
});

function isValidMessage(msg: any) {
  return (
    typeof msg === 'object' &&
    ['user', 'assistant', 'system'].includes(msg.role) &&
    (typeof msg.content === 'string' || Array.isArray(msg.content) || Array.isArray(msg.parts))
  );
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages = [],
      model = 'gemini-2.5-pro',
      system = undefined,
      providerOptions = undefined,
    } = await req.json();

    const processedMessages = (Array.isArray(messages) ? messages : []).filter(isValidMessage);
    // Convert UIMessage[] -> ModelMessage[] as required by streamText
    const modelMessages = convertToModelMessages(
      processedMessages.map(({ id, ...rest }: any) => rest)
    );

    const selectedModel = provider(model);

    const isGemini = String(model).toLowerCase().includes('gemini');
    // Keep SDK-only streaming; no proxy
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort('Request timeout (60s)'), 60_000);

    const result = streamText({
      model: selectedModel,
      messages: modelMessages,
      system,
      providerOptions,
      abortSignal: abortController.signal as AbortSignal,
      onError: (e) => {
        console.error('Error', e);
      },
      onFinish: () => {
        try { clearTimeout(timeoutId); } catch {}
      },
    });

    // Mirror the reference file's streaming style for compatibility with useChat
    const response = result.toUIMessageStreamResponse({
      headers: {
        // Explicitly set the stream content type expected by the Vercel AI SDK
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

    // Clear timeout once streaming response is created
    try { clearTimeout(timeoutId); } catch {}
    return response;
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request', details: (error as Error).message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


