const processor = require('../processor');
const db = require('../db.service');
const ai = require('../ai.service');

jest.mock('../db.service');
jest.mock('../ai.service');

describe('Worker Processor', () => {
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        db.pool = {
            connect: jest.fn().mockResolvedValue(mockClient)
        };
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

        // 1. Idempotency check returns not processed
        db.query.mockResolvedValueOnce({ rows: [] }); 
        // 2. Fetch events
        db.query.mockResolvedValueOnce({ rows: mockEvents }); 
        
        ai.generatePersona.mockResolvedValue({ 
            persona: 'Active User', 
            confidence: 0.8,
            traits: ['loves-clicking']
        });

        const result = await processor.processMessage(messageData);

        expect(result.success).toBe(true);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT processed_by_worker'),
            ['event-1']
        );
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT event_type'),
            ['user-1', 'tenant-1']
        );
        expect(ai.generatePersona).toHaveBeenCalledWith(mockEvents);
        
        // Transactional queries
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO personas'),
            expect.arrayContaining(['tenant-1', 'user-1'])
        );
        expect(mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE events'),
            ['event-1']
        );
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if AI generation fails', async () => {
        const messageData = {
            event_id: 'event-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1'
        };

        db.query.mockResolvedValueOnce({ rows: [] }); // Idempotency
        db.query.mockResolvedValueOnce({ rows: [] }); // Fetch events
        ai.generatePersona.mockRejectedValue(new Error('AI Service Down'));

        await expect(processor.processMessage(messageData)).rejects.toThrow('AI Service Down');
    });
});
