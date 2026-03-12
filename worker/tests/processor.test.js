const processor = require('../processor');
const db = require('../db.service');
const ai = require('../ai.service');

jest.mock('../db.service');
jest.mock('../ai.service');

describe('Worker Processor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should aggregate events and call AI service', async () => {
        const messageData = {
            event_id: 'event-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1'
        };

        const mockEvents = [
            { event_type: 'view', payload: {}, created_at: new Date() },
            { event_type: 'click', payload: {}, created_at: new Date() }
        ];

        db.query.mockResolvedValueOnce({ rows: mockEvents }); // Fetch events
        ai.generatePersona.mockResolvedValue({ persona: 'Active User', confidence: 0.8 });
        db.query.mockResolvedValueOnce({ rows: [] }); // Mock UPSERT

        const result = await processor.processMessage(messageData);

        expect(result.success).toBe(true);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT event_type'),
            ['user-1', 'tenant-1']
        );
        expect(ai.generatePersona).toHaveBeenCalledWith(mockEvents);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO personas'),
            expect.arrayContaining(['tenant-1', 'user-1'])
        );
    });

    it('should throw error if AI generation fails', async () => {
        const messageData = {
            event_id: 'event-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1'
        };

        db.query.mockResolvedValueOnce({ rows: [] });
        ai.generatePersona.mockRejectedValue(new Error('AI Service Down'));

        await expect(processor.processMessage(messageData)).rejects.toThrow('AI Service Down');
    });
});
