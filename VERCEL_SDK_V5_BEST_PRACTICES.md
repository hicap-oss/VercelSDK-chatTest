# Vercel AI SDK v5 Best Practices Guide

**SDK Chat** - A Reference Implementation

This document explains how SDK Chat demonstrates best practices for using Vercel AI SDK v5 (`@ai-sdk/react` v2.x and `ai` v5.x) in a production-ready Next.js application.

---

## Table of Contents

1. [Overview](#overview)
2. [Key SDK v5 Concepts](#key-sdk-v5-concepts)
3. [Architecture](#architecture)
4. [Best Practices Demonstrated](#best-practices-demonstrated)
5. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
6. [Code Walkthrough](#code-walkthrough)
7. [Advanced Features](#advanced-features)

---

## Overview

### What is SDK Chat?

SDK Chat is a modern chat interface that demonstrates proper integration with Vercel AI SDK v5. It supports:
- Multiple AI models (Gemini, Claude)
- Real-time streaming responses
- Custom API endpoints
- Raw stream debugging
- Thinking/reasoning content display

### Dependencies

```json
{
  "@ai-sdk/react": "^2.0.57",
  "@ai-sdk/openai-compatible": "latest",
  "ai": "^5.0.57",
  "next": "latest",
  "react": "latest"
}
```

---

## Key SDK v5 Concepts

### Understanding `useChat` in SDK v5

**IMPORTANT:** The `@ai-sdk/react` package has a different API than older tutorials show!

#### What `useChat` Returns

```typescript
const { messages, sendMessage, status, error } = useChat(options);
```

| Property | Type | Description |
|----------|------|-------------|
| `messages` | `UIMessage[]` | Array of chat messages |
| `sendMessage` | `Function` | Send a new message to the API |
| `status` | `string` | Current status: 'idle', 'submitted', 'streaming', 'stopped' |
| `error` | `Error \| undefined` | Error state if request fails |
| `setMessages` | `Function` | Manually update messages array |
| `regenerate` | `Function` | Regenerate the last assistant message |
| `stop` | `Function` | Stop the current stream |

#### What `useChat` Does NOT Return

❌ `input` - You manage this yourself  
❌ `setInput` - You manage this yourself  
❌ `handleInputChange` - You create this yourself  
❌ `handleSubmit` - You create this yourself  
❌ `isLoading` - You derive this from `status`

### Why the Change?

SDK v5 adopts a more **modular approach**:
- **Separation of concerns:** UI state vs. chat state
- **Flexibility:** You control input handling
- **Composability:** Easier to integrate with custom forms
- **Type safety:** Better TypeScript support

---

## Architecture

### File Structure

```
app/
├── api/
│   └── chat/
│       └── route.ts          # API route handler
├── page.tsx                  # Main chat UI (client component)
└── settings/
    └── page.tsx              # Settings page

components/
└── ui/                       # shadcn/ui components
```

### Data Flow

```
User Input → handleSubmit → sendMessage → /api/chat → AI Provider → Stream Response → UI Update
```

---

## Best Practices Demonstrated

### ✅ 1. Proper Hook Usage

**File:** `app/page.tsx`

```typescript
const { messages, sendMessage, status, error } = useChat({
  experimental_throttle: 50,        // Throttle updates for performance
  onError: (error: unknown) => {    // Centralized error handling
    console.error('An error occurred:', error);
  },
  onResponse: (response: Response) => {  // Optional: tap into raw stream
    // Custom logic for debugging/monitoring
  },
});
```

**Why This Is Correct:**
- Uses only the properties that actually exist on `useChat`
- Includes proper error handling with `onError`
- Adds throttling to prevent excessive re-renders
- Optionally taps into raw responses for debugging

---

### ✅ 2. Manual Input State Management

**File:** `app/page.tsx` (lines 30-31)

```typescript
// UI state management
const [input, setInput] = useState<string>('');
```

**Why This Is Correct:**
- SDK v5 doesn't provide built-in input management
- Gives you full control over input behavior
- Allows custom validation and formatting
- Works seamlessly with any UI library

---

### ✅ 3. Deriving Loading State from Status

**File:** `app/page.tsx` (line 81)

```typescript
// Determine loading state from status
const isLoading = status === 'submitted' || status === 'streaming';
```

**Why This Is Correct:**
- `useChat` provides `status`, not `isLoading`
- Clear derivation makes state predictable
- Works for both submit and streaming phases
- Easy to extend for other statuses

---

### ✅ 4. Proper Form Submission Handler

**File:** `app/page.tsx` (lines 84-105)

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const trimmed = input.trim();
  if (!trimmed || isLoading) return;

  // Clear input immediately for better UX
  setInput('');
  setRawStream('');
  if (!showRaw) setShowRaw(true);

  // Send message with custom body parameters
  await sendMessage(
    { text: trimmed },
    { 
      body: { 
        model, 
        stream: true, 
        endpointUrl 
      } 
    }
  );
};
```

**Why This Is Correct:**
- ✅ Prevents default form behavior
- ✅ Validates input before sending
- ✅ Prevents duplicate submissions during loading
- ✅ Clears input immediately (better UX)
- ✅ Passes custom parameters via `body` option
- ✅ Uses async/await for proper error handling

---

### ✅ 5. API Route Implementation

**File:** `app/api/chat/route.ts`

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export async function POST(req: NextRequest) {
  const { messages, model, system, providerOptions, endpointUrl } = await req.json();

  // Create provider with dynamic configuration
  const provider = createOpenAICompatible({
    name: 'hicap',
    baseURL: endpointUrl || DEFAULT_BASE_URL,
    headers: { 'api-key': process.env.PROVIDER_API_KEY || '' },
    includeUsage: true,
  });

  // Convert UI messages to model messages
  const modelMessages = convertToModelMessages(
    processedMessages.map(({ id, ...rest }: any) => rest)
  );

  // Stream the response
  const result = streamText({
    model: provider(model),
    messages: modelMessages,
    system,
    providerOptions,
  });

  // Return UI-compatible stream
  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
```

**Why This Is Correct:**
- ✅ Uses Edge Runtime for better performance
- ✅ Converts UI messages to model messages with `convertToModelMessages`
- ✅ Returns UI-compatible stream with `toUIMessageStreamResponse`
- ✅ Supports dynamic provider configuration
- ✅ Proper error handling and timeouts
- ✅ Environment variable for API keys

---

### ✅ 6. Message Rendering

**File:** `app/page.tsx` (lines 214-241)

```typescript
{messages.map((m) => (
  <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`flex gap-3 max-w-[85%]`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full">
        {m.role === 'user' ? <User /> : <Bot />}
      </div>
      <div className="rounded-2xl px-4 py-2.5">
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
```

**Why This Is Correct:**
- ✅ Uses unique `key` prop (m.id)
- ✅ Handles both parts-based and content-based messages
- ✅ Filters for 'text' type parts (ignores reasoning)
- ✅ Proper text wrapping and formatting
- ✅ Responsive layout

---

### ✅ 7. Loading State UI

**File:** `app/page.tsx` (lines 203-217)

```typescript
{isLoading && (
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
```

**Why This Is Correct:**
- ✅ Shows loading state immediately
- ✅ Consistent with message layout
- ✅ Visual feedback during streaming
- ✅ Uses `isLoading` derived from `status`

---

### ✅ 8. Error Handling

**File:** `app/page.tsx` (lines 283-291)

```typescript
{error && (
  <Card className="bg-destructive/10 border-destructive/50">
    <CardContent className="pt-4 pb-3">
      <div className="text-sm text-destructive">
        <strong>Error:</strong> {error.message}
      </div>
    </CardContent>
  </Card>
)}
```

**Why This Is Correct:**
- ✅ Uses error from `useChat`
- ✅ Displays user-friendly error messages
- ✅ Visually distinct error styling
- ✅ Non-intrusive inline display

---

### ✅ 9. Auto-scroll Behavior

**File:** `app/page.tsx` (lines 76-79)

```typescript
// Auto-scroll to bottom when messages change
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, status]);
```

**Why This Is Correct:**
- ✅ Scrolls when new messages arrive
- ✅ Scrolls during streaming (status changes)
- ✅ Smooth behavior for better UX
- ✅ Uses ref to avoid layout calculations

---

### ✅ 10. Custom Parameters with sendMessage

**File:** `app/page.tsx` (lines 95-104)

```typescript
await sendMessage(
  { text: trimmed },
  { 
    body: { 
      model,          // Dynamic model selection
      stream: true,   // Enable streaming
      endpointUrl     // Custom endpoint
    } 
  }
);
```

**Why This Is Correct:**
- ✅ First argument: message data
- ✅ Second argument: request options
- ✅ `body` is merged into the fetch request
- ✅ Supports dynamic configuration
- ✅ Maintains type safety

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Wrong Import Package

```typescript
// ❌ WRONG - Old SDK or wrong package
import { useChat } from 'ai';

// ✅ CORRECT - SDK v5
import { useChat } from '@ai-sdk/react';
```

---

### ❌ Pitfall 2: Expecting Built-in Input Management

```typescript
// ❌ WRONG - These don't exist in SDK v5
const { input, setInput, handleInputChange } = useChat();

// ✅ CORRECT - Manage input yourself
const [input, setInput] = useState('');
const { messages, sendMessage, status } = useChat();
```

---

### ❌ Pitfall 3: Using Non-existent `isLoading`

```typescript
// ❌ WRONG - isLoading doesn't exist
const { isLoading } = useChat();

// ✅ CORRECT - Derive from status
const { status } = useChat();
const isLoading = status === 'submitted' || status === 'streaming';
```

---

### ❌ Pitfall 4: Wrong API Route Response Format

```typescript
// ❌ WRONG - Returns incompatible format
return result.toDataStreamResponse();

// ✅ CORRECT - Use toUIMessageStreamResponse for useChat
return result.toUIMessageStreamResponse();
```

---

### ❌ Pitfall 5: Not Converting Messages

```typescript
// ❌ WRONG - Passing UI messages directly
const result = streamText({
  model: selectedModel,
  messages: messages,  // UI messages have extra properties
});

// ✅ CORRECT - Convert to model messages
const modelMessages = convertToModelMessages(
  messages.map(({ id, ...rest }) => rest)
);
const result = streamText({
  model: selectedModel,
  messages: modelMessages,
});
```

---

### ❌ Pitfall 6: Incorrect sendMessage Usage

```typescript
// ❌ WRONG - Missing message structure
await sendMessage(trimmed);

// ❌ WRONG - Wrong parameter format
await sendMessage(trimmed, { model: 'gpt-4' });

// ✅ CORRECT - Proper message object and options
await sendMessage(
  { text: trimmed },
  { body: { model: 'gpt-4' } }
);
```

---

## Code Walkthrough

### Client Component (`app/page.tsx`)

#### Step 1: Setup State
```typescript
// UI state - you manage this
const [input, setInput] = useState<string>('');
const [model, setModel] = useState<SelectableModel>('gemini-2.5-pro');

// Chat state - SDK manages this
const { messages, sendMessage, status, error } = useChat({
  experimental_throttle: 50,
  onError: (error) => console.error(error),
});
```

#### Step 2: Create Submit Handler
```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  setInput('');  // Clear immediately
  
  await sendMessage(
    { text: input.trim() },
    { body: { model, stream: true } }
  );
};
```

#### Step 3: Render Form
```typescript
<form onSubmit={handleSubmit}>
  <Input
    value={input}
    onChange={(e) => setInput(e.target.value)}
    disabled={isLoading}
  />
  <Button type="submit" disabled={isLoading}>
    Send
  </Button>
</form>
```

#### Step 4: Render Messages
```typescript
{messages.map((m) => (
  <div key={m.id}>
    {m.role}: {m.content}
  </div>
))}
```

---

### API Route (`app/api/chat/route.ts`)

#### Step 1: Extract Request Data
```typescript
export async function POST(req: NextRequest) {
  const { messages, model, endpointUrl } = await req.json();
```

#### Step 2: Create Provider
```typescript
  const provider = createOpenAICompatible({
    name: 'custom',
    baseURL: endpointUrl,
    headers: { 'api-key': process.env.API_KEY },
  });
```

#### Step 3: Convert & Stream
```typescript
  const modelMessages = convertToModelMessages(messages);
  
  const result = streamText({
    model: provider(model),
    messages: modelMessages,
  });
```

#### Step 4: Return UI Stream
```typescript
  return result.toUIMessageStreamResponse({
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

---

## Advanced Features

### 1. Reasoning/Thinking Content

SDK Chat demonstrates handling special content types:

```typescript
const hasReasoningContent = messages.some((m) => 
  Array.isArray((m as any).parts) && 
  (m as any).parts.some((p: any) => p?.type === 'reasoning')
);

// Display reasoning separately
{messages.map((m) => (
  Array.isArray((m as any).parts)
    ? (m as any).parts
        .filter((p: any) => p?.type === 'reasoning')
        .map((p: any) => <div>{p.text}</div>)
    : null
))}
```

**Use Case:** Display AI thinking process separately from final answer.

---

### 2. Raw Stream Debugging

```typescript
onResponse: (response: Response) => {
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
  })();
}
```

**Use Case:** Debug streaming issues, monitor performance, validate responses.

---

### 3. Dynamic Model Switching

```typescript
const [model, setModel] = useState<SelectableModel>('gemini-2.5-pro');

// Model passed via body to API
await sendMessage(
  { text: input },
  { body: { model } }  // Changes per request
);
```

**Use Case:** Let users switch between models without page refresh.

---

### 4. Custom Endpoint Configuration

```typescript
const [endpointUrl, setEndpointUrl] = useState<string>(DEFAULT_ENDPOINT);

// Load from localStorage
useEffect(() => {
  const saved = localStorage.getItem('api_endpoint_url');
  if (saved) setEndpointUrl(saved);
}, []);

// Use in sendMessage
await sendMessage(
  { text: input },
  { body: { endpointUrl } }
);
```

**Use Case:** Support multiple API providers, A/B testing, local development.

---

### 5. Throttled Updates

```typescript
const { messages, sendMessage, status, error } = useChat({
  experimental_throttle: 50,  // Update UI max every 50ms
});
```

**Use Case:** Reduce re-renders during high-speed streaming.

---

## Performance Best Practices

### 1. **Throttle Updates**
```typescript
experimental_throttle: 50  // Balance UX and performance
```

### 2. **Edge Runtime**
```typescript
export const runtime = 'edge';  // In API route
```

### 3. **Memoize Expensive Calculations**
```typescript
const hasReasoningContent = useMemo(
  () => messages.some(m => /* check */),
  [messages]
);
```

### 4. **Virtualize Long Message Lists**
For 100+ messages, use `react-window` or `react-virtualized`.

---

## Security Best Practices

### 1. **Environment Variables for Secrets**
```typescript
headers: { 'api-key': process.env.PROVIDER_API_KEY }
```

### 2. **Input Validation**
```typescript
const trimmed = input.trim();
if (trimmed.length === 0) return;  // Validate before sending
```

### 3. **Server-Side API Route**
Never expose API keys in client code. All provider calls happen server-side.

### 4. **Error Message Sanitization**
```typescript
onError: (error) => {
  console.error(error);  // Log full error server-side
  // Show user-friendly message client-side
}
```

---

## Testing Recommendations

### Unit Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

test('sends message on form submit', async () => {
  const { getByPlaceholderText, getByRole } = render(<ChatPage />);
  
  const input = getByPlaceholderText('Type your message...');
  const button = getByRole('button', { name: /send/i });
  
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(button);
  
  expect(input).toHaveValue('');  // Input cleared
});
```

### Integration Tests
- Test full message flow from input to display
- Verify streaming updates
- Check error handling

### E2E Tests (Playwright/Cypress)
- Test real API interactions
- Verify multi-turn conversations
- Test model switching

---

## Deployment Checklist

- [ ] Environment variables configured (`.env.local`, Vercel dashboard)
- [ ] API keys secured (never in client code)
- [ ] Edge runtime enabled for API routes
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations
- [ ] Responsive design tested
- [ ] TypeScript strict mode enabled
- [ ] Linting configured and passing
- [ ] Performance monitoring (Vercel Analytics)

---

## Resources

### Official Documentation
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/)
- [AI SDK UI: Chatbot](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [AI SDK Core: Stream Text](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text)

### Related Packages
- `@ai-sdk/react` - React hooks for AI SDK
- `ai` - Core SDK functionality
- `@ai-sdk/openai-compatible` - OpenAI-compatible provider
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/anthropic` - Anthropic provider
- `@ai-sdk/google` - Google provider

---

## Conclusion

SDK Chat demonstrates **production-ready patterns** for Vercel AI SDK v5:

1. ✅ Correct hook usage (`useChat` from `@ai-sdk/react`)
2. ✅ Manual input state management
3. ✅ Proper message sending with `sendMessage`
4. ✅ Status-based loading states
5. ✅ Type-safe API routes
6. ✅ Message conversion with `convertToModelMessages`
7. ✅ UI-compatible streaming with `toUIMessageStreamResponse`
8. ✅ Error handling and user feedback
9. ✅ Performance optimization (throttling, edge runtime)
10. ✅ Security best practices (env vars, server-side calls)

**Key Takeaway:** SDK v5 prioritizes modularity and flexibility over convenience helpers. You have more control, but also more responsibility for state management.

---

**Questions or Issues?**
- Review the code in `app/page.tsx` and `app/api/chat/route.ts`
- Check [Vercel AI SDK GitHub Issues](https://github.com/vercel/ai/issues)
- Join [Vercel Community](https://vercel.com/community)

**Last Updated:** September 30, 2025  
**SDK Version:** @ai-sdk/react v2.0.57, ai v5.0.57
