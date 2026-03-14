const db = require('./db.service');
const pubsub = require('./pubsub.service');
const sse = require('./sse.service');
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

    // 3. Publish to Pub/Sub
    const pubsubEvent = {
        ...event,
        timestamp: new Date().toISOString()
    };
    await pubsub.publishEvent(pubsubEvent);
    sse.broadcastEvent(pubsubEvent);

    return { success: true };
}

async function getPersona(userId, tenantId) {
    const result = await db.query(
        'SELECT * FROM personas WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );
    if (result.rows.length > 0) {
        console.log(`[API] Persona retrieved for tenant ${tenantId} and user ${userId}`);
        return { persona: result.rows[0] };
    }

    return { persona: null };
}

async function getAvailableTenants(userId) {
    const result = await db.query(
        'SELECT DISTINCT tenant_id FROM personas WHERE user_id = $1',
        [userId]
    );
    return result.rows.map(r => r.tenant_id);
}

module.exports = {
    processEvent,
    getPersona,
    getAvailableTenants
};
