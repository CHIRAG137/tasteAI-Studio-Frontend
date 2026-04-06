# TasteAI Studio Frontend

Modern React dashboard for building, testing, and deploying AI voice/chat bots with Auth0-secured visitor and agent flows.

## Stack

- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS + Radix
- React Router + React Query
- Auth0 (`@auth0/auth0-react`) + Google OAuth

## Features

- Bot creation wizard (content, persona, flow, voice/video, handoff)
- Bot playground and embedded chat preview
- Public bot chat with optional Auth0 visitor identity gate
- Agent portal (Auth0 + credential login)
- Analytics, sessions, and profile/integrations

## Why Auth0 Makes TasteAI Better

- **Stronger identity guarantees**: users, visitors, and agents are validated with standards-based OAuth/OIDC tokens.
- **Safer public bot usage**: visitor-protected bots require Auth0 access tokens before chat APIs are called.
- **Reduced abuse and impersonation risk**: identity-linked sessions prevent one user from reusing another user's flow/handoff session.
- **Better enterprise readiness**: supports centralized identity governance, account lifecycle management, and future SSO expansion.
- **Token Vault-ready architecture**: frontend acquires proper audience-scoped access tokens that backend can exchange securely.

## Where Auth0 Is Used in Frontend

- **Dashboard auth**: `/login` and `/register` include `Continue with Auth0`; callback handled at `/callback`.
- **Agent auth**: `/agent/login` supports Auth0 sign-in; callback handled at `/agent/callback`.
- **Visitor identity gate**: `VisitorAuth0Gate` protects public/embed chats when bot config enables visitor identity.
- **Token propagation**: visitor access token is attached in `Authorization` header for flow/ask/handoff calls.
- **Auth-aware logout**: Auth0 logout listeners clear hosted sessions for both dashboard and agent flows.

## Project Structure

```text
src/
  api/                  # API clients
  components/           # shared and feature components
  components/visitor/   # Auth0 visitor gate
  components/agent/     # agent auth guards and UI
  pages/                # route pages
  pages/agent/          # agent portal pages
  utils/                # auth/session helpers
```

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- Backend running locally (default: `http://localhost:5000`)

## Environment Variables

Create `.env` in this folder:

```bash
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:8080

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=

# Auth0 SPA
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_AUTH0_AUDIENCE=

# Optional realtime/video integrations
VITE_LIVEKIT_WS_URL=
```

Auth0 callback URLs should include:

- `http://localhost:8080/callback`
- `http://localhost:8080/agent/callback`
- Any production equivalents for both routes

## Auth0 Setup (Frontend) - Step by Step

1. Create (or open) an Auth0 **Single Page Application**.
2. Configure these settings:
   - **Allowed Callback URLs**:  
     `http://localhost:8080/callback`, `http://localhost:8080/agent/callback`
   - **Allowed Logout URLs**:  
     `http://localhost:8080/login`, `http://localhost:8080/agent/login`
   - **Allowed Web Origins**:  
     `http://localhost:8080`
3. In Auth0, create/configure an **API** (identifier must match backend + frontend audience).
4. Populate frontend `.env`:
   - `VITE_AUTH0_DOMAIN`
   - `VITE_AUTH0_CLIENT_ID`
   - `VITE_AUTH0_AUDIENCE`
5. Start frontend and backend; verify:
   - Dashboard Auth0 login returns to `/callback` and lands in app.
   - Agent Auth0 login returns to `/agent/callback` and lands in `/agent`.
   - Visitor-protected bot prompts for identity before chat.

## Local Setup

```bash
# 1) install dependencies
npm install

# 2) start dev server
npm run dev
```

App runs at `http://localhost:8080`.

## Available Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - lint source

## Build for Production

```bash
npm run build
npm run preview
```

## Security Notes

- Never commit real secrets into `.env`.
- Visitor-protected bots require Auth0 access token propagation from UI.
- For production, set strict Auth0 allowed origins/callback/logout URLs.
- Keep frontend `VITE_AUTH0_AUDIENCE` exactly equal to backend `AUTH0_AUDIENCE`.

## Troubleshooting

- **Auth redirect mismatch**: verify Auth0 callback URLs exactly match local/prod URLs.
- **401 on public chat**: check `VITE_AUTH0_AUDIENCE` and backend `AUTH0_AUDIENCE` match.
- **CORS issues**: ensure backend allows your frontend origin.
