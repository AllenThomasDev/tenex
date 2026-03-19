# Cal-El

Your scheduling superhero for decluttering your day — an AI-powered calendar assistant that connects to Google Calendar and provides a conversational interface for managing your schedule.

**Live:** [tenex-lac.vercel.app](https://tenex-lac.vercel.app)

---

## Quickstart

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)
- A Google Cloud project with the **Calendar API** and **People API** enabled
- OAuth 2.0 credentials (Web application type) with `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
- An OpenAI-compatible inference endpoint and API key (e.g. [Prime Intellect](https://www.primeintellect.ai/), [OpenRouter](https://openrouter.ai/), [Together](https://www.together.ai/))
- A [Turso](https://turso.tech/) database (free tier works)

### Install & Run

```bash
git clone https://github.com/AllenThomasDev/tenex.git
cd tenex
bun install
cp .env.example .env.local   # then fill in your keys (see below)
bun dev                       # → http://localhost:3000
```

### Environment Variables

| Variable | Description |
|---|---|
| `AUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AUTH_SECRET` | Random string for session encryption (`openssl rand -hex 32`) |
| `AUTH_URL` | App base URL (`http://localhost:3000` for dev) |
| `TURSO_DATABASE_URL` | Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `LLM_BASE_URL` | OpenAI-compatible inference endpoint (e.g. `https://api.pinference.ai/api/v1`) |
| `LLM_API_KEY` | API key for the inference endpoint |
| `LLM_MODEL` | Model ID for the agent (e.g. `openai/gpt-5.4`) |
| `LLM_GUARDRAIL_MODEL` | Model ID for the guardrail classifier (e.g. `google/gemini-3-flash-preview`) |

### Deploy

The app deploys to **Vercel** with zero config. Connect the repo, set the environment variables, and deploy. The only requirement is that your Google OAuth credentials include the production callback URL (`https://<your-domain>/api/auth/callback/google`).

---

## Deep Dive: Agent Architecture

This section covers the design decisions behind Cal-El's AI agent — how it reasons, what tools it has, how it renders rich UI, and the guardrails that keep it focused.

### Overview

