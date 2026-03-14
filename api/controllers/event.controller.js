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
    const tenantId = req.query.tenant_id || req.query.tenantId || req.headers['x-tenant-id'] || 'default';

    try {
        const { persona } = await eventService.getPersona(userId, tenantId);
        if (!persona) {
            return res.status(200).json({ status: "PROCESSING" });
        }
        return res.json({ persona });
    } catch (error) {
        console.error('Error fetching persona:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


const sse = require('../services/sse.service');

async function streamEvents(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const removeClient = sse.addClient(res);

    req.on('close', () => {
        removeClient();
    });
}

module.exports = {
    ingestEvent,
    getPersona,
    streamEvents
};
