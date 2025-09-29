// app/page.tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';

type SelectableModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'claude-sonnet-4' | 'claude-sonnet-4.5';

export default function Page() {
  const [model, setModel] = useState<SelectableModel>('gemini-2.5-pro');
  const [text, setText] = useState<string>('');
  const [rawStream, setRawStream] = useState<string>('');
  const [showRaw, setShowRaw] = useState<boolean>(false);
  
  

  const chatOptions = {
    experimental_throttle: 50,
    onError: (error: unknown) => {
      console.error('An error occurred:', error);
    },
  } as unknown as Parameters<typeof useChat>[0];

  // Some versions of the hook expose `onResponse`; if present, we tap the raw stream.
  (chatOptions as any).onResponse = (response: Response) => {
    try {
      setRawStream('');
      const cloned = response.clone();
      const body = cloned.body;
      if (!body) return;
      const reader = body.getReader();
      const decoder = new TextDecoder();
      (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setRawStream((prev) => prev + chunk);
        }
      })().catch((e) => console.error('raw stream read failed', e));
    } catch (e) {
      console.error('Failed to clone/read response stream', e);
    }
  };

  const { messages, sendMessage, status, error } = useChat(chatOptions);

  // Fallback: intercept the next fetch to /api/chat and tap the stream
  function interceptNextChatResponse(tap: (response: Response) => void) {
    if (typeof window === 'undefined' || !(window as any).fetch) return;
    const originalFetch = window.fetch;
    let done = false;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      try {
        if (!done) {
          const input = args[0] as any;
          const url = typeof input === 'string' ? input : input?.url ?? '';
          if (typeof url === 'string' && url.includes('/api/chat')) {
            done = true;
            tap(res.clone());
            window.fetch = originalFetch;
          }
        }
      } catch {
        // restore on any error
        window.fetch = originalFetch;
      }
      return res;
    };
  }

  const isSending = status === 'submitted' || status === 'streaming';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0 || isSending) return;
    // Clear immediately so the box always empties on submit
    setText('');
    setRawStream('');
    if (showRaw === false) setShowRaw(true);
    // Install one-shot interceptor in case onResponse is not supported by the hook
    interceptNextChatResponse((response: Response) => {
      try {
        const body = response.body;
        if (!body) return;
        const reader = body.getReader();
        const decoder = new TextDecoder();
        (async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            setRawStream((prev) => prev + chunk);
          }
        })().catch((e) => console.error('raw stream read failed (fallback)', e));
      } catch (e) {
        console.error('Failed to tap response stream (fallback)', e);
      }
    });
    await sendMessage({ text: trimmed }, { body: { model, stream: true } });
  }

  

  return (
    <div className="container">
      <h1>Vercel AI SDK v5 Test</h1>
      <div className="toolbar">
        <select
          className="model"
          value={model}
          onChange={(e) => setModel(e.target.value as SelectableModel)}
        >
          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          <option value="claude-sonnet-4">claude-sonnet-4</option>
          <option value="claude-sonnet-4.5">claude-sonnet-4.5</option>
        </select>
        <label style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showRaw}
            onChange={(e) => setShowRaw(e.target.checked)}
          />
          <span>Show raw stream</span>
        </label>
        {showRaw && (
          <button
            type="button"
            style={{ marginLeft: 8 }}
            onClick={() => setRawStream('')}
            disabled={rawStream.length === 0}
            title={rawStream.length === 0 ? 'No data yet' : 'Clear' }
          >
            Clear
          </button>
        )}
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
            <strong>{m.role}:</strong>{' '}
            {Array.isArray((m as any).parts)
              ? (m as any).parts
                  .filter((p: any) => p?.type === 'text')
                  .map((p: any) => p.text)
                  .join('')
              : (m as any).content ?? ''}
          </div>
        ))}
        {isSending && (
          <div className="msg msg-assistant"><em>Thinking…</em></div>
        )}
        {messages.some((m) => Array.isArray((m as any).parts) && (m as any).parts.some((p: any) => p?.type === 'reasoning')) && (
          <details className="msg msg-assistant" style={{ background: '#fffbe6' }}>
            <summary>Thinking transcript</summary>
            <div>
              {messages.map((m) => (
                <div key={`r-${m.id}`}>
                  {Array.isArray((m as any).parts)
                    ? (m as any).parts
                        .filter((p: any) => p?.type === 'reasoning')
                        .map((p: any, idx: number) => (
                          <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>{p.text}</div>
                        ))
                    : null}
                </div>
              ))}
            </div>
          </details>
        )}
        {error && (
          <div className="msg msg-assistant" style={{ color: '#b91c1c' }}>
            <strong>error:</strong> {error.message}
          </div>
        )}
        {showRaw && (
          <details className="msg msg-assistant" open>
            <summary>Raw stream</summary>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{rawStream || '— waiting for data —'}</pre>
          </details>
        )}
      </div>

      <form onSubmit={onSubmit} className="row" style={{ marginTop: 12 }}>
        <input
          name="prompt"
          value={text}
          placeholder="Type a message..."
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isSending || text.trim().length === 0}
          title={
            isSending
              ? 'Sending...'
              : (text.trim().length === 0 ? 'Enter a message to enable' : '')
          }
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>

      <div className="footer">
        Set <code>PROVIDER_API_KEY</code> in your environment. Streaming is enabled.
      </div>

      
    </div>
  );
}


