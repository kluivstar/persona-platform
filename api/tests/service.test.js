const eventService = require('../services/event.service');
const db = require('../services/db.service');
const pubsub = require('../services/pubsub.service');
const { v4: uuidv4 } = require('uuid');

jest.mock('../services/db.service');
jest.mock('../services/pubsub.service');

describe('Event Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processEvent', () => {
        it('should validate and process a new event', async () => {
            const event = {
                event_id: uuidv4(),
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                event_type: 'page_view',
                payload: { url: '/home' }
            };

            db.query.mockResolvedValueOnce({ rows: [] }); // No existing event
            db.query.mockResolvedValueOnce({ rows: [] }); // Mock INSERT result
            pubsub.publishEvent.mockResolvedValue('msg-id');

            const result = await eventService.processEvent(event);

            expect(result.success).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(2);
            expect(pubsub.publishEvent).toHaveBeenCalled();
        });

        it('should throw validation error for invalid schema', async () => {
            const event = { user_id: 'user-1' }; // missing fields

            await expect(eventService.processEvent(event)).rejects.toThrow('Validation Error');
        });

        it('should return alreadyProcessed if event_id exists', async () => {
            const event = {
                event_id: uuidv4(),
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                event_type: 'page_view',
                payload: { url: '/home' }
            };

            db.query.mockResolvedValueOnce({ rows: [{ id: 'some-id' }] });

            const result = await eventService.processEvent(event);

            expect(result.alreadyProcessed).toBe(true);
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(pubsub.publishEvent).not.toHaveBeenCalled();
        });
    });
});
