require('dotenv').config();
const express = require('express');
const { publishEvent, createTopic } = require('./pubsub');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Event Ingestion Endpoint
app.post('/v1/events', async (req, res) => {
    const { tenant_id, user_id, event_type, payload } = req.body;

    if (!tenant_id || !user_id || !event_type || !payload) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const event = {
            tenant_id,
            user_id,
            event_type,
            payload,
            timestamp: new Date().toISOString()
        };

        const messageId = await publishEvent(event);
        res.status(202).json({ messageId, status: 'accepted' });
    } catch (error) {
        console.error('Failed to ingest event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, async () => {
    console.log(`Backend API listening on port ${PORT}`);
    await createTopic();
});
