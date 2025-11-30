# LiveNote

AI-powered meeting transcription and knowledge organization tool with real-time speech-to-text capabilities.

## Features

- **Real-time Transcription**: Live speech-to-text with multiple provider support
- **Keyword & Topic Extraction**: AI-powered analysis of conversation content
- **Multiple STT Providers**: Choose between AmiVoice, Google Cloud Speech-to-Text, or OpenAI Realtime API

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **AI**: Vercel AI SDK with OpenAI
- **UI**: shadcn/ui + Tailwind CSS

## Prerequisites

- Node.js 20+
- pnpm
- Docker (for local PostgreSQL)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/livenote"

# Auth
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"

# OpenAI (for AI features and OpenAI Realtime STT)
OPENAI_API_KEY="sk-..."

# Google Cloud Speech-to-Text (optional)
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# AmiVoice (optional)
AMIVOICE_APPKEY="your-appkey-with-issue-permission"
```

### 4. Run database migrations

```bash
pnpm db:push
```

### 5. Start the development server

```bash
# Next.js only
pnpm dev

# Next.js + Google Speech WebSocket server
pnpm dev:all
```

## STT Providers

| Provider | Connection | Setup Complexity | Japanese Accuracy |
|----------|------------|------------------|-------------------|
| AmiVoice | Browser → AmiVoice (direct) | Easy | Excellent |
| Google Cloud Speech-to-Text | Browser → Custom Server → Google | Medium | Good |
| OpenAI Realtime API | Browser → OpenAI (direct) | Easy | Good |

### AmiVoice

- Requires APPKEY with "can issue APPKEY" permission
- Browser connects directly to AmiVoice via WebSocket
- One-time APPKEY issued server-side for security

### Google Cloud Speech-to-Text

- Requires service account with Speech-to-Text API enabled
- Uses custom WebSocket server for streaming
- Run `pnpm dev:all` to start both Next.js and speech server

### OpenAI Realtime API

- Requires OpenAI API key
- Browser connects directly via WebSocket
- Uses ephemeral token for security

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── amivoice-token/    # AmiVoice one-time APPKEY
│   │   │   ├── extract-topics/    # Topic extraction
│   │   │   ├── realtime-token/    # OpenAI ephemeral token
│   │   │   └── ...
│   │   └── auth/                  # Better Auth routes
│   └── (protected)/
│       └── conversation/          # Conversation pages
├── components/
│   ├── amivoice-recorder.tsx
│   ├── google-speech-recorder.tsx
│   └── realtime-transcription-recorder.tsx
├── hooks/
│   ├── use-amivoice-transcription.ts
│   ├── use-google-speech-transcription.ts
│   └── use-realtime-transcription.ts
├── db/
│   └── schema.ts                  # Drizzle schema
└── lib/
    ├── audio-utils.ts             # Audio processing
    └── auth.ts                    # Auth configuration
server/
└── speech-websocket.ts            # Google Speech WebSocket server
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js development server |
| `pnpm dev:all` | Start Next.js + Speech WebSocket server |
| `pnpm build` | Build for production |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm typecheck` | Run TypeScript type check |
| `pnpm lint` | Run ESLint |

## License

MIT
