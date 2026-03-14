# System Design - Segment-to-Context Service

## Architecture Overview
The Segment-to-Context Service is a high-throughput, event-driven platform designed for enterprise user analytics. It ingests raw JSON event data and uses Vertex AI (Gemini 1.5 Flash) to generate enriched user personas.

### Components
1. **API Service (Ingestion Layer)**: A high-throughput Node.js/Express service that validates incoming events and publishes messages directly to Google Cloud Pub/Sub. Persistence is deferred to the worker to handle bursts gracefully.
2. **Pub/Sub (Message Broker)**: Decouples ingestion from processing, serving as the "Golden Path" buffer for high-concurrency traffic.
3. **Worker Service (Context Aggregator & Persistence)**: Consumes events, persists raw event data to PostgreSQL, aggregates the last 50 events for context, and interacts with Vertex AI.
4. **Vertex AI (Intelligence Layer)**: Uses Gemini 1.5 Flash to transform raw event history into structured JSON personas.
5. **PostgreSQL (Persistence Layer)**: Stores events for historical context and the final generated personas with strict tenant isolation.
6. **Next.js Dashboard (Presentation Layer)**: Provides a real-time view of ingested events and a searchable directory of user personas.

## Technical Solutions

### N+1 Query Fix
To avoid N+1 query issues during event aggregation:
- The worker performs a single batch query: `SELECT * FROM events WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 50`.
- All context is fetched in one round-trip before being passed to the LLM.

### Horizontal Scaling on Cloud Run
- The **API Service** is stateless and can scale horizontally based on request concurrency.
- The **Worker Service** can be deployed as a Cloud Run job or a service triggered by Pub/Sub Push. GCP handles the scaling of instances based on the message backlog.

### Data Consistency & Idempotency
- **Event-level Idempotency**: Each event must include a unique `event_id`. The API checks the database before processing to prevent duplicate ingestion.
- **Worker Reliability**: Messages are only acknowledged (ACK) after the persona has been successfully generated and stored. Database UPSERT logic ensures that persona updates are atomic and consistent.

## Multi-tenancy
- Every table includes a `tenant_id` column.
- All queries are scoped by `tenant_id` to ensure strict data isolation.
- API requests require a `x-tenant-id` header (or authenticated token in production).
