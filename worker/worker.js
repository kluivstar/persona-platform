const { PubSub } = require('@google-cloud/pubsub');
const processor = require('./processor');
require('dotenv').config();

const pubsub = new PubSub({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project',
});

const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'events';
const subscriptionName = process.env.PUBSUB_SUBSCRIPTION || 'event-worker-sub';

async function initPubSub() {
    try {
        console.log(`Checking Pub/Sub initialization...`);
        // 1. Check and create Topic
        const topic = pubsub.topic(TOPIC_NAME);
        const [topicExists] = await topic.exists();
        if (!topicExists) {
            console.log(`Topic ${TOPIC_NAME} not found. Creating...`);
            await pubsub.createTopic(TOPIC_NAME);
            console.log(`Topic ${TOPIC_NAME} created.`);
        }

        // 2. Check and create Subscription
        const subscription = pubsub.subscription(subscriptionName);
        const [subExists] = await subscription.exists();
        if (!subExists) {
            console.log(`Subscription ${subscriptionName} not found. Creating...`);
            await topic.createSubscription(subscriptionName);
            console.log(`Subscription ${subscriptionName} created.`);
        }
        
        console.log(`Pub/Sub initialized successfully.`);
    } catch (error) {
        console.error(`Error initializing Pub/Sub in worker:`, error);
        throw error;
    }
}

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

let activeSubscription;

async function startWorker() {
    await initPubSub();
    activeSubscription = pubsub.subscription(subscriptionName);
    activeSubscription.on('message', messageHandler);
    activeSubscription.on('error', errorHandler);
    console.log(`Worker listening to ${subscriptionName}...`);
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    if (activeSubscription) await activeSubscription.close();
    process.exit(0);
});

startWorker().catch(err => {
    console.error(`Worker failed to start:`, err);
    process.exit(1);
});
