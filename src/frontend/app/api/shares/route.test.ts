import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockCreateShare = vi.fn();
const mockGetShare = vi.fn();
const mockUpdateShare = vi.fn();
const mockCastVote = vi.fn();
const mockGetVotes = vi.fn();
const mockFetchPropertiesByIds = vi.fn();
const mockFindMany = vi.fn();

vi.mock('@/app/lib/dynamodb-shares', () => ({
  createShare: (...args: unknown[]) => mockCreateShare(...args),
  getShare: (...args: unknown[]) => mockGetShare(...args),
  updateShare: (...args: unknown[]) => mockUpdateShare(...args),
  castVote: (...args: unknown[]) => mockCastVote(...args),
  getVotes: (...args: unknown[]) => mockGetVotes(...args),
}));

vi.mock('@/app/lib/data', () => ({
  fetchPropertiesByIds: (...args: unknown[]) => mockFetchPropertiesByIds(...args),
}));

vi.mock('@/app/lib/prisma', () => ({
  default: {
    latest_properties_materialized: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// Import the route handlers
import { POST as createShareHandler } from './route';
import { GET as getShareHandler, PATCH as patchShareHandler } from './[shareId]/route';
import { POST as voteHandler } from './[shareId]/vote/route';
import { GET as getVotesHandler } from './[shareId]/votes/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/shares', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeGetRequest(url: string) {
  return new Request(url, { method: 'GET' });
}

describe('POST /api/shares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with shareId for valid input', async () => {
    mockFindMany.mockResolvedValueOnce([{ fct_id: 'prop1' }, { fct_id: 'prop2' }]);
    mockCreateShare.mockResolvedValueOnce('abc12345');

    const res = await createShareHandler(
      makeRequest({ propertyIds: ['prop1', 'prop2'] })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.shareId).toBe('abc12345');
    expect(json.url).toBe('/s/abc12345');
    expect(mockCreateShare).toHaveBeenCalledWith(['prop1', 'prop2']);
  });

  it('filters out invalid property IDs before creating share', async () => {
    mockFindMany.mockResolvedValueOnce([{ fct_id: 'prop1' }]);
    mockCreateShare.mockResolvedValueOnce('abc12345');

    const res = await createShareHandler(
      makeRequest({ propertyIds: ['prop1', 'nonexistent'] })
    );

    expect(res.status).toBe(201);
    expect(mockCreateShare).toHaveBeenCalledWith(['prop1']);
  });

  it('returns 400 for empty array', async () => {
    const res = await createShareHandler(
      makeRequest({ propertyIds: [] })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-array', async () => {
    const res = await createShareHandler(
      makeRequest({ propertyIds: 'not-an-array' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when no valid property IDs exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await createShareHandler(
      makeRequest({ propertyIds: ['nonexistent'] })
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/shares/[shareId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns properties and votes for valid shareId', async () => {
    const mockProperties = [{ id: 'prop1', price: 2500 }];
    const mockVotes = { prop1: { upvotes: 3, downvotes: 1 } };

    mockGetShare.mockResolvedValueOnce({
      shareId: 'abc12345',
      propertyIds: ['prop1'],
      createdAt: 1700000000,
      votes: mockVotes,
    });
    mockFetchPropertiesByIds.mockResolvedValueOnce(mockProperties);

    const res = await getShareHandler(
      makeGetRequest('http://localhost:3000/api/shares/abc12345'),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.properties).toEqual(mockProperties);
    expect(json.votes).toEqual(mockVotes);
    expect(json.totalPropertyCount).toBe(1);
  });

  it('returns 404 for nonexistent shareId', async () => {
    mockGetShare.mockResolvedValueOnce(null);

    const res = await getShareHandler(
      makeGetRequest('http://localhost:3000/api/shares/nonexistent'),
      { params: Promise.resolve({ shareId: 'nonexistent' }) }
    );
    expect(res.status).toBe(404);
  });
});

describe('POST /api/shares/[shareId]/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns updated counts for valid vote', async () => {
    mockGetShare.mockResolvedValueOnce({
      shareId: 'abc12345',
      propertyIds: ['prop1'],
      votes: {},
    });
    mockCastVote.mockResolvedValueOnce({ upvotes: 1, downvotes: 0 });

    const req = new Request('http://localhost:3000/api/shares/abc12345/vote', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: 'prop1',
        direction: 'up',
        sessionId: 'session1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await voteHandler(req, {
      params: Promise.resolve({ shareId: 'abc12345' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ upvotes: 1, downvotes: 0 });
  });

  it('returns 400 for invalid direction', async () => {
    const req = new Request('http://localhost:3000/api/shares/abc12345/vote', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: 'prop1',
        direction: 'sideways',
        sessionId: 'session1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await voteHandler(req, {
      params: Promise.resolve({ shareId: 'abc12345' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for nonexistent share', async () => {
    mockGetShare.mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/shares/abc12345/vote', {
      method: 'POST',
      body: JSON.stringify({
        propertyId: 'prop1',
        direction: 'up',
        sessionId: 'session1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await voteHandler(req, {
      params: Promise.resolve({ shareId: 'abc12345' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/shares/[shareId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makePatchRequest(shareId: string, body: unknown) {
    return new Request(`http://localhost:3000/api/shares/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns updated properties for valid sync', async () => {
    const mockProperties = [{ id: 'prop3', price: 3000 }];
    mockFindMany.mockResolvedValueOnce([{ fct_id: 'prop3' }]);
    mockUpdateShare.mockResolvedValueOnce({
      shareId: 'abc12345',
      propertyIds: ['prop3'],
      createdAt: 1700000000,
      votes: {},
    });
    mockFetchPropertiesByIds.mockResolvedValueOnce(mockProperties);

    const res = await patchShareHandler(
      makePatchRequest('abc12345', { propertyIds: ['prop3'] }),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.properties).toEqual(mockProperties);
    expect(json.totalPropertyCount).toBe(1);
  });

  it('filters out invalid property IDs', async () => {
    mockFindMany.mockResolvedValueOnce([{ fct_id: 'prop1' }]);
    mockUpdateShare.mockResolvedValueOnce({
      shareId: 'abc12345',
      propertyIds: ['prop1'],
      createdAt: 1700000000,
      votes: {},
    });
    mockFetchPropertiesByIds.mockResolvedValueOnce([{ id: 'prop1' }]);

    const res = await patchShareHandler(
      makePatchRequest('abc12345', { propertyIds: ['prop1', 'nonexistent'] }),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );

    expect(res.status).toBe(200);
    expect(mockUpdateShare).toHaveBeenCalledWith('abc12345', ['prop1']);
  });

  it('returns 400 for empty array', async () => {
    const res = await patchShareHandler(
      makePatchRequest('abc12345', { propertyIds: [] }),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when no valid property IDs exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await patchShareHandler(
      makePatchRequest('abc12345', { propertyIds: ['nonexistent'] }),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent share', async () => {
    mockFindMany.mockResolvedValueOnce([{ fct_id: 'prop1' }]);
    mockUpdateShare.mockResolvedValueOnce(null);

    const res = await patchShareHandler(
      makePatchRequest('nonexistent', { propertyIds: ['prop1'] }),
      { params: Promise.resolve({ shareId: 'nonexistent' }) }
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /api/shares/[shareId]/votes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns vote counts', async () => {
    const mockVotes = {
      prop1: { upvotes: 5, downvotes: 2, userVote: null },
    };
    mockGetVotes.mockResolvedValueOnce(mockVotes);

    const res = await getVotesHandler(
      makeGetRequest('http://localhost:3000/api/shares/abc12345/votes'),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.votes).toEqual(mockVotes);
  });

  it('passes sessionId from query params', async () => {
    mockGetVotes.mockResolvedValueOnce({});

    await getVotesHandler(
      makeGetRequest('http://localhost:3000/api/shares/abc12345/votes?sessionId=session1'),
      { params: Promise.resolve({ shareId: 'abc12345' }) }
    );

    expect(mockGetVotes).toHaveBeenCalledWith('abc12345', 'session1');
  });
});
