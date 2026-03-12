const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project',
  apiEndpoint: process.env.PUBSUB_EMULATOR_HOST || 'localhost:8085'
});

const TOPIC_NAME = 'user-events';

async function publishEvent(event) {
  try {
    const dataBuffer = Buffer.from(JSON.stringify(event));
    const messageId = await pubsub.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });
    console.log(`Message ${messageId} published.`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing to Pub/Sub: ${error.message}`);
    throw error;
  }
}

async function createTopic() {
  try {
    const [topic] = await pubsub.createTopic(TOPIC_NAME);
    console.log(`Topic ${topic.name} created.`);
  } catch (error) {
    if (error.code === 6) {
      console.log(`Topic ${TOPIC_NAME} already exists.`);
    } else {
      throw error;
    }
  }
}

module.exports = { publishEvent, createTopic };
