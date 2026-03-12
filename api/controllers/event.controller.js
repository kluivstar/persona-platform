const eventService = require('../services/event.service');

async function ingestEvent(req, res) {
    try {
        const event = req.body;
        const result = await eventService.processEvent(event);

        if (result.alreadyProcessed) {
            return res.status(200).json({ message: 'Event already processed' });
        }

        return res.status(202).json({ message: 'Event accepted' });
    } catch (error) {
        if (error.message.startsWith('Validation Error')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error ingesting event:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getPersona(req, res) {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'] || 'default'; // Simple tenant isolation via header

    try {
        const persona = await eventService.getPersona(userId, tenantId);
        if (!persona) {
            return res.status(404).json({ error: 'Persona not found' });
        }
        return res.json(persona);
    } catch (error) {
        console.error('Error fetching persona:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    ingestEvent,
    getPersona
};
