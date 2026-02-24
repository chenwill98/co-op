import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DynamoDB docClient before importing the module
const mockSend = vi.fn();
vi.mock('./dynamodb', () => ({
  docClient: { send: (...args: unknown[]) => mockSend(...args) },
}));

// Mock nanoid to return a predictable value
vi.mock('nanoid', () => ({
  nanoid: () => 'abc12345',
}));

import { createShare, getShare, getVotes, castVote, updateShare } from './dynamodb-shares';

describe('dynamodb-shares', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe('createShare', () => {
    it('generates a valid ID and sends correct PutItem params', async () => {
      mockSend.mockResolvedValueOnce({});

      const shareId = await createShare(['prop1', 'prop2']);

      expect(shareId).toBe('abc12345');
      expect(mockSend).toHaveBeenCalledTimes(1);

      const command = mockSend.mock.calls[0][0];
      expect(command.input.TableName).toBe('SharedListings');
      expect(command.input.Item.shareId).toBe('abc12345');
      expect(command.input.Item.sk).toBe('META');
      expect(command.input.Item.propertyIds).toEqual(['prop1', 'prop2']);
      expect(command.input.Item.expiresAt).toBeGreaterThan(
        Math.floor(Date.now() / 1000)
      );
    });
  });

  describe('updateShare', () => {
    it('updates propertyIds and refreshes TTL for existing share', async () => {
      // First call: getShare query returns existing share
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            shareId: 'abc12345',
            sk: 'META',
            propertyIds: ['prop1', 'prop2'],
            createdAt: 1700000000,
          },
        ],
      });
      // Second call: PutCommand to overwrite META
      mockSend.mockResolvedValueOnce({});

      const result = await updateShare('abc12345', ['prop3', 'prop4']);

      expect(result).not.toBeNull();
      expect(result!.propertyIds).toEqual(['prop3', 'prop4']);
      expect(result!.createdAt).toBe(1700000000); // Preserves original createdAt
      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify the PutCommand has correct data
      const putCommand = mockSend.mock.calls[1][0];
      expect(putCommand.input.Item.propertyIds).toEqual(['prop3', 'prop4']);
      expect(putCommand.input.Item.createdAt).toBe(1700000000);
      expect(putCommand.input.Item.expiresAt).toBeGreaterThan(
        Math.floor(Date.now() / 1000)
      );
    });

    it('returns null for non-existent share', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await updateShare('nonexistent', ['prop1']);
      expect(result).toBeNull();
      // Should only call getShare, not PutCommand
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('propagates DynamoDB errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('ServiceUnavailable'));

      await expect(updateShare('abc12345', ['prop1'])).rejects.toThrow('ServiceUnavailable');
    });
  });

  describe('getShare', () => {
    it('returns share data with META and VOTES items', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            shareId: 'abc12345',
            sk: 'META',
            propertyIds: ['prop1', 'prop2'],
            createdAt: 1700000000,
          },
          {
            shareId: 'abc12345',
            sk: 'VOTES#prop1',
            upvotes: 3,
            downvotes: 1,
          },
        ],
      });

      const result = await getShare('abc12345');

      expect(result).not.toBeNull();
      expect(result!.shareId).toBe('abc12345');
      expect(result!.propertyIds).toEqual(['prop1', 'prop2']);
      expect(result!.votes['prop1']).toEqual({ upvotes: 3, downvotes: 1 });
    });

    it('returns null for non-existent share', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await getShare('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when no META item found', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ shareId: 'abc', sk: 'VOTES#prop1', upvotes: 1, downvotes: 0 }],
      });

      const result = await getShare('abc');
      expect(result).toBeNull();
    });
  });

  describe('getVotes', () => {
    it('returns vote counts for all properties', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          { sk: 'VOTES#prop1', upvotes: 5, downvotes: 2 },
          { sk: 'VOTES#prop2', upvotes: 0, downvotes: 3 },
        ],
      });

      const votes = await getVotes('abc12345');

      expect(votes['prop1']).toEqual({
        upvotes: 5,
        downvotes: 2,
        userVote: null,
      });
      expect(votes['prop2']).toEqual({
        upvotes: 0,
        downvotes: 3,
        userVote: null,
      });
    });

    it('includes user vote direction when sessionId provided', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            sk: 'VOTES#prop1',
            upvotes: 5,
            downvotes: 2,
            upSessions: new Set(['session1', 'session2']),
            downSessions: new Set(['session3']),
          },
        ],
      });

      const votes = await getVotes('abc12345', 'session1');
      expect(votes['prop1'].userVote).toBe('up');
    });

    it('returns empty map for share with no votes', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const votes = await getVotes('abc12345');
      expect(votes).toEqual({});
    });
  });

  describe('error handling', () => {
    it('propagates DynamoDB errors from createShare', async () => {
      mockSend.mockRejectedValueOnce(new Error('ProvisionedThroughputExceededException'));

      await expect(createShare(['prop1'])).rejects.toThrow('ProvisionedThroughputExceededException');
    });

    it('propagates DynamoDB errors from getShare', async () => {
      mockSend.mockRejectedValueOnce(new Error('ServiceUnavailable'));

      await expect(getShare('abc12345')).rejects.toThrow('ServiceUnavailable');
    });

    it('propagates DynamoDB errors from getVotes', async () => {
      mockSend.mockRejectedValueOnce(new Error('InternalServerError'));

      await expect(getVotes('abc12345')).rejects.toThrow('InternalServerError');
    });

    it('propagates DynamoDB errors from castVote read phase', async () => {
      mockSend.mockRejectedValueOnce(new Error('ThrottlingException'));

      await expect(castVote('share1', 'prop1', 'up', 'session1')).rejects.toThrow('ThrottlingException');
    });

    it('propagates DynamoDB errors from castVote write phase', async () => {
      // Read succeeds (no existing votes)
      mockSend.mockResolvedValueOnce({ Items: [] });
      // Write fails
      mockSend.mockRejectedValueOnce(new Error('ConditionalCheckFailedException'));

      await expect(castVote('share1', 'prop1', 'up', 'session1')).rejects.toThrow('ConditionalCheckFailedException');
    });
  });

  describe('castVote', () => {
    it('adds a fresh upvote when no prior vote exists', async () => {
      // First call: Query to read current state (no existing item)
      mockSend.mockResolvedValueOnce({ Items: [] });
      // Second call: UpdateCommand succeeds
      mockSend.mockResolvedValueOnce({
        Attributes: { upvotes: 1, downvotes: 0 },
      });

      const result = await castVote('share1', 'prop1', 'up', 'session1');

      expect(result).toEqual({ upvotes: 1, downvotes: 0 });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('returns current counts when user already voted this direction (no-op)', async () => {
      // Query returns item where session already upvoted
      mockSend.mockResolvedValueOnce({
        Items: [{
          upvotes: 3,
          downvotes: 1,
          upSessions: new Set(['session1']),
          downSessions: new Set(),
        }],
      });

      const result = await castVote('share1', 'prop1', 'up', 'session1');

      // Only 1 call (the read), no update needed
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ upvotes: 3, downvotes: 1 });
    });

    it('removes upvote when direction is "none" and session has upvoted', async () => {
      // Query returns item where session has upvoted
      mockSend.mockResolvedValueOnce({
        Items: [{
          upvotes: 3,
          downvotes: 1,
          upSessions: new Set(['session1', 'session2']),
          downSessions: new Set(),
        }],
      });
      // Update: remove from upSessions and decrement upvotes
      mockSend.mockResolvedValueOnce({
        Attributes: { upvotes: 2, downvotes: 1 },
      });

      const result = await castVote('share1', 'prop1', 'none', 'session1');

      expect(result).toEqual({ upvotes: 2, downvotes: 1 });
      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify the UpdateCommand uses DELETE for upSessions
      const updateCommand = mockSend.mock.calls[1][0];
      expect(updateCommand.input.UpdateExpression).toContain('DELETE upSessions');
      expect(updateCommand.input.UpdateExpression).toContain('upvotes = upvotes - :one');
    });

    it('removes downvote when direction is "none" and session has downvoted', async () => {
      // Query returns item where session has downvoted
      mockSend.mockResolvedValueOnce({
        Items: [{
          upvotes: 2,
          downvotes: 3,
          upSessions: new Set(),
          downSessions: new Set(['session1']),
        }],
      });
      // Update: remove from downSessions and decrement downvotes
      mockSend.mockResolvedValueOnce({
        Attributes: { upvotes: 2, downvotes: 2 },
      });

      const result = await castVote('share1', 'prop1', 'none', 'session1');

      expect(result).toEqual({ upvotes: 2, downvotes: 2 });
      expect(mockSend).toHaveBeenCalledTimes(2);

      // Verify the UpdateCommand uses DELETE for downSessions
      const updateCommand = mockSend.mock.calls[1][0];
      expect(updateCommand.input.UpdateExpression).toContain('DELETE downSessions');
      expect(updateCommand.input.UpdateExpression).toContain('downvotes = downvotes - :one');
    });

    it('returns current counts when direction is "none" and session has not voted', async () => {
      // Query returns item where session has NOT voted
      mockSend.mockResolvedValueOnce({
        Items: [{
          upvotes: 5,
          downvotes: 2,
          upSessions: new Set(['other-session']),
          downSessions: new Set(),
        }],
      });

      const result = await castVote('share1', 'prop1', 'none', 'session1');

      // Only 1 call (the read), no update needed
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ upvotes: 5, downvotes: 2 });
    });

    it('swaps vote when user changes from down to up', async () => {
      // Query returns item where session previously downvoted
      mockSend.mockResolvedValueOnce({
        Items: [{
          upvotes: 2,
          downvotes: 3,
          upSessions: new Set(),
          downSessions: new Set(['session1']),
        }],
      });
      // Update: swap the vote
      mockSend.mockResolvedValueOnce({
        Attributes: { upvotes: 3, downvotes: 2 },
      });

      const result = await castVote('share1', 'prop1', 'up', 'session1');

      expect(result).toEqual({ upvotes: 3, downvotes: 2 });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});
