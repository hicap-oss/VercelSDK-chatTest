# Vercel AI SDK v5 - Quick Reference

A concise cheat sheet for developers using `@ai-sdk/react` v2.x and `ai` v5.x.

---

## ⚡ Quick Start

### Installation

```bash
npm install @ai-sdk/react ai
npm install @ai-sdk/openai-compatible  # or your provider
```

### Basic Setup

**Client Component:**

```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat();
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setInput('');
    await sendMessage({ text: input });
  };

  return (
    <>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} />
        <button disabled={isLoading}>Send</button>
      </form>
      {error && <div>Error: {error.message}</div>}
    </>
  );
}
```

**API Route (`app/api/chat/route.ts`):**

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export async function POST(req) {
  const { messages } = await req.json();

  const provider = createOpenAICompatible({
    baseURL: 'https://api.example.com',
    headers: { 'api-key': process.env.API_KEY },
  });

  const result = streamText({
    model: provider('model-name'),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

---

## 🎯 useChat Hook API

### Import

```typescript
import { useChat } from '@ai-sdk/react';  // ✅ Correct for SDK v5
// NOT from 'ai' ❌
```

### Returns

```typescript
const {
  messages,       // UIMessage[] - message history
  sendMessage,    // (msg, opts?) => Promise - send a message
  status,         // 'idle' | 'submitted' | 'streaming' | 'stopped'
  error,          // Error | undefined
  setMessages,    // (msgs | fn) => void - update messages
  regenerate,     // () => void - regenerate last response
  stop,           // () => void - stop streaming
} = useChat(options);
```

### Options

```typescript
useChat({
  experimental_throttle: 50,        // Throttle updates (ms)
  onError: (error) => void,         // Error handler
  onResponse: (response) => void,   // Response interceptor (unofficial)
})
```

### ⚠️ Does NOT Return (unlike older versions)

```typescript
// ❌ These don't exist in SDK v5
input, setInput, handleInputChange, handleSubmit, isLoading
```

---

## 📤 Sending Messages

### Basic

```typescript
await sendMessage({ text: 'Hello' });
```

### With Options

```typescript
await sendMessage(
  { text: 'Hello' },
  { 
    body: { 
      model: 'gpt-4',
      temperature: 0.7,
      customParam: 'value'
    } 
  }
);
```

### Arguments

1. **Message data**: `{ text: string }` or custom structure
2. **Options** (optional): `{ body?: object, headers?: object }`

---

## 🔄 Status Values

```typescript
const isLoading = status === 'submitted' || status === 'streaming';
const isIdle = status === 'idle';
const isStopped = status === 'stopped';
```

| Status | Meaning |
|--------|---------|
| `'idle'` | No active request |
| `'submitted'` | Request sent, waiting for response |
| `'streaming'` | Receiving streamed response |
| `'stopped'` | Stream was stopped |

---

## 💬 Message Structure

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;          // Text content
  parts?: Array<{            // Structured parts (SDK v5)
    type: 'text' | 'reasoning' | 'tool-call' | 'tool-result';
    text?: string;
    // ... other fields
  }>;
}
```

### Rendering Messages

```typescript
{messages.map(m => (
  <div key={m.id}>
    {m.role}: {
      Array.isArray(m.parts)
        ? m.parts.filter(p => p.type === 'text').map(p => p.text).join('')
        : m.content
    }
  </div>
))}
```

---

## 🔧 API Route Patterns

### Edge Runtime (Recommended)

```typescript
export const runtime = 'edge';
export const maxDuration = 30;  // seconds
```

### Message Conversion

```typescript
import { convertToModelMessages } from 'ai';

// Remove UI-only fields (id, etc.)
const modelMessages = convertToModelMessages(
  uiMessages.map(({ id, ...rest }) => rest)
);
```

### Response Format

```typescript
// ✅ For useChat
return result.toUIMessageStreamResponse();

// ❌ Wrong for useChat
return result.toDataStreamResponse();  // Use with useCompletion
```

---

## 🎨 Common Patterns

### Input Management

```typescript
const [input, setInput] = useState('');

<input 
  value={input}
  onChange={e => setInput(e.target.value)}
/>
```

### Form Handling

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const trimmed = input.trim();
  if (!trimmed || isLoading) return;
  
  setInput('');  // Clear immediately
  await sendMessage({ text: trimmed });
};
```

### Error Display

```typescript
{error && (
  <div className="error">
    Error: {error.message}
  </div>
)}
```

### Loading State

```typescript
{isLoading && <div>Thinking...</div>}

<button disabled={isLoading}>
  {isLoading ? 'Sending...' : 'Send'}
</button>
```

---

## 🔐 Security

### ✅ Do

```typescript
// Server-side API key
headers: { 'api-key': process.env.API_KEY }

// Input validation
if (!input.trim()) return;
if (input.length > 10000) return;  // Length limit

// Server-side calls only
// All provider interactions in API routes
```

### ❌ Don't

```typescript
// ❌ Never expose keys in client
const apiKey = 'sk-...';  // NEVER DO THIS

// ❌ Don't call providers from client
import { openai } from '@ai-sdk/openai';  // Only in API routes
```

---

## ⚡ Performance

### Throttling

```typescript
useChat({
  experimental_throttle: 50,  // Update max every 50ms
})
```

### Auto-scroll

```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, status]);

// In JSX
<div ref={messagesEndRef} />
```

### Message Limit

```typescript
// Keep only last N messages
useEffect(() => {
  if (messages.length > 100) {
    setMessages(messages.slice(-100));
  }
}, [messages]);
```

---

## 🐛 Common Mistakes

### ❌ Wrong Import

```typescript
import { useChat } from 'ai';  // ❌ Wrong package
import { useChat } from '@ai-sdk/react';  // ✅ Correct
```

### ❌ Expecting Built-in Input

```typescript
const { input, handleInputChange } = useChat();  // ❌ Don't exist
const [input, setInput] = useState('');  // ✅ Manage yourself
```

### ❌ Wrong Response Format

```typescript
return result.toDataStreamResponse();  // ❌ For useCompletion
return result.toUIMessageStreamResponse();  // ✅ For useChat
```

### ❌ Not Converting Messages

```typescript
streamText({ messages });  // ❌ UI messages have extra fields
streamText({ 
  messages: convertToModelMessages(messages)  // ✅ Convert first
});
```

### ❌ Wrong sendMessage Usage

```typescript
sendMessage('Hello');  // ❌ Wrong structure
sendMessage({ text: 'Hello' });  // ✅ Correct
```

---

## 📚 Provider Setup

### OpenAI

```typescript
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4-turbo'),
  messages,
});
```

### Anthropic

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
});
```

### OpenAI-Compatible

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const provider = createOpenAICompatible({
  name: 'custom',
  baseURL: 'https://api.example.com',
  headers: { 'api-key': process.env.API_KEY },
});

const result = streamText({
  model: provider('model-name'),
  messages,
});
```

---

## 🔗 Resources

- [Full Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/)
- [Example App](./app/page.tsx)

---

**Last Updated:** September 30, 2025  
**SDK Version:** @ai-sdk/react v2.0.57, ai v5.0.57
