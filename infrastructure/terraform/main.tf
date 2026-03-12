provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  default     = "us-central1"
}

# Pub/Sub Topic for Raw Events
resource "google_pubsub_topic" "raw_events" {
  name = "raw-user-events"
}

# Pub/Sub Subscription for the Worker
resource "google_pubsub_subscription" "worker_subscription" {
  name  = "event-worker-sub"
  topic = google_pubsub_topic.raw_events.name

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# Cloud SQL instance (PostgreSQL)
resource "google_sql_database_instance" "persona_db" {
  name             = "persona-platform-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"
  }
  deletion_protection = false
}

resource "google_sql_database" "database" {
  name     = "persona_platform"
  instance = google_sql_database_instance.persona_db.name
}

# Optional: Firestore (as requested in prompt)
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}
