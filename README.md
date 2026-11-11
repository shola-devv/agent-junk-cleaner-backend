   # AgentJunkCleaner Backend

   This repository is the backend for the original AgentJunkCleaner Electron desktop app. It provides the API layer that the desktop app uses to send chat requests, receive AI responses, and coordinate tool-call approval flows.

   The frontend app is the local experience that users interact with; this backend is the server-side companion that validates incoming requests, integrates with AI providers, and stores lightweight analytics.

   ```text
   Electron app (UI + local actions) -> HTTP API -> this backend -> AI provider
                                         |
                                         +-> MongoDB analytics + visitor tracking
   ```

   ## What this backend does

   - Accepts chat requests from the Electron app and validates the payload
   - Routes requests to either the mock provider or Groq
   - Supplies structured tool-call proposals and approval metadata
   - Tracks downloads and visitor activity in MongoDB
   - Exposes health and readiness checks for deployment and local debug use
   - Enforces request validation and per-IP rate limits

   ## Why it exists

   AgentJunkCleaner is designed around a simple pattern:

   - The Electron app presents the user experience
   - The app detects system-level actions to suggest or perform
   - The backend turns the app's message history into AI responses
   - The app shows those proposed tool calls and asks for approval
   - The user approves an action locally in the desktop app
   - The app executes the action on the machine and sends the result back into the same conversation flow

   This backend stays intentionally thin. It does not run the actual local cleanup tasks itself; those actions happen on the user's machine, inside the Electron app.

   ## Project structure

   ```text
   src/
     app.ts                 # Express app setup
     server.ts              # Server startup and shutdown
     config/                # env + config validation
     controllers/           # request handlers
     routes/                # HTTP routes
     services/              # AI + readiness + Mongo logic
     validators/            # request schemas
     middleware/            # auth-like guards, validation, rate limits
     utils/                 # shared helpers
     types/                 # TypeScript types
   ```

   ## Prerequisites

   - Node.js 18.17 or newer
   - npm
   - MongoDB (required for analytics and readiness checks)
   - A Groq API key if you want to test the Groq provider instead of the mock provider

   ## Local setup

   1. Clone the repository.
   2. Install dependencies:

   ```bash
   npm install
   ```

   3. Copy the example environment file:

   On macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   4. Update your local environment values in `.env`.

   The default values are a good starting point, but you should configure at least:

   ```env
   ALLOWED_ORIGINS=http://localhost:5173
   AI_PROVIDER=mock
   MONGODB_URI=mongodb://localhost:27017/agentjunkcleaner
   MONGODB_DATABASE=agentjunkcleaner
   ```

   If you are testing against Groq, set:

   ```env
   AI_PROVIDER=groq
   GROQ_API_KEY=your_api_key_here
   GROQ_MODEL=openai/gpt-oss-20b
   ```

   5. Start the app in development mode:

   ```bash
   npm run dev
   ```

   This runs the backend with file watching via `tsx`.

   ## Production build

   ```bash
   npm run build
   npm start
   ```

   You can also do a fast type check without a full build:

   ```bash
   npm run typecheck
   ```

   ## Environment notes

   The app relies on a few key variables:

   - `HOST` and `PORT`: bind address and port for the Express server
   - `ALLOWED_ORIGINS`: allowed browser origins for CORS
   - `AI_PROVIDER`: either `mock` or `groq`
   - `AI_TIMEOUT_MS`: timeout for AI requests
   - `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`: shared per-IP limits
   - `DAILY_RATE_LIMIT_MAX`: daily limit per client IP
   - `MONGODB_URI`: MongoDB connection string
   - `TRUST_PROXY_HOPS`: only set when you are behind a trusted reverse proxy

   Important: never commit `.env` files or expose API keys in source control.

   ## API overview

   ### Health and readiness

   - `GET /health` — simple liveness check
   - `GET /ready` — returns a readiness status and fails when dependencies are not ready

   ### Chat API

   - `POST /api/chat` — sends the current conversation thread and receives an AI response plus tool calls

   The Electron app sends the full message history on each request, and the backend validates and processes it.

   ### Analytics endpoints

   - `POST /api/visitors` — register a visitor IP in MongoDB
   - `POST /api/downloads` — increment the global download counter
   - `GET /api/downloads/count` — fetch the current count

   These endpoints are protected by the same IP-based request limits as the rest of the API.

   ## Chat protocol contract

   The backend expects the Electron chat request shape:

   ```json
   {
     "conversationId": "optional-uuid",
     "messages": [
       { "role": "user", "content": "scan my system" }
     ],
     "clientContext": {
       "platform": "win32",
       "appVersion": "1.0.0"
     }
   }
   ```

   The backend returns this direct response shape (with `toolCalls` always an array):

   ```json
   {
     "conversationId": "uuid",
     "message": {
       "role": "assistant",
       "content": "Starting a read-only scan of supported cache locations."
     },
     "toolCalls": [
       {
         "id": "uuid",
         "name": "scan_computer",
         "arguments": {}
       }
     ]
   }
   ```

   The backend can request only `get_system_info`, `scan_computer`, `inspect_candidate` (with a UUID `candidateId`), and `calculate_storage`. The legacy name `scan_system` is normalized to `scan_computer`. When a tool returns, the desktop app sends its JSON result as a `role: "tool"` message with the corresponding UUID `toolCallId`; the backend continues from the supplied conversation history. The backend does not run scans or delete files: scans are read-only, and cleanup is a separate user-confirmed desktop flow.

   ## AI providers

   This project supports two providers:

   ### Mock provider

   - Default option
   - Useful for local development
   - Does not require an API key

   ### Groq provider

   - Uses Groq's OpenAI-compatible chat completions endpoint
   - Requires `GROQ_API_KEY`
   - Enabled by setting `AI_PROVIDER=groq`

   ## Contributing

   This project is intended to be open source and easy to improve. If you're contributing to the backend for the original Electron app, please keep the contract between the app and API in mind.

   ### Contribution workflow

   1. Fork the repository or create a branch from the latest main branch
   2. Create a focused branch for your change
   3. Keep your changes small and easy to review
   4. Update environment examples or docs if your change affects setup
   5. Run the relevant validation command before opening a PR

   Suggested local validation:

   ```bash
   npm run typecheck
   ```

   If your change adds or modifies route behavior, also verify the endpoint manually with a local request.

   ### Contribution guidelines

   - Prefer clear TypeScript types over `any`
   - Validate request payloads with Zod before processing
   - Keep routes, controllers, services, and validators separated by concern
   - Do not commit secrets or `.env` files
   - If you change how the frontend and backend communicate, keep the Electron app contract compatible

   ### Working with the Electron app

   This backend is paired with the original Electron app. If you are fixing or adding functionality across both repos, make sure:

   - the request/response schema still matches the app expectations
   - tool names and arguments remain compatible with the desktop app
   - CORS origins are configured for the app's local URLs
   - any new telemetry or analytics endpoints are documented here

   ## License

   This project is intended to be open and community-friendly. Check the repository license file for the exact legal terms before publishing or distributing changes.

   ## Need help?

   If you are setting up the project for the first time, the most common issues are:

   - `.env` missing or not copied
   - MongoDB not running
   - `ALLOWED_ORIGINS` not matching the app origin
   - `AI_PROVIDER=groq` without a valid `GROQ_API_KEY`

   If you are developing both the backend and the original Electron app together, start the backend first, then run the desktop app and confirm the local API connection works before testing more complex flows.
