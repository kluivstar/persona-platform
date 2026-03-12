const db = require('./db.service');
const ai = require('./ai.service');

async function processMessage(messageData) {
    const { tenant_id, user_id, event_id } = messageData;

    console.log(`Processing event ${event_id} for user ${user_id}, tenant ${tenant_id}`);

    // 1. Fetch last 50 events for user (Aggregation)
    const eventsResult = await db.query(
        'SELECT event_type, payload, created_at FROM events WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 50',
        [user_id, tenant_id]
    );

    const userEvents = eventsResult.rows;

    // 2. Generate Persona with Vertex AI (Gemini)
    try {
        const persona = await ai.generatePersona(userEvents);

        // 3. Store Persona in DB (Atomic update)
        // Using UPSERT with versioning if needed, but per requirements, simpler unique constraint is enough
        await db.query(
            `INSERT INTO personas (tenant_id, user_id, persona, generated_at) 
             VALUES ($1, $2, $3, NOW()) 
             ON CONFLICT (tenant_id, user_id) 
             DO UPDATE SET persona = EXCLUDED.persona, generated_at = NOW()`,
            [tenant_id, user_id, JSON.stringify(persona)]
        );

        console.log(`Persona generated and stored for user ${user_id}`);
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
