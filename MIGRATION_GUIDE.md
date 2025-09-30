# Migration Guide: AI SDK v3/v4 → v5

This guide helps you migrate from older Vercel AI SDK versions to SDK v5 (`@ai-sdk/react` v2.x and `ai` v5.x).

---

## 📦 Package Changes

### Before (SDK v3/v4)

```json
{
  "dependencies": {
    "ai": "^3.x.x"  // or 4.x.x
  }
}
```

### After (SDK v5)

```json
{
  "dependencies": {
    "@ai-sdk/react": "^2.0.57",
    "@ai-sdk/openai-compatible": "latest",
    "ai": "^5.0.57"
  }
}
```

### Update Commands

```bash
npm uninstall ai
npm install @ai-sdk/react ai@latest
```

---

## 🔄 Import Changes

### Before

```typescript
import { useChat } from 'ai/react';
// or
import { useChat } from 'ai';
```

### After

```typescript
import { useChat } from '@ai-sdk/react';
```

### Update Script

```bash
# Find and replace across project
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/from 'ai\/react'/from '@ai-sdk\/react'/g"
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s/from 'ai'/from '@ai-sdk\/react'/g"
```

---

## 🎯 useChat Hook Changes

### Before (SDK v3/v4)

```typescript
const {
  messages,
  input,              // ✅ Provided by hook
  handleInputChange,  // ✅ Provided by hook
  handleSubmit,       // ✅ Provided by hook
  isLoading,          // ✅ Provided by hook
  error,
} = useChat();
```

### After (SDK v5)

```typescript
const {
  messages,
  sendMessage,        // 🆕 New way to send messages
  status,             // 🆕 Replaces isLoading
  error,
  // ❌ No input, handleInputChange, handleSubmit, isLoading
} = useChat();

// ✅ Manage input yourself
const [input, setInput] = useState('');

// ✅ Derive loading state
const isLoading = status === 'submitted' || status === 'streaming';
```

---

## 📝 Component Migration

### Before (SDK v3/v4)

```typescript
'use client';
import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

### After (SDK v5)

```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  // 🆕 Manage input yourself
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, status, error } = useChat();
  
  // 🆕 Derive loading state
  const isLoading = status === 'submitted' || status === 'streaming';

  // 🆕 Create submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    setInput('');  // Clear input
    await sendMessage({ text: input });
  };

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
      
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

---

## 🔧 API Route Changes

### Before (SDK v3/v4)

```typescript
import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    stream: true,
    messages,
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

### After (SDK v5)

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
  });

  // 🆕 Use toUIMessageStreamResponse for useChat
  return result.toUIMessageStreamResponse();
}
```

---

## 📊 Comparison Table

| Feature | SDK v3/v4 | SDK v5 | Migration |
|---------|-----------|---------|-----------|
| **Import** | `'ai/react'` | `'@ai-sdk/react'` | Update imports |
| **Input State** | Built-in `input` | Manual `useState` | Add state |
| **Loading State** | `isLoading` | Derive from `status` | Add derivation |
| **Submit Handler** | Built-in `handleSubmit` | Manual handler | Create handler |
| **Send Message** | `handleSubmit` | `sendMessage` | Update calls |
| **Response Format** | `StreamingTextResponse` | `toUIMessageStreamResponse()` | Update return |
| **Provider Setup** | Manual config | `@ai-sdk/*` packages | Install packages |

---

## 🚀 Step-by-Step Migration

### Step 1: Update Dependencies

```bash
npm install @ai-sdk/react ai@latest @ai-sdk/openai
npm install @ai-sdk/anthropic  # if using Anthropic
npm install @ai-sdk/openai-compatible  # if using custom providers
```

### Step 2: Update Imports

**In client components:**

```typescript
// Before
import { useChat } from 'ai/react';

// After
import { useChat } from '@ai-sdk/react';
```

**In API routes:**

```typescript
// Before
import { OpenAIStream, StreamingTextResponse } from 'ai';

// After
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
```

### Step 3: Update Client Components

Add input state:

```typescript
const [input, setInput] = useState('');
```

Remove built-in properties from `useChat`:

