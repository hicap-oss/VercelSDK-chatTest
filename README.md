# Vercel AI SDK v5 Reference Implementation

A production-ready chat application demonstrating **best practices** for Vercel AI SDK v5 (`@ai-sdk/react` v2.x and `ai` v5.x) with Next.js 14+.

## 🎯 Purpose

This app serves as a **reference implementation** showing the correct way to use Vercel AI SDK v5, which has a different API than older tutorials demonstrate. It showcases:

- ✅ Proper `useChat` hook usage from `@ai-sdk/react`
- ✅ Manual input state management (SDK v5 pattern)
- ✅ Status-based loading states
- ✅ Type-safe API routes with streaming
- ✅ Dynamic model switching
- ✅ Custom endpoint configuration
- ✅ Raw stream debugging capabilities

## 📚 Documentation

This project includes comprehensive documentation to help you understand and use Vercel AI SDK v5:

### 📖 [Complete Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md)
The definitive guide covering:
- SDK v5 architecture and concepts
- Detailed code walkthroughs with explanations
- Common pitfalls and how to avoid them
- Advanced features and patterns
- Security and performance best practices
- Testing recommendations and deployment checklist

### ⚡ [Quick Reference Cheat Sheet](./SDK_V5_QUICK_REFERENCE.md)
A concise one-page reference with:
- Essential API patterns
- Common code snippets
- Status values and message structures
- Security and performance tips
- Troubleshooting quick fixes

### 🔄 [Migration Guide](./MIGRATION_GUIDE.md)
Step-by-step guide for upgrading from SDK v3/v4:
- Package and import changes
- Component migration examples
- API route updates
- Comparison tables
- Common migration issues and solutions

**👉 Start with the [Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md) for a deep dive, or the [Quick Reference](./SDK_V5_QUICK_REFERENCE.md) for fast lookups.**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- API key for your AI provider

### Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

Add your API key:

```env
PROVIDER_API_KEY=your_api_key_here
```

3. **Run the development server:**

```bash
npm run dev
```

4. **Open the app:**

Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript
- **UI:** Tailwind CSS, shadcn/ui components
- **AI SDK:** @ai-sdk/react v2.x, ai v5.x
- **Runtime:** Edge Runtime for API routes

### File Structure

```
SDK Test/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Streaming API endpoint
│   ├── settings/
│   │   └── page.tsx              # Settings configuration
│   ├── page.tsx                  # Main chat interface (client)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   └── utils.ts                  # Utility functions
├── VERCEL_SDK_V5_BEST_PRACTICES.md  # 📖 Best practices guide
└── package.json
```

## ✨ Features

### Supported Models

- **Gemini 2.5 Pro** - Google's latest flagship model
- **Gemini 2.5 Flash** - Fast, efficient responses
- **Claude Sonnet 4** - Anthropic's balanced model
- **Claude Sonnet 4.5** - Enhanced capabilities

### Core Features

- 🔄 **Real-time Streaming** - Live AI responses as they're generated
- 🎨 **Modern UI** - Beautiful, responsive chat interface
- 🧠 **Thinking Display** - Shows AI reasoning process separately
- 🔍 **Raw Stream Debugging** - View raw API responses for troubleshooting
- ⚙️ **Custom Endpoints** - Configure different API providers
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Edge Runtime** - Fast response times with edge deployment
- 🎯 **Type Safety** - Full TypeScript support

## 🔑 Key Differences from Other Tutorials

### ⚠️ Important: SDK v5 Has a Different API

Many tutorials show this pattern (❌ **outdated**):

```typescript
// ❌ This is from older SDK versions
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
```

**SDK v5 actually works like this** (✅ **correct**):

```typescript
// ✅ SDK v5 from @ai-sdk/react
const { messages, sendMessage, status, error } = useChat();

// You manage input yourself
const [input, setInput] = useState('');

// You derive loading state
const isLoading = status === 'submitted' || status === 'streaming';

// You create submit handler
const handleSubmit = async (e) => {
  e.preventDefault();
  setInput('');
  await sendMessage({ text: input }, { body: { model } });
};
```

### Why the Change?

