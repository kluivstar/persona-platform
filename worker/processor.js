const db = require('./db.service');
const ai = require('./ai.service');

async function processMessage(messageData) {
    const { tenant_id, user_id, event_id } = messageData;

    console.log(`Processing event ${event_id} for user ${user_id}, tenant ${tenant_id}`);

    // 1. Idempotency Check: See if this event was already fully processed by the worker
    const processCheck = await db.query(
        'SELECT processed_by_worker FROM events WHERE event_id = $1',
        [event_id]
    );

    if (processCheck.rows.length > 0 && processCheck.rows[0].processed_by_worker) {
        console.log(`Event ${event_id} already processed by worker. Skipping and acknowledging.`);
        return { success: true, skipped: true };
    }

    // 2. Fetch last 50 events for user (Aggregation)
    const eventsResult = await db.query(
        'SELECT event_type, payload, created_at FROM events WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 50',
        [user_id, tenant_id]
    );

    const userEvents = eventsResult.rows;

    // 3. Generate Persona with Vertex AI (Gemini)
    try {
        const persona = await ai.generatePersona(userEvents);

        // 4. Atomic Transaction: Store Persona AND mark event as processed
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Store/Update Persona
            await client.query(
                `INSERT INTO personas (tenant_id, user_id, persona, confidence, traits, generated_at) 
                 VALUES ($1, $2, $3, $4, $5, NOW()) 
                 ON CONFLICT (tenant_id, user_id) 
                 DO UPDATE SET persona = EXCLUDED.persona, confidence = EXCLUDED.confidence, traits = EXCLUDED.traits, generated_at = NOW()`,
                [tenant_id, user_id, persona.persona, persona.confidence, JSON.stringify(persona.traits)]
            );

            // Mark event as processed
            await client.query(
                'UPDATE events SET processed_by_worker = TRUE WHERE event_id = $1',
                [event_id]
            );

            await client.query('COMMIT');
            console.log(`Persona generated and event ${event_id} marked as processed.`);
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

        return { success: true };
    } catch (error) {
        console.error(`Failed to process persona for user ${user_id}:`, error);
        throw error; // Rethrow to trigger Pub/Sub retry
    }
}

// Exponential backoff helper for retries (if not handled by Pub/Sub automatically)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    processMessage
};
