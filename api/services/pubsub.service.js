const { PubSub } = require('@google-cloud/pubsub');
require('dotenv').config();

const pubsub = new PubSub({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project',
    // emulator host is handled by environment variable PUBSUB_EMULATOR_HOST
});

const topicName = process.env.PUBSUB_TOPIC || 'user-events';

async function publishEvent(event) {
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
        const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
        console.log(`Message ${messageId} published.`);
        return messageId;
    } catch (error) {
        console.error(`Received error while publishing: ${error.message}`);
        throw error;
    }
}

module.exports = {
    publishEvent
};