```typescript
// Before
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

// After
const { messages, sendMessage, status, error } = useChat();
```

Add loading state derivation:

```typescript
const isLoading = status === 'submitted' || status === 'streaming';
```

Create submit handler:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;
  
  setInput('');
  await sendMessage({ text: input });
};
```

Update form:

```typescript
<form onSubmit={handleSubmit}>
  <input
    value={input}
    onChange={e => setInput(e.target.value)}
  />
  <button disabled={isLoading}>Send</button>
</form>
```

### Step 4: Update API Routes

Replace manual provider setup:

```typescript
// Before
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

const response = await openai.createChatCompletion({
  model: 'gpt-4',
  stream: true,
  messages,
});

const stream = OpenAIStream(response);
return new StreamingTextResponse(stream);
```

With SDK v5 pattern:

```typescript
// After
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4-turbo'),
  messages,
});

return result.toUIMessageStreamResponse();
```

### Step 5: Test Thoroughly

- ✅ Verify messages send and display correctly
- ✅ Check streaming works
- ✅ Test error handling
- ✅ Verify loading states
- ✅ Check form behavior (clear on submit, disable during loading)

---

## 🔍 Common Migration Issues

### Issue 1: TypeScript Errors on useChat

**Error:**
```
Property 'input' does not exist on type 'UseChatHelpers'
```

**Fix:**
```typescript
// Remove from destructuring
const { messages, sendMessage, status } = useChat();

// Manage separately
const [input, setInput] = useState('');
```

---

### Issue 2: Messages Not Appearing

**Cause:** Using wrong response format

**Fix:**
```typescript
// ❌ Wrong
return result.toDataStreamResponse();

// ✅ Correct for useChat
return result.toUIMessageStreamResponse();
```

---

### Issue 3: Form Submits But Nothing Happens

**Cause:** Not calling `sendMessage`

**Fix:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setInput('');
  await sendMessage({ text: input });  // Don't forget this!
};
```

---

### Issue 4: Loading State Not Working

**Cause:** Using non-existent `isLoading`

**Fix:**
```typescript
// ❌ Wrong
const { isLoading } = useChat();

// ✅ Correct
const { status } = useChat();
const isLoading = status === 'submitted' || status === 'streaming';
```

---

## 🎯 Migration Checklist

- [ ] Updated `package.json` with new SDK packages
- [ ] Ran `npm install` to install new dependencies
- [ ] Changed imports from `'ai/react'` to `'@ai-sdk/react'`
- [ ] Removed `input`, `handleInputChange`, `handleSubmit`, `isLoading` from `useChat`
- [ ] Added manual `input` state with `useState`
- [ ] Created custom `handleSubmit` function
- [ ] Derived `isLoading` from `status`
- [ ] Updated `sendMessage` calls with proper structure
- [ ] Updated API routes to use `streamText` and provider packages
- [ ] Changed response format to `toUIMessageStreamResponse()`
- [ ] Tested message sending
- [ ] Tested streaming
- [ ] Tested error handling
- [ ] Tested loading states
- [ ] Updated tests (if any)
- [ ] Updated documentation

---

## 💡 Benefits of Migration

### Why Migrate?

1. **Better Type Safety** - Improved TypeScript support
2. **More Flexible** - Easier to customize behavior
3. **Modular** - Separate concerns (UI vs. chat state)
4. **Future-Proof** - Active development on v5
5. **Better Performance** - Optimized streaming
6. **More Providers** - Easy multi-provider support

---

## 📚 Additional Resources

- [SDK v5 Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md)
- [Quick Reference](./SDK_V5_QUICK_REFERENCE.md)
- [Example Implementation](./app/page.tsx)
- [Official Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [Vercel AI SDK Docs](https://ai-sdk.dev/docs)

---

## 🆘 Need Help?

1. Check the [Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md)
2. Review the [working example](./app/page.tsx) in this repo
3. Check [GitHub Issues](https://github.com/vercel/ai/issues)
4. Join [Vercel Community](https://vercel.com/community)

---

**Last Updated:** September 30, 2025  
**SDK Version:** @ai-sdk/react v2.0.57, ai v5.0.57
