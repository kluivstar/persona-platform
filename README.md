# Segment-to-Context Service

A high-performance platform for real-time user event ingestion and AI-driven persona generation.

## Features
- **High Throughput**: Event-driven architecture using Google Pub/Sub.
- **AI-Powered**: Integrates with Vertex AI (Gemini) for deep user context.
- **Multi-tenant**: Built-in data isolation for enterprise scale.
- **Real-time**: Next.js dashboard with live event streaming.
- **Documented**: Comprehensive **[System Design](docs/SYSTEM_DESIGN.md)** and **[AI Journey](AI_JOURNEY.md)** logs.

## Getting Started

### Quick Start (Docker)
The fastest way to get the platform running locally:
1. **Clone the repository**
2. **Start services**: `docker-compose up --build`
3. **Open Dashboard**: [http://localhost:3001](http://localhost:3001)

### Detailed Setup
For manual installation, environment variable configuration, and prerequisite details, please refer to the **[Detailed Setup Guide](docs/SETUP.md)**.

## Project Structure
- `api/`: Express.js ingestion service.
- `worker/`: Pub/Sub consumer and AI processor.
- `frontend/nextjs-dashboard/`: Next.js 14 dashboard.
- `database/`: SQL initialization scripts.
- `infrastructure/terraform/`: GCP IaC scripts.

## Testing
Run tests for individual services:
```bash
cd api && npm test
cd worker && npm test
```
