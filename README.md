# Calendar Assistant

An AI-powered calendar assistant that connects to Google Calendar and provides a conversational interface for managing your schedule.

## Features

- Google Calendar integration via OAuth 2.0
- Calendar view (week/day/month)
- AI chat agent for scheduling, analysis, and email drafting
- Human-in-the-loop confirmation for calendar modifications

## Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js (Google provider)
- **LLM**: Claude via AI SDK + @ai-sdk/anthropic
- **Calendar**: Google Calendar API v3

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- Google Cloud project with Calendar API enabled
- Anthropic API key

### Setup

1. Clone the repo and install dependencies:

```bash
bun install
```

2. Copy the environment template and fill in your keys:

```bash
cp .env.example .env.local
```

3. Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
  app/
    page.tsx              # Main calendar + chat UI
    layout.tsx            # Root layout
    api/
      auth/               # Google OAuth endpoints
      calendar/           # Calendar API routes
      chat/               # AI chat endpoint
  lib/
    agents/               # AI agent definitions
    tools/                # Agent tool definitions
```
