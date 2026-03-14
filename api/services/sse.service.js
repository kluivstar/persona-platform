/**
 * Simple SSE Broadcast manager
 */
let clients = [];

function addClient(res) {
    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);
    
    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 30000);

    return () => {
        clearInterval(heartbeat);
        clients = clients.filter(c => c.id !== clientId);
    };
}

function broadcastEvent(event) {
    const data = JSON.stringify(event);
    clients.forEach(c => {
        c.res.write(`data: ${data}\n\n`);
    });
}

module.exports = {
    addClient,
    broadcastEvent
};
