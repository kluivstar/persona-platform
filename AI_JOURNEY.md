# AI Journey - Persona Platform

## Collaboration Log

- **2026-03-10**: Project initialization. Reviewed existing skeleton (Node.js/Express/Postgres/PubSub).
- **2026-03-10**: Designed architecture for high-throughput ingestion and async persona generation.
- **2026-03-10**: Created implementation plan and task list.

## Prompt Engineering

### 1. System Architecture Prompt
> "Design a high-throughput event ingestion system using Google Cloud Pub/Sub and Node.js. Focus on multi-tenancy, data isolation, and idempotency. The system should handle 10k RPS bursts and persist to PostgreSQL."

### 2. Context Worker & AI Integration Prompt
> "Create an async worker that consumes user events from Pub/Sub, aggregates the last 50 events for a specific user, and uses Vertex AI (Gemini 1.5 Flash) to generate a JSON marketing persona. Ensure retry logic with exponential backoff and schema validation for the LLM output."

### 3. Frontend Dashboard Prompt
> "Build a real-time analytics dashboard in Next.js (App Router) that displays incoming user events and generated personas. Use Tailwind CSS for a premium dark-mode aesthetic. Implement optimistic UI updates for persona generation to hide LLM latency."

## Refinement: AI Hallucinations & Spaghetti Corrections

- **Correction (Project Structure)**: Initially, the AI suggested a flat structure. This was refined to a modular `api/`, `worker/`, `frontend/` layout to ensure clean separation of concerns and independent scalability.
- **Correction (Idempotency)**: Initial code lacked a explicit `event_id` check at the API level. This was corrected by adding a unique constraint on `event_id` and implementing a pre-flight check in the service layer to prevent redundant Pub/Sub publishing.
- **Correction (Next.js Versions)**: Local environment had issues with Next.js 15+ and React 19 alpha. Manually pinned dependencies to stable Next.js 14.2.3 and React 18 to ensure a reliable build.

## Verification Task (SYSTEM_DESIGN)

### N+1 Query Fix
We avoid N+1 queries by:
1. Using batching for event ingestion.
2. In the worker, fetching all necessary user events in a single SQL query `SELECT * FROM events WHERE user_id = $1 AND tenant_id = $2 ORDER BY timestamp DESC LIMIT 50` before passing to the LLM.

### Horizontal Scaling on Cloud Run
Cloud Run scales automatically based on request concurrency. For the worker, we use Pub/Sub Push subscriptions to Cloud Run endpoints, allowing GCP to handle the scaling/retries automatically.

### Data Consistency Strategy
If the worker fails mid-process:
1. **Pub/Sub Acknowledgement**: We only 'ACK' the message after the persona is successfully persisted.
2. **Idempotency**: Every event has a unique `idempotency_key`. The worker checks if an event has already been processed using a `processed` flag in the `events` table.
3. **Database Transactions**: Wrapping the persona update and event 'processed' flag update in a single transaction.
