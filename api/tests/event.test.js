const request = require('supertest');
const app = require('../server');
const eventService = require('../services/event.service');
const { v4: uuidv4 } = require('uuid');

jest.mock('../services/event.service');

describe('Event API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /events', () => {
        it('should accept a valid event', async () => {
            const event = {
                event_id: uuidv4(),
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                event_type: 'page_view',
                payload: { url: '/home' }
            };

            eventService.processEvent.mockResolvedValue({ success: true });

            const res = await request(app)
                .post('/api/v1/events')
                .send(event);

            expect(res.statusCode).toEqual(202);
            expect(res.body.message).toEqual('Event accepted');
            expect(eventService.processEvent).toHaveBeenCalledWith(event);
        });

        it('should return 400 for invalid event', async () => {
            const event = { user_id: 'user-1' }; // Missing fields

            eventService.processEvent.mockRejectedValue(new Error('Validation Error: "event_id" is required'));

            const res = await request(app)
                .post('/api/v1/events')
                .send(event);

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('Validation Error');
        });

        it('should return 200 if event already processed', async () => {
            const event = {
                event_id: uuidv4(),
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                event_type: 'page_view',
                payload: { url: '/home' }
            };

            eventService.processEvent.mockResolvedValue({ alreadyProcessed: true });

            const res = await request(app)
                .post('/api/v1/events')
                .send(event);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toEqual('Event already processed');
        });
    });

    describe('GET /persona/:userId', () => {
        it('should return persona if found', async () => {
            const persona = { persona: 'High-intent', confidence: 0.9 };
            eventService.getPersona.mockResolvedValue(persona);

            const res = await request(app)
                .get('/api/v1/persona/user-1')
                .set('x-tenant-id', 'tenant-1');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(persona);
            expect(eventService.getPersona).toHaveBeenCalledWith('user-1', 'tenant-1');
        });

        it('should return 404 if persona not found', async () => {
            eventService.getPersona.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/v1/persona/user-1');

            expect(res.statusCode).toEqual(404);
        });
    });
});
