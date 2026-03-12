require('dotenv').config();
const { PubSub } = require('@google-cloud/pubsub');
const { saveEvent, getLastEvents, savePersona } = require('./db');
const { generatePersona } = require('./ai');

const pubsub = new PubSub({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project',
    apiEndpoint: process.env.PUBSUB_EMULATOR_HOST || 'localhost:8085'
});

const TOPIC_NAME = 'user-events';
const SUBSCRIPTION_NAME = 'worker-subscription';

async function setupSubscription() {
    const [subscription] = await pubsub.topic(TOPIC_NAME).createSubscription(SUBSCRIPTION_NAME);
    console.log(`Subscription ${subscription.name} created.`);
}

async function processMessage(message) {
    const event = JSON.parse(message.data.toString());
    console.log(`Processing event: ${event.event_type} for user ${event.user_id}`);

    try {
        // 1. Save event to DB (Persistence & Multi-tenancy)
        await saveEvent(event);

        // 2. Aggregate last 50 events for context
        const recentEvents = await getLastEvents(event.tenant_id, event.user_id, 50);

        // 3. Conditional Persona Generation (e.g., every 5 events or on specific types)
        // For this prototype, we'll generate it on every event to demonstrate
        const persona = await generatePersona(recentEvents);

        // 4. Save/Update Persona
        await savePersona(event.tenant_id, event.user_id, persona);

        // 5. Ack message
        message.ack();
        console.log(`Successfully processed and acked event for ${event.user_id}`);
    } catch (error) {
        console.error(`Error processing message: ${error.message}`);
        // Nack for retry with exponential backoff if configured in Pub/Sub
        message.nack();
    }
}

async function start() {
    try {
        await setupSubscription();
    } catch (error) {
        if (error.code === 6) {
            console.log(`Subscription ${SUBSCRIPTION_NAME} already exists.`);
        } else {
            throw error;
        }
    }

    const subscription = pubsub.subscription(SUBSCRIPTION_NAME);
    subscription.on('message', processMessage);
    subscription.on('error', (error) => console.error(`Subscription error: ${error.message}`));

    console.log(`Worker listening for messages on ${SUBSCRIPTION_NAME}...`);
}

start();