SDK v5 adopts a **modular approach**:
- **Separation of concerns** - UI state vs. chat state
- **More flexible** - Works with any form library
- **Better TypeScript** - Improved type safety
- **Composable** - Easier to customize

## 📖 Usage Examples

### Basic Message Sending

```typescript
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setInput('');
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
        <button disabled={status === 'streaming'}>
          Send
        </button>
      </form>
    </div>
  );
}
```

### With Custom Parameters

```typescript
await sendMessage(
  { text: input },
  { 
    body: { 
      model: 'gemini-2.5-pro',
      temperature: 0.7,
      maxTokens: 1000
    } 
  }
);
```

### API Route Setup

```typescript
import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export async function POST(req) {
  const { messages, model } = await req.json();
  
  const provider = createOpenAICompatible({
    baseURL: 'https://api.hicap.ai/v2/openai',
    headers: { 'api-key': process.env.PROVIDER_API_KEY },
  });

  const result = streamText({
    model: provider(model),
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PROVIDER_API_KEY` | Your AI provider API key | Yes |

### Default Settings

- **Default Model:** Gemini 2.5 Pro
- **Default Endpoint:** `https://api.hicap.ai/v2/openai/dev`
- **Throttle Rate:** 50ms (updates at most every 50ms during streaming)

### Customizing Endpoints

You can configure custom API endpoints in the Settings page (accessible via the settings icon in the header). The endpoint URL is saved to localStorage and persists across sessions.

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

1. Push to GitHub
2. Import to Vercel
3. Add `PROVIDER_API_KEY` environment variable
4. Deploy!

### Other Platforms

This is a standard Next.js 14 app and can be deployed to any platform that supports Next.js:
- Netlify
- Cloudflare Pages
- AWS Amplify
- Self-hosted with Docker

## 🐛 Troubleshooting

### Messages not appearing

✅ Check that your API route returns `toUIMessageStreamResponse()`, not `toDataStreamResponse()`

### TypeScript errors on useChat

✅ Make sure you're importing from `@ai-sdk/react`, not `ai`

### Input not working

✅ Remember to manage input state manually in SDK v5

### See the [Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md) for more troubleshooting tips.

## 📦 Dependencies

### Core
- `@ai-sdk/react` ^2.0.57 - React hooks for AI SDK
- `ai` ^5.0.57 - Core AI SDK functionality  
- `@ai-sdk/openai-compatible` - OpenAI-compatible provider
- `next` - Next.js framework
- `react` & `react-dom` - React library

### UI
- `tailwindcss` - Utility-first CSS
- `shadcn/ui` components - High-quality React components
- `lucide-react` - Icon library

## 📝 License

This is a reference implementation for educational purposes. Feel free to use it as a template for your own projects.

## 🤝 Contributing

Found an issue or have a suggestion? This is a reference implementation, but feedback is welcome!

## 🔗 Resources

### Documentation (In This Repo)
- 📖 [**Best Practices Guide**](./VERCEL_SDK_V5_BEST_PRACTICES.md) - Complete SDK v5 reference
- ⚡ [**Quick Reference**](./SDK_V5_QUICK_REFERENCE.md) - One-page cheat sheet
- 🔄 [**Migration Guide**](./MIGRATION_GUIDE.md) - Upgrade from v3/v4 to v5

### Official Resources
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/)
- [Official SDK v5 Migration Guide](https://sdk.vercel.ai/docs/ai-sdk-ui/migration-guide)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub: Vercel AI](https://github.com/vercel/ai)

### Example Code
- [Main Chat Component](./app/page.tsx) - Client-side implementation
- [Chat API Route](./app/api/chat/route.ts) - Server-side streaming

## 📧 Questions?

1. **Quick answers:** Check the [Quick Reference](./SDK_V5_QUICK_REFERENCE.md)
2. **Detailed explanations:** Read the [Best Practices Guide](./VERCEL_SDK_V5_BEST_PRACTICES.md)
3. **Migrating from old SDK:** Follow the [Migration Guide](./MIGRATION_GUIDE.md)
4. **Still stuck?** Open an issue or check [Vercel Community](https://vercel.com/community)

---

**Built with ❤️ to demonstrate Vercel AI SDK v5 best practices**
