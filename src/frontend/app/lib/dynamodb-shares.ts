import { docClient } from './dynamodb';
import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';

const TABLE_NAME = 'SharedListings';
const TTL_DAYS = 30;

export interface VoteResult {
  upvotes: number;
  downvotes: number;
}

export interface VotesMap {
  [propertyId: string]: VoteResult & {
    userVote?: 'up' | 'down' | null;
  };
}

export interface ShareData {
  shareId: string;
  propertyIds: string[];
  createdAt: number;
  votes: VotesMap;
}

/**
 * Create a new shared listing collection.
 * Stores property IDs in DynamoDB with a 30-day TTL.
 */
export async function createShare(propertyIds: string[]): Promise<string> {
  const shareId = nanoid(8);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TTL_DAYS * 24 * 60 * 60;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        shareId,
        sk: 'META',
        propertyIds,
        createdAt: now,
        expiresAt,
      },
    })
  );

  return shareId;
}

/**
 * Update the property IDs for an existing share.
 * Overwrites the META record's propertyIds and refreshes expiresAt.
 * Returns the updated share data, or null if the share doesn't exist.
 */
export async function updateShare(
  shareId: string,
  propertyIds: string[]
): Promise<ShareData | null> {
  // First verify the share exists
  const existing = await getShare(shareId);
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TTL_DAYS * 24 * 60 * 60;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        shareId,
        sk: 'META',
        propertyIds,
        createdAt: existing.createdAt,
        expiresAt,
      },
    })
  );

  return {
    shareId,
    propertyIds,
    createdAt: existing.createdAt,
    votes: existing.votes,
  };
}

/**
 * Get a share by ID, including META and all VOTES items.
 * Returns null if the share doesn't exist or has expired.
 */
export async function getShare(shareId: string): Promise<ShareData | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'shareId = :sid',
      ExpressionAttributeValues: {
        ':sid': shareId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const metaItem = result.Items.find((item) => item.sk === 'META');
  if (!metaItem) {
    return null;
  }

  const votes: VotesMap = {};
  for (const item of result.Items) {
    if (item.sk.startsWith('VOTES#')) {
      const propertyId = item.sk.replace('VOTES#', '');
      votes[propertyId] = {
        upvotes: item.upvotes || 0,
        downvotes: item.downvotes || 0,
      };
    }
  }

  return {
    shareId,
    propertyIds: metaItem.propertyIds as string[],
    createdAt: metaItem.createdAt as number,
    votes,
  };
}

/**
 * Get only vote data for a share (lightweight polling endpoint).
 * Optionally includes user's own vote direction per property.
 */
export async function getVotes(
  shareId: string,
  sessionId?: string
): Promise<VotesMap> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression:
        'shareId = :sid AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':sid': shareId,
        ':prefix': 'VOTES#',
      },
    })
  );

  const votes: VotesMap = {};
  if (result.Items) {
    for (const item of result.Items) {
      const propertyId = item.sk.replace('VOTES#', '');
      let userVote: 'up' | 'down' | null = null;

      if (sessionId) {
        const upSessions = item.upSessions
          ? Array.from(item.upSessions as Set<string>)
          : [];
        const downSessions = item.downSessions
          ? Array.from(item.downSessions as Set<string>)
          : [];

        if (upSessions.includes(sessionId)) {
          userVote = 'up';
        } else if (downSessions.includes(sessionId)) {
          userVote = 'down';
        }
      }

      votes[propertyId] = {
        upvotes: item.upvotes || 0,
        downvotes: item.downvotes || 0,
        userVote,
      };
    }
  }

  return votes;
}

/**
 * Cast or change a vote on a property within a share.
 *
 * - If user hasn't voted: adds their vote
 * - If user already voted this direction: returns current counts (no-op)
 * - If user voted the opposite direction: swaps the vote
 */
export async function castVote(
  shareId: string,
  propertyId: string,
  direction: 'up' | 'down' | 'none',
  sessionId: string
): Promise<VoteResult> {
  const sk = `VOTES#${propertyId}`;

  // Read current state to determine what kind of update to do
  const current = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'shareId = :sid AND sk = :sk',
      ExpressionAttributeValues: {
        ':sid': shareId,
        ':sk': sk,
      },
    })
  );

  const item = current.Items?.[0];
  const upSessions: string[] = item?.upSessions
    ? Array.from(item.upSessions as Set<string>)
    : [];
  const downSessions: string[] = item?.downSessions
    ? Array.from(item.downSessions as Set<string>)
    : [];

  const alreadyUp = upSessions.includes(sessionId);
  const alreadyDown = downSessions.includes(sessionId);

  // Remove vote when direction is 'none'
  if (direction === 'none') {
    if (!alreadyUp && !alreadyDown) {
      return { upvotes: item?.upvotes || 0, downvotes: item?.downvotes || 0 };
    }

    const removeExpression = alreadyUp
      ? 'DELETE upSessions :session SET upvotes = upvotes - :one'
      : 'DELETE downSessions :session SET downvotes = downvotes - :one';

    const removeResult = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { shareId, sk },
        UpdateExpression: removeExpression,
        ExpressionAttributeValues: {
          ':session': new Set([sessionId]),
          ':one': 1,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    const removeAttrs = removeResult.Attributes!;
    return {
      upvotes: removeAttrs.upvotes || 0,
      downvotes: removeAttrs.downvotes || 0,
    };
  }

  // Already voted this direction — no-op
  if ((direction === 'up' && alreadyUp) || (direction === 'down' && alreadyDown)) {
    return {
      upvotes: item?.upvotes || 0,
      downvotes: item?.downvotes || 0,
    };
  }

  // Build the update expression based on the scenario
  const isSwap = (direction === 'up' && alreadyDown) || (direction === 'down' && alreadyUp);

  let updateExpression: string;
  const expressionValues: Record<string, unknown> = {
    ':session': new Set([sessionId]),
  };

  if (isSwap) {
    // Swap: add to new set, remove from old set, increment new counter, decrement old counter
    if (direction === 'up') {
      updateExpression = 'ADD upSessions :session, upvotes :one DELETE downSessions :session SET downvotes = downvotes - :one';
    } else {
      updateExpression = 'ADD downSessions :session, downvotes :one DELETE upSessions :session SET upvotes = upvotes - :one';
    }
    expressionValues[':one'] = 1;
  } else {
    // Fresh vote: add to set and increment counter
    if (direction === 'up') {
      updateExpression = 'ADD upSessions :session, upvotes :one';
    } else {
      updateExpression = 'ADD downSessions :session, downvotes :one';
    }
    expressionValues[':one'] = 1;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { shareId, sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  const attrs = result.Attributes!;
  return {
    upvotes: attrs.upvotes || 0,
    downvotes: attrs.downvotes || 0,
  };
}
