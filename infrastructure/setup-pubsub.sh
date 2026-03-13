#!/bin/bash

# Wait for Pub/Sub emulator to be ready
echo "Waiting for Pub/Sub emulator at $PUBSUB_EMULATOR_HOST..."
until $(curl -s -f http://$PUBSUB_EMULATOR_HOST/ > /dev/null); do
  printf '.'
  sleep 1
done
echo "Pub/Sub emulator is up!"

# Create topic
gcloud --init --project=$GOOGLE_CLOUD_PROJECT pubsub topics create events --host-port=$PUBSUB_EMULATOR_HOST

# Create subscription
gcloud --init --project=$GOOGLE_CLOUD_PROJECT pubsub subscriptions create event-worker-sub --topic=events --host-port=$PUBSUB_EMULATOR_HOST

echo "Pub/Sub resources created successfully:"
echo "Topic: events"
echo "Subscription: event-worker-sub"
