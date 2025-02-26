import { chatHistorySampleData } from './chatHistory';
import { Conversation } from '../api/models';

describe('chatHistorySampleData', () => {
  it('should be an array of Conversation objects', () => {
    expect(Array.isArray(chatHistorySampleData)).toBe(true);

    chatHistorySampleData.forEach((conversation) => {
      expect(conversation).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        messages: expect.any(Array),
        date: expect.any(String),
      });

      conversation.messages.forEach((message) => {
        expect(message).toMatchObject({
          id: expect.any(String),
          role: expect.any(String),
          content: expect.any(String),
          date: expect.any(String),
        });
      });
    });
  });

  it('should have valid dates in ISO format', () => {
    chatHistorySampleData.forEach((conversation) => {
      const isoDate = new Date(conversation.date).toISOString();
      expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
  
      conversation.messages.forEach((message) => {
        const messageIsoDate = new Date(message.date).toISOString();
        expect(messageIsoDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
      });
    });
  });
  
  

  it('should contain unique conversation ids', () => {
    const ids = chatHistorySampleData.map((conv) => conv.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
