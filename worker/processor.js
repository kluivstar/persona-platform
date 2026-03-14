const db = require('./db.service');
const ai = require('./ai.service');

/**
 * Exponential backoff helper
 */
async function withRetry(fn, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const delay = Math.pow(2, i) * 1000;
            console.log(`Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

async function processMessage(messageData) {
    const { tenant_id, user_id, event_id, event_type, payload } = messageData;

    console.log(`[Worker] Received event ${event_id} for user ${user_id} in tenant ${tenant_id}`);

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Idempotency & Initial Storage
        const check = await client.query('SELECT id, processed_by_worker FROM events WHERE event_id = $1', [event_id]);
        
        if (check.rows.length === 0) {
            await client.query(
                'INSERT INTO events (event_id, tenant_id, user_id, event_type, payload, processed_by_worker) VALUES ($1, $2, $3, $4, $5, FALSE)',
                [event_id, tenant_id, user_id, event_type, JSON.stringify(payload)]
            );
            console.log(`[Worker] Stored raw event ${event_id}`);
        } else if (check.rows[0].processed_by_worker) {
            console.log(`[Worker] Event ${event_id} already fully processed. Skipping.`);
            await client.query('COMMIT');
            return { success: true };
        }

        // 2. Aggregate Context
        const history = await client.query(
            'SELECT event_type, payload, created_at FROM events WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
            [user_id, tenant_id]
        );
        
        // 3. LLM Generation (with Retry)
        const persona = await withRetry(() => ai.generatePersona(history.rows));

        // 4. Update Persona & Mark Processed
        await client.query(
            `INSERT INTO personas (tenant_id, user_id, persona_text, confidence, traits, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
             ON CONFLICT (tenant_id, user_id) 
             DO UPDATE SET persona_text = EXCLUDED.persona_text, confidence = EXCLUDED.confidence, traits = EXCLUDED.traits, updated_at = NOW()`,
            [tenant_id, user_id, persona.persona, persona.confidence, JSON.stringify(persona.traits)]
        );

        console.log(`[Worker] Persona saved to DB for tenant ${tenant_id} and user ${user_id}`);

        await client.query(
            'UPDATE events SET processed_by_worker = TRUE WHERE event_id = $1',
            [event_id]
        );

        await client.query('COMMIT');
        console.log(`[Worker] Persona updated for ${user_id} and event ${event_id} ACKed.`);
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[Worker] Fatal error processing ${event_id}:`, error.message);
        throw error; // Re-throw to trigger Pub/Sub NACK
    } finally {
        client.release();
    }
}

module.exports = {
    processMessage
};
