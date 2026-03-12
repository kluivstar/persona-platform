const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function saveEvent(event) {
    const query = `
    INSERT INTO events (tenant_id, user_id, event_type, payload, timestamp)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
    const values = [event.tenant_id, event.user_id, event.event_type, event.payload, event.timestamp];
    const res = await pool.query(query, values);
    return res.rows[0].id;
}

async function getLastEvents(tenant_id, user_id, limit = 50) {
    const query = `
    SELECT payload, event_type, timestamp
    FROM events
    WHERE tenant_id = $1 AND user_id = $2
    ORDER BY timestamp DESC
    LIMIT $3;
  `;
    const values = [tenant_id, user_id, limit];
    const res = await pool.query(query, values);
    return res.rows;
}

async function savePersona(tenant_id, user_id, persona) {
    const query = `
    INSERT INTO user_personas (tenant_id, user_id, persona_metadata, last_updated)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (tenant_id, user_id)
    DO UPDATE SET 
      persona_metadata = EXCLUDED.persona_metadata,
      last_updated = EXCLUDED.last_updated,
      version = user_personas.version + 1;
  `;
    const values = [tenant_id, user_id, persona];
    await pool.query(query, values);
}

module.exports = { saveEvent, getLastEvents, savePersona };