Cal-El is built on the [Vercel AI SDK](https://sdk.vercel.ai/) `ToolLoopAgent` — a structured agent that autonomously loops through tool calls until it has enough information to respond. The agent receives a user message, decides which tools to call, interprets the results, and either calls more tools or responds with text + rich UI components.

```
User message
    │
    ▼
┌─────────────────────────┐
│   Guardrail Middleware   │  ← Fast classifier rejects off-topic queries
└────────────┬────────────┘
             │ (passes)
             ▼
┌─────────────────────────┐
│     ToolLoopAgent       │  ← Autonomous reasoning + tool-call loop
│  ┌───────────────────┐  │
│  │   LLM (GPT-5.4)   │  │
│  └───────┬───────────┘  │
│          │               │
│  ┌───────▼───────────┐  │
│  │   15 Tools         │  │  ← Calendar, Contacts, Display tools
│  └───────┬───────────┘  │
│          │               │
│  (loop until done)       │
└────────────┬────────────┘
             │
             ▼
   Streamed response with
   rich UI tool components
```

### The Agent (`src/lib/agents/calendar-agent.ts`)

The agent is a single `ToolLoopAgent` instance configured with:

1. **Dynamic system instructions** — injected at call time with the user's timezone, name, email, and the currently selected calendar day. This "selected day" context is key: if a user is looking at March 25th in the calendar UI and says "schedule a meeting at 2pm", the agent knows they mean March 25th, not today.

2. **15 tools** organized into three categories (see below).

3. **Model middleware** — a guardrail layer that intercepts every request before it reaches the LLM.

4. **`callOptionsSchema`** — typed with Zod, ensuring the route handler passes valid `accessToken`, `timezone`, `selectedDateLabel`, `userName`, and `userEmail` on every call.

The agent is instantiated once and reused across requests. Per-request state (access tokens, timezone) is passed through `options` in the `prepareCall` hook, which injects them into tool factories and the system prompt.

### Tool Design

Tools are split into three categories based on their role in the agent's reasoning loop:

#### Data Tools (read from Google Calendar / Contacts)

These tools fetch information and return structured data for the agent to reason over. They never render UI directly.

| Tool | Purpose |
|---|---|
| `listCalendars` | List all calendars the user has access to |
| `listEvents` | Fetch events in a time range (returns IDs, summaries, times) |
| `getEvent` | Get full details of a single event by ID |
| `searchEvents` | Full-text search across event titles, descriptions, locations, attendees |
| `getFreeBusy` | Query free/busy availability for a time range |
| `listColors` | Get available calendar color IDs |
| `searchContacts` | Search Google Contacts by name, email, or phone (via People API) |

#### Mutation Tools (write to Google Calendar)

These modify the user's calendar. Each returns `affectedDayKeys` — a list of `YYYY-MM-DD` strings for days that changed, which the frontend uses to invalidate its SWR cache and update the calendar UI in real-time.

| Tool | Purpose |
|---|---|
| `createEvent` | Create a new event with full support for attendees, recurrence, reminders, colors, visibility |
| `updateEvent` | Modify any property of an existing event |
| `deleteEvent` | Delete an event |
| `respondToEvent` | Accept, decline, or tentatively accept an event invitation |

#### Display Tools (render rich UI in chat)

These are the key architectural decision. Instead of having the agent describe events in plain text, display tools return structured data that the frontend renders as custom React components.

| Tool | Renders | Component |
|---|---|---|
| `displayEvents` | Visual event cards with times, locations, attendees | `ChatEventList` |
| `displayFreeBusy` | Timeline visualization of busy/free blocks | `ChatFreeBusy` |
| `displayEmailDraft` | Styled email preview with "Open in Gmail" button | `ChatEmailDraft` |
| `displayContacts` | Contact cards with emails and phone numbers | `ChatContactResults` |

The agent's system prompt instructs it on *when* to use each: `listEvents` for reasoning, `displayEvents` for showing results. This separation means the agent can fetch 50 events, filter them down to 3 that match a criteria, and only render those 3 — without polluting the chat with a wall of text.

Each display tool is a server-side `tool()` that returns plain data. The magic happens on the client: the `Chat` component checks `getToolName(part)` in the message stream and swaps in the corresponding React component when `part.state === "output-available"`.

### Guardrail Middleware (`src/lib/middleware/calendar-guardrail.ts`)

Every user message passes through a guardrail before reaching the main LLM. This is implemented as AI SDK `LanguageModelV3Middleware` that intercepts `transformParams`:

1. Extracts the last user message text
2. Sends it to a fast, cheap classifier model (Gemini 3 Flash via Prime Intellect) with a simple YES/NO prompt: *"Is this message related to calendar, scheduling, events, meetings, availability, time management, reminders, or drafting emails about events?"*
3. If YES → request passes through unchanged
4. If NO → the middleware rewrites the conversation to force a polite refusal, bypassing the main LLM entirely

This is a cost-effective pattern: the classifier runs on a small model (Gemini Flash) and short-circuits off-topic queries before they consume tokens on the primary model. The refusal is deterministic — it doesn't waste a full LLM call to say "I can't help with that."

### Event References (`#` mentions)

Users can reference specific events from the calendar UI by typing `#` in the chat input. This opens a `cmdk`-powered search popover showing the day's events. Selected events are:

1. Displayed as tags above the input (with remove buttons)
2. Attached to the message as `metadata.referredEvents`
3. Injected into the LLM prompt by the route handler (`injectReferredEvents`) as structured context appended to the user's message text

This gives the agent precise event IDs and details without requiring the user to describe events by name or time.

### Real-Time Calendar Sync

When the agent creates, updates, or deletes events, the frontend needs to reflect those changes immediately. This is handled through a reactive pattern:

1. Mutation tools (`createEvent`, `updateEvent`, `deleteEvent`, `respondToEvent`) return `affectedDayKeys` — computed by checking which calendar days the event spans
2. The `Chat` component watches the message stream via `useEffect`, checking for completed tool calls from the mutation set
3. When an affected day key is detected, it triggers an SWR `mutate()` call with `fetchFreshDayEvents`, which re-fetches that day's events from Google Calendar
4. The calendar UI updates automatically since it's backed by the same SWR cache

### Auth & Token Flow

Authentication uses [Better Auth](https://www.better-auth.com/) with Google as the social provider:

- OAuth scopes: `openid`, `email`, `profile`, `calendar`, `calendar.events`, `contacts.readonly`
- Access type: `offline` (for refresh tokens)
- Sessions: 30-day expiry, refreshed daily
- Session storage: Turso (libSQL) via Kysely dialect

The `/api/chat` route handler retrieves the Google access token from the session and passes it to the agent's `options`. Every tool factory receives this token and creates a scoped Google API client — tokens never touch the frontend.

### Streaming & Frontend

The chat uses `createAgentUIStreamResponse` on the server and `useChat` from `@ai-sdk/react` on the client. The stream carries both text chunks and tool UI parts, which the frontend renders progressively:

- **Text** → `MessageResponse` with streaming animation via `streamdown`
- **Tool calls in progress** → status badges ("running", "completed")
- **Completed display tools** → swapped for custom React components
- **Thinking state** → shimmer animation

The chat panel is resizable (320–700px), toggleable with `⌘I`, and lazily loaded with `next/dynamic` to keep the initial bundle small.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Runtime | Bun |
| Styling | Tailwind CSS 4 |
| Components | Radix UI, shadcn/ui, cmdk |
| Animation | Motion (Framer Motion) |
| AI SDK | Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) |
| Agent | `ToolLoopAgent` with `LanguageModelV3Middleware` |
| LLM | GPT-5.4 via Prime Intellect inference gateway |
| Guardrail | Gemini 3 Flash (classifier) via Prime Intellect |
| Auth | Better Auth with Google OAuth 2.0 |
| Database | Turso (libSQL) with Kysely |
| Calendar | Google Calendar API v3 |
| Contacts | Google People API v1 |
| Data Fetching | SWR |
| Deployment | Vercel |

## Project Structure

```
src/
  app/
    page.tsx                    # Main calendar + chat layout
    chat.tsx                    # Chat component with tool rendering
    layout.tsx                  # Root layout
    api/
      auth/[...all]/            # Better Auth catch-all route
      calendar/                 # Calendar data endpoints (SWR fetchers)
      chat/route.ts             # Agent streaming endpoint
  components/
    chat-panel.tsx              # Resizable side panel
    chat-provider.tsx           # Chat state context + useChat hook
    chat-event-list.tsx         # Display tool: event cards
    chat-freebusy.tsx           # Display tool: availability timeline
    chat-email-draft.tsx        # Display tool: email preview + Gmail link
    chat-contact-results.tsx    # Display tool: contact cards
    ai-elements/                # Conversation, Message, PromptInput components
    ui/                         # shadcn/ui primitives
  lib/
    agents/
      calendar-agent.ts        # ToolLoopAgent definition
    middleware/
      calendar-guardrail.ts    # Intent classifier middleware
    tools/
      google-calendar.ts       # Shared Google Calendar client factory
      google-contacts.ts       # Google People API client + fuzzy search
      list-events.ts            # Data tool
      get-event.ts              # Data tool
      search-events.ts          # Data tool
      get-freebusy.ts           # Data tool
      list-calendars.ts         # Data tool
      list-colors.ts            # Data tool
      create-event.ts           # Mutation tool
      update-event.ts           # Mutation tool
      delete-event.ts           # Mutation tool
      respond-to-event.ts       # Mutation tool
      display-events.ts         # Display tool
      display-freebusy.ts       # Display tool
      display-email-draft.ts    # Display tool
      display-contacts.ts       # Display tool
      parse-time-input.ts       # ISO 8601 → Google Calendar time format
    assistant.tsx               # Agent identity (name, tagline, icon)
    chat-message.ts             # Chat message types + event reference types
    calendar-day.ts             # Day key utilities + affected day computation
  auth.ts                       # Better Auth config
```
