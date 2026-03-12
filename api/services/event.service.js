const db = require('./db.service');
const pubsub = require('./pubsub.service');
const Joi = require('joi');

const eventSchema = Joi.object({
    event_id: Joi.string().uuid().required(),
    tenant_id: Joi.string().required(),
    user_id: Joi.string().required(),
    event_type: Joi.string().required(),
    payload: Joi.object().required()
});

async function processEvent(event) {
    // 1. Validate
    const { error } = eventSchema.validate(event);
    if (error) {
        throw new Error(`Validation Error: ${error.details[0].message}`);
    }

    // 2. Check Idempotency
    const existingEvent = await db.query(
        'SELECT id FROM events WHERE event_id = $1',
        [event.event_id]
    );

    if (existingEvent.rows.length > 0) {
        console.log(`Event ${event.event_id} already exists, skipping.`);
        return { alreadyProcessed: true };
    }

    // 3. Store Event (Initial Ingestion)
    await db.query(
        'INSERT INTO events (event_id, tenant_id, user_id, event_type, payload) VALUES ($1, $2, $3, $4, $5)',
        [event.event_id, event.tenant_id, event.user_id, event.event_type, JSON.stringify(event.payload)]
    );

    // 4. Publish to Pub/Sub
    const pubsubEvent = {
        ...event,
        timestamp: new Date().toISOString()
    };
    await pubsub.publishEvent(pubsubEvent);

    return { success: true };
}

async function getPersona(userId, tenantId) {
    const result = await db.query(
        'SELECT persona, generated_at FROM personas WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );
    return result.rows[0];
}

module.exports = {
    processEvent,
    getPersona
};
