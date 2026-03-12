# Persona Platform Setup Guide

This guide provides step-by-step instructions to get the Persona Platform up and running on your local machine.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Option 1: Quick Start with Docker (Recommended)](#option-1-quick-start-with-docker-recommended)
- [Option 2: Manual Development Setup](#option-2-manual-development-setup)
- [Environment Variables](#environment-variables)
- [Verifying the Installation](#verifying-the-installation)

---

## Prerequisites

Before you begin, ensure you have the following tools installed:

1.  **Git**: [Download Git](https://git-scm.com/downloads)
2.  **Node.js (v20.x or higher)**: [Download Node.js](https://nodejs.org/)
3.  **Docker & Docker Compose**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
4.  **Google Cloud SDK** (Optional, for production Vertex AI access): [Install Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

---

## Option 1: Quick Start with Docker (Recommended)

The easiest way to run the entire platform, including the database and Pub/Sub emulator, is using Docker Compose.

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd persona-platform
    ```

2.  **Start the Services**:
    ```bash
    docker-compose up --build
    ```
    *This will start the Postgres database, Pub/Sub emulator, API, Worker, and Frontend Dashboard.*

3.  **Access the Applications**:
    - **Dashboard**: [http://localhost:3001](http://localhost:3001)
    - **API Health**: [http://localhost:3000/health](http://localhost:3000/health)

---

## Option 2: Manual Development Setup

If you prefer to run services individually for development:

### 1. Database Setup
Ensure you have a Postgres instance running. You can use the one from docker-compose:
```bash
docker-compose up postgres -d
```
The database schema is automatically initialized from `database/init-db.sql`.

### 2. Start Services Locally
You will need to install dependencies for each service:

**Backend API:**
```bash
cd api
npm install
npm run dev
```

**Worker:**
```bash
cd worker
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend/nextjs-dashboard
npm install
npm run dev
```

---

## Environment Variables

The services use the following environment variables. You can create `.env` files in the respective service directories if running manually.

### API Service (`api/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port the API listens on | `3000` |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:password@localhost:5432/persona_platform` |
| `PUBSUB_EMULATOR_HOST` | Pub/Sub emulator address | `localhost:8085` |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | `test-project` |

### Worker Service (`worker/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:password@localhost:5432/persona_platform` |
| `PUBSUB_EMULATOR_HOST` | Pub/Sub emulator address | `localhost:8085` |
| `GOOGLE_CLOUD_PROJECT` | GCP Project ID | `test-project` |
| `GCP_LOCATION` | Vertex AI location | `us-central1` |
| `PUBSUB_SUBSCRIPTION` | Pub/Sub subscription name | `event-worker-sub` |

### Frontend (`frontend/nextjs-dashboard/.env.local`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | URL of the API service | `http://localhost:3000` |

---

## Verifying the Installation

Once everything is running, you can test the ingestion pipeline with a sample event:

```bash
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "tenant-1",
    "user_id": "user_demo",
    "event_type": "purchase",
    "payload": { "amount": 99.99, "currency": "USD" }
  }'
```

Verify the dashboard at `http://localhost:3001` to see the results.
