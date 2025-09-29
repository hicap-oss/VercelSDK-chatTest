// app/page.tsx
'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, User, Bot, Brain, Loader2, Sparkles, Settings } from 'lucide-react';
import Link from 'next/link';

type SelectableModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'claude-sonnet-4' | 'claude-sonnet-4.5';

const MODEL_DISPLAY_NAMES: Record<SelectableModel, string> = {
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'claude-sonnet-4': 'Claude Sonnet 4',
  'claude-sonnet-4.5': 'Claude Sonnet 4.5',
};

const DEFAULT_ENDPOINT = 'https://api.hicap.ai/v2/openai/dev';

export default function Page() {
  const [model, setModel] = useState<SelectableModel>('gemini-2.5-pro');
  const [text, setText] = useState<string>('');
  const [rawStream, setRawStream] = useState<string>('');
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [endpointUrl, setEndpointUrl] = useState<string>(DEFAULT_ENDPOINT);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load endpoint URL from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api_endpoint_url');
    if (saved) {
      setEndpointUrl(saved);
    }
  }, []);

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
    await sendMessage({ text: trimmed }, { body: { model, stream: true, endpointUrl } });
  }

  const hasReasoningContent = messages.some((m) => 
    Array.isArray((m as any).parts) && (m as any).parts.some((p: any) => p?.type === 'reasoning')
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Compact Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">NerdChat</h1>
              <Badge variant="secondary" className="hidden md:inline-flex">
                {MODEL_DISPLAY_NAMES[model]}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select value={model} onValueChange={(value) => setModel(value as SelectableModel)}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                  <SelectItem value="claude-sonnet-4.5">Claude Sonnet 4.5</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="show-raw" 
                  checked={showRaw} 
                  onCheckedChange={(checked) => setShowRaw(checked === true)} 
                />
                <label htmlFor="show-raw" className="text-sm cursor-pointer">
                  Raw stream
                </label>
              </div>
              
              {showRaw && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRawStream('')}
                  disabled={rawStream.length === 0}
                  className="h-9"
                >
                  Clear
                </Button>
              )}
              
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto max-w-6xl h-full px-4 py-4">
          <Card className="h-full flex flex-col shadow-lg">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-3">
                    <Bot className="h-16 w-16 mx-auto opacity-20" />
                    <p className="text-lg font-medium">Start a conversation</p>
                    <p className="text-sm">Choose a model and type a message below</p>
                  </div>
                </div>
              )}
              
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}>
                      {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 ${
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
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="rounded-2xl px-4 py-2.5 bg-muted">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Thinking</span>
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasReasoningContent && (
                <Card className="bg-primary/10 border-primary/30">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-primary">
                      <Brain className="h-4 w-4" />
                      Thinking Transcript
                    </div>
                    <div className="space-y-2 text-sm">
                      {messages.map((m) => (
                        <div key={`r-${m.id}`}>
                          {Array.isArray((m as any).parts)
                            ? (m as any).parts
                                .filter((p: any) => p?.type === 'reasoning')
                                .map((p: any, idx: number) => (
                                  <div key={idx} className="whitespace-pre-wrap">{p.text}</div>
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
                  <CardContent className="pt-4 pb-3">
                    <div className="text-sm text-destructive">
                      <strong>Error:</strong> {error.message}
                    </div>
                  </CardContent>
                </Card>
              )}

              {showRaw && rawStream && (
                <Card className="bg-muted/50 dark:bg-muted border-muted-foreground/20">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs font-medium mb-2">Raw Stream</div>
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono overflow-x-auto max-h-40">
                      {rawStream}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <div ref={messagesEndRef} />
            </CardContent>
            
            {/* Input Area */}
            <div className="border-t p-4">
              <form onSubmit={onSubmit} className="flex gap-2">
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
                  className="shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Powered by Vercel AI SDK v5
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}