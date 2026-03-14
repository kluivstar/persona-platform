# AI Journey - Persona Platform

This document describes the collaboration between the engineer and the AI assistant during the architecture and debugging of the Persona Platform.

## 3 Complex Prompts Used

### 1. Architectural Design & Idempotency
> "Help me design a Node.js worker that processes events from Google Cloud Pub/Sub. It must ensure strict idempotency so that even if a message is redelivered, we don't duplicate personas. Use PostgreSQL for state management and an atomic transaction to update the persona and mark the event as processed in a single step."

### 2. High-Throughput Ingestion & Real-Time Sync
> "I need to align with a Pub/Sub-before-DB requirement. Refactor my Express API to be a high-throughput pass-through that only validates schema. Additionally, implement a Server-Sent Events (SSE) broadcasting service so that incoming events are pushed immediately to the Next.js dashboard before the worker even begins processing."

### 3. Case-Insensitive Persistent Retrieval
> "I'm facing a bizarre issue where literal SQL matching for user_id and tenant_id fails despite records existing. Help me implement a 'Resilient Retrieval' pattern in the API service that falls back from exact SQL matching to normalized SQL matching (using LOWER and TRIM), and finally to a JavaScript-side memory match for all records found for that user."

## Instance of Hallucination / "Spaghetti" Solution Correction

**The Character Mismatch Mystery**:
During the retrieval phase, the AI initially suggested that the `404 Persona Not Found` error was due to an incorrect `DATABASE_URL` or a missing table column. However, after verifying the schema, the AI suggested adding complex `ILIKE` and `regexp_match` queries that would have resulted in "spaghetti" SQL and potential performance bottlenecks.

**Correction**:
I intervened and decided to implement a diagnostic "tracing" mechanism in the service layer. By capturing the character codes of the incoming strings vs the database strings, we discovered a subtle discrepancy in how the environment was handling strings. Instead of adding "spaghetti" regex logic, I implemented a clean **Layered Retrieval** strategy (Exact -> Normalized -> Memory Match) which solved the problem elegantly and provided a self-diagnosing 404 response.

## Verification Task

### 1. N+1 Query Risks
My implementation avoids N+1 risks by performing a single batch query for the user's last 50 events:
```javascript
const history = await client.query(
    'SELECT event_type, payload, created_at FROM events WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 50',
    [user_id, tenant_id]
);
```
This ensures we fetch all context in one round-trip before calling the LLM.

### 2. Horizontal Scaling (Cloud Run)
- **API**: Stateless and multi-tenant. Can scale horizontally based on request concurrency.
- **Worker**: Each instance consumes messages independently. Pub/Sub handles load balancing across multiple worker instances. We use `INSERT ... ON CONFLICT` to ensure that even if multiple workers generate personas for the same user concurrently, they don't produce inconsistent state.

### 3. Data Consistency (Worker Failure)
If the worker fails mid-process (e.g., LLM timeout):
- The database transaction is rolled back.
- The Pub/Sub message is **not** acknowledged (NACK).
- The message broker (GCP/Emulator) automatically triggers a retry based on the subscription's retry policy.
- Our persistence logic ensures the raw event is either already stored or stored on the next attempt.
