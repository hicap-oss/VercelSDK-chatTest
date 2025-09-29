// app/page.tsx
'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, User, Bot, Brain, Loader2 } from 'lucide-react';

type SelectableModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'claude-sonnet-4' | 'claude-sonnet-4.5';

const MODEL_DISPLAY_NAMES: Record<SelectableModel, string> = {
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'claude-sonnet-4': 'Claude Sonnet 4',
  'claude-sonnet-4.5': 'Claude Sonnet 4.5',
};

export default function Page() {
  const [model, setModel] = useState<SelectableModel>('gemini-2.5-pro');
  const [text, setText] = useState<string>('');
  const [rawStream, setRawStream] = useState<string>('');
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

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

  const hasReasoningContent = messages.some((m) => 
    Array.isArray((m as any).parts) && (m as any).parts.some((p: any) => p?.type === 'reasoning')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <div className="space-y-4">
          {/* Header Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl font-bold">NerdChat</CardTitle>
                  <CardDescription className="mt-2">
                    Powered by Vercel AI SDK v5 with streaming support
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit">
                  {MODEL_DISPLAY_NAMES[model]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Select Model</label>
                  <Select value={model} onValueChange={(value) => setModel(value as SelectableModel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                      <SelectItem value="claude-sonnet-4.5">Claude Sonnet 4.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show-raw" 
                      checked={showRaw} 
                      onCheckedChange={(checked) => setShowRaw(checked === true)} 
                    />
                    <label
                      htmlFor="show-raw"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Show raw stream
                    </label>
                  </div>
                  {showRaw && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRawStream('')}
                      disabled={rawStream.length === 0}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Card */}
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="h-[60vh] overflow-y-auto space-y-4 pr-4">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Bot className="h-12 w-12 mx-auto opacity-50" />
                      <p className="text-lg">Start a conversation</p>
                      <p className="text-sm">Type a message below to begin chatting</p>
                    </div>
                  </div>
                )}
                
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}>
                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`rounded-lg px-4 py-3 ${
                        m.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {Array.isArray((m as any).parts)
                            ? (m as any).parts
                                .filter((p: any) => p?.type === 'text')
                                .map((p: any) => p.text)
                                .join('')
                            : (m as any).content ?? ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isSending && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                      <div className="rounded-lg px-4 py-3 bg-muted">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Thinking</span>
                          <span className="animate-pulse">...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {hasReasoningContent && (
                  <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Thinking Transcript
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {messages.map((m) => (
                          <div key={`r-${m.id}`}>
                            {Array.isArray((m as any).parts)
                              ? (m as any).parts
                                  .filter((p: any) => p?.type === 'reasoning')
                                  .map((p: any, idx: number) => (
                                    <div key={idx} className="text-sm whitespace-pre-wrap">{p.text}</div>
                                  ))
                              : null}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {error && (
                  <Card className="bg-destructive/10 border-destructive/50">
                    <CardContent className="pt-6">
                      <div className="text-sm text-destructive">
                        <strong>Error:</strong> {error.message}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {showRaw && (
                  <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-base">Raw Stream</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap break-all font-mono overflow-x-auto max-h-60">
                        {rawStream || '— waiting for data —'}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            <CardFooter>
              <form onSubmit={onSubmit} className="flex w-full gap-2">
                <Input
                  name="prompt"
                  value={text}
                  placeholder="Type your message..."
                  onChange={(e) => setText(e.target.value)}
                  autoComplete="off"
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isSending || text.trim().length === 0}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardFooter>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Set <code className="bg-muted px-2 py-1 rounded text-xs">PROVIDER_API_KEY</code> in your environment
          </p>
        </div>
      </div>
    </div>
  );
}