const { PubSub } = require('@google-cloud/pubsub');
const processor = require('./processor');
require('dotenv').config();

const pubsub = new PubSub({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project',
});

const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'event-worker-sub';
const subscription = pubsub.subscription(subscriptionName);

console.log(`Worker listening to ${subscriptionName}...`);

const messageHandler = async (message) => {
    try {
        const messageData = JSON.parse(message.data.toString());
        await processor.processMessage(messageData);

        // Acknowledge the message upon success
        message.ack();
        console.log(`Acknowledged message ${message.id}`);
    } catch (error) {
        console.error(`Error processing message ${message.id}:`, error.message);
        // Do NOT acknowledge on error to trigger Pub/Sub's built-in retry/backoff
        // Pub/Sub will redeliver based on its retry policy
        message.nack();
    }
};

const errorHandler = (error) => {
    console.error(`Pub/Sub Subscription Error: ${error.message}`);
};

subscription.on('message', messageHandler);
subscription.on('error', errorHandler);

// Graceful Shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await subscription.close();
    process.exit(0);
});
