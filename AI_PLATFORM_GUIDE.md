# AI Platform Integration Guide

## Overview

The AI Chat application now supports multiple AI platforms with dynamic model fetching. You can add API keys for different providers, and newly released models are automatically discovered through each platform's API.

## Supported Platforms

1. **OpenAI-compatible** - OpenAI, Groq, DeepSeek, Together AI, etc.
   - Requires: API key, optional base URL
   - Models fetched via `/v1/models` endpoint

2. **Anthropic** - Claude models
   - Requires: API key
   - Models fetched via Anthropic API

3. **Google Gemini** - Google generative AI models
   - Requires: API key
   - Models fetched via Google's generative language API

## How to Use

### 1. Add an API Key

- Click **"Models & Keys"** button on the landing page or in any chat
- Enter platform name (e.g., "OpenAI", "Groq")
- Select platform type
- For OpenAI-compatible platforms, optionally add a custom base URL
- Paste your API key
- Click **"Save API key"**

### 2. Select a Model

- The model selector appears above the chat input
- All models from all connected platforms are listed
- Each model shows: `[Model Name] - [Platform Name]`
- Selected model is saved to localStorage and persists across sessions
- Each conversation remembers its model selection

### 3. Start Chatting

- Select a model before sending your first message
- Type your message and press Enter
- The selected model processes your request
- You can switch models mid-conversation

## Architecture

### Database Schema

```prisma
model AICredential {
  id            String         @id @default(cuid())
  name          String         @unique
  kind          CredentialKind
  apiKey        String
  baseUrl       String?
  conversations Conversation[]
}

model Conversation {
  id           String        @id @default(cuid())
  modelId      String?
  modelLabel   String?
  credentialId String?
  credential   AICredential?
  messages     Message[]
}
```

### API Endpoints

- `GET /api/ai/credentials` - List all saved credentials (API keys masked)
- `POST /api/ai/credentials` - Add or update a credential
- `DELETE /api/ai/credentials/[id]` - Remove a credential
- `GET /api/ai/models` - Fetch available models from all platforms
- `POST /api/chat` - Stream chat responses using selected model

### Frontend Components

- **ModelControl** - Model selector + credential manager dialog
- Integrated in:
  - Landing page hero section
  - New chat page
  - Active conversation page

## Model Discovery

Models are fetched in real-time from each platform's API:

- **OpenAI-compatible**: `GET {baseUrl}/models`
- **Anthropic**: `GET https://api.anthropic.com/v1/models`
- **Google**: `GET https://generativelanguage.googleapis.com/v1beta/models`

When a new model is released by the provider, it automatically appears in the selector on the next refresh.

## Security Notes

- API keys are stored in SQLite database
- Keys are displayed masked (e.g., `sk-9...2f4`)
- Never expose API keys in client-side code
- Consider encrypting credentials at rest for production use

## Future Enhancements

- [ ] Add more providers (Cohere, Replicate, etc.)
- [ ] Credential encryption at rest
- [ ] Per-model settings (temperature, max tokens, etc.)
- [ ] Usage tracking and cost monitoring
- [ ] Team/shared credential management
