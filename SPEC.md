# Calendar Assistant — Technical Spec

## Overview

A web application that connects to a user's Google Calendar via GSuite authentication, displays their calendar in an intuitive interface, and provides an AI-powered chat assistant that can reason about, manage, and optimize their schedule.

## What We're Building

### Core Features

#### 1. Google Authentication & Calendar Integration
- OAuth 2.0 flow with Google (GSuite accounts)
- Read/write access to Google Calendar API
- Fetch and sync calendar events

#### 2. Calendar View
- Display calendar events in a clear, well-designed interface (week view as primary, with day/month toggles)
- Show event details: title, time, duration, attendees, location
- Visual indicators for meeting density / busy times

#### 3. Chat Interface
- Conversational AI agent alongside the calendar view
- The agent has access to calendar data via tool use
- Natural language interaction for all calendar operations

### Agent Capabilities

The chat agent should handle requests like:

**Scheduling & Management**
- "Schedule a meeting with Joe next Tuesday at 2pm"
- "I have three meetings I need to schedule with Joe, Dan, and Sally"
- "Move my 3pm to Thursday"
- "Cancel all meetings on Friday"

**Constraint-Aware Scheduling**
- "I want to block my mornings off to work out, can you schedule around that?"
- "Find a 30-minute slot this week that doesn't conflict with anything"

**Email Drafting**
- "Write me an email draft I can share with each of them to propose the meeting time"
- "Draft a reschedule email for my 2pm — something came up"

**Analysis & Recommendations**
- "How much of my time am I spending in meetings?"
- "How would you recommend I decrease that?"
- "What does my week look like?"
- "Which day is lightest for deep work?"

### Agent Tools (LLM Function Calling)

| Tool | Description |
|---|---|
| `list_events` | Fetch events for a date range |
| `create_event` | Create a new calendar event |
| `update_event` | Modify an existing event |
| `delete_event` | Remove an event |
| `find_free_slots` | Find available time windows given constraints |
| `draft_email` | Generate an email draft for scheduling communications |
| `analyze_schedule` | Compute meeting stats (hours/week, busiest day, etc.) |

## Systems Thinking & Failure Modes

These are the things that separate a demo from a production system:

- **Human-in-the-loop**: Never auto-execute write operations (create/update/delete). Always present the proposed action and ask for confirmation.
- **Ambiguity handling**: "Schedule with Joe" — which Joe? Surface clarifying questions rather than guessing.
- **Conflict detection**: Before creating an event, check for overlaps and warn the user.
- **Graceful degradation**: If Google API is slow or rate-limited, show stale data with a warning rather than failing.
- **LLM failure**: If the model produces an invalid tool call or hallucinates a contact, catch it and explain what went wrong.
- **Token management**: Calendar data can be large. Summarize events rather than dumping raw payloads into context.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | React requirement satisfied. Full-stack in one project. API routes for OAuth + backend logic. |
| Styling | Tailwind CSS | Fast iteration, polished output |
| Auth | Better Auth (Google provider) | Handles OAuth flow, token/session management |
| Calendar API | Google Calendar API v3 | Direct REST via googleapis npm package |
| LLM | Claude API (Anthropic SDK) | Tool use support, strong reasoning for multi-step scheduling |
| Deployment | Vercel | Zero-config for Next.js, easy to share a live link |

## Architecture

```
┌─────────────────────────────────────────┐
│              Next.js App                │
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ Calendar View │  │ Chat Interface │  │
│  │  (React)      │  │   (React)      │  │
│  └──────┬───────┘  └───────┬────────┘  │
│         │                  │            │
│  ┌──────┴──────────────────┴────────┐  │
│  │        API Routes (Next.js)       │  │
│  │  /api/auth   /api/calendar        │  │
│  │  /api/chat                        │  │
│  └──────┬──────────────────┬────────┘  │
│         │                  │            │
│  ┌──────┴───────┐  ┌──────┴────────┐  │
│  │ Google APIs   │  │  Claude API   │  │
│  │ (Calendar,    │  │  (Tool Use)   │  │
│  │  OAuth)       │  │               │  │
│  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────┘
```

## Scope Boundaries

### In Scope
- Single-user authentication (one Google account)
- Read/write calendar operations via chat
- Week/day/month calendar views
- Meeting analysis and recommendations
- Email draft generation (displayed in chat, not auto-sent)
- Confirmation flows for destructive/write actions

### Out of Scope
- Multi-user / team features
- Actually sending emails (drafts only)
- Real-time calendar sync (refresh on action or manual)
- Calendar event notifications / reminders
- Recurring event creation (v2)
- MCP server / terminal agent integration (stretch goal, post-submission)

## Build Sequence

### Phase 1: Foundation
1. Next.js project setup with Tailwind
2. Google OAuth via Better Auth
3. Basic calendar data fetching

### Phase 2: Calendar UI
4. Week view with event rendering
5. Day/month view toggles
6. Event detail display

### Phase 3: Chat Agent
7. Chat UI component
8. Claude API integration with tool definitions
9. Implement calendar tools (list, create, update, delete)
10. Human-in-the-loop confirmation flow

### Phase 4: Intelligence
11. `find_free_slots` with constraint handling
12. `analyze_schedule` with visualizations
13. `draft_email` with context awareness
14. Conflict detection and ambiguity resolution

### Phase 5: Polish
15. Error handling and graceful degradation
16. Loading states and optimistic UI
17. Mobile responsiveness
18. Deploy to Vercel

## Evaluation Alignment

How this maps to what Tenex scores:

| Trait (Weight) | How We Score |
|---|---|
| Builds things (25%) | Complete, working end-to-end system |
| High horsepower (20%) | Constraint-aware scheduling, conflict detection, analysis — all beyond minimum spec |
| Taste (15%) | Polished calendar UI, smooth chat UX, confirmation flows |
| Curiosity (15%) | Agent architecture, multi-step tool use, smart context management |
| Learn/teach (15%) | Video walkthrough explaining pipeline design and tradeoffs |
| Self-direction (10%) | Clear product decisions without detailed spec |
