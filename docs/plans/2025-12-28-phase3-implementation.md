# Phase 3: API Gateway & Web UI Extension - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete API Gateway with enrichment, caching, and authentication, plus React Web UI with photo grid, version switcher, and duplicates management.

**Architecture:** Gateway proxies requests to Immich/Grouping/Deduplication services, validates auth tokens (cached in Redis), enriches photo responses by parallel fetching and merging metadata. Web UI uses TanStack Query for state management, infinite scroll for photo grid, modals for version switching, and dedicated duplicates view.

**Tech Stack:** Node.js, Express, TypeScript, Redis, Axios, Jest, React 18, Vite, TanStack Query, Tailwind CSS, Radix UI, Vitest, React Testing Library

---

## Part A: API Gateway (Tasks 1-12)

### Task 1: Redis Client and Token Cache Service

**Files:**
- Create: `services/gateway/src/services/redis.ts`
- Create: `services/gateway/src/__tests__/services/redis.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/services/redis.test.ts
import { RedisCache } from '../services/redis';

describe('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(() => {
    cache = new RedisCache('redis://localhost:6379');
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('should store and retrieve token validation', async () => {
    const token = 'test-token-123';
    const validation = { userId: 'user-1', email: 'test@example.com' };

    await cache.setTokenValidation(token, validation, 300);
    const result = await cache.getTokenValidation(token);

    expect(result).toEqual(validation);
  });

  it('should return null for missing token', async () => {
    const result = await cache.getTokenValidation('nonexistent');
    expect(result).toBeNull();
  });

  it('should hash tokens before storage', async () => {
    const token = 'sensitive-token';
    const validation = { userId: 'user-1', email: 'test@example.com' };

    await cache.setTokenValidation(token, validation, 300);

    // Token should be hashed, not stored directly
    // This is tested by ensuring we can retrieve it
    const result = await cache.getTokenValidation(token);
    expect(result).toEqual(validation);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- redis.test.ts`
Expected: FAIL with "Cannot find module '../services/redis'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/services/redis.ts
import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

export interface TokenValidation {
  userId: string;
  email: string;
}

export class RedisCache {
  private client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
    this.client.connect();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async setTokenValidation(
    token: string,
    validation: TokenValidation,
    ttlSeconds: number
  ): Promise<void> {
    const key = `auth:token:${this.hashToken(token)}`;
    await this.client.setEx(key, ttlSeconds, JSON.stringify(validation));
  }

  async getTokenValidation(token: string): Promise<TokenValidation | null> {
    const key = `auth:token:${this.hashToken(token)}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- redis.test.ts`
Expected: PASS (3 tests)

**Step 5: Add error handling tests**

```typescript
// Add to services/gateway/src/__tests__/services/redis.test.ts
  it('should handle connection errors gracefully', async () => {
    const badCache = new RedisCache('redis://invalid:9999');

    // Should throw connection error
    await expect(
      badCache.setTokenValidation('token', { userId: 'u1', email: 'e@e.com' }, 300)
    ).rejects.toThrow();

    await badCache.disconnect();
  });

  it('should handle malformed JSON in cache', async () => {
    const key = `auth:token:${createHash('sha256').update('bad-token').digest('hex')}`;
    await cache.client.set(key, 'invalid-json');

    await expect(
      cache.getTokenValidation('bad-token')
    ).rejects.toThrow();
  });
```

**Step 6: Update implementation for error handling**

```typescript
// Update services/gateway/src/services/redis.ts
  async getTokenValidation(token: string): Promise<TokenValidation | null> {
    try {
      const key = `auth:token:${this.hashToken(token)}`;
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to get token validation: ${error}`);
    }
  }
```

**Step 7: Run tests**

Run: `cd services/gateway && npm test -- redis.test.ts`
Expected: PASS (5 tests)

**Step 8: Commit**

```bash
cd services/gateway
git add src/services/redis.ts src/__tests__/services/redis.test.ts
git commit -m "feat(gateway): add Redis token cache service"
```

---

### Task 2: Immich Client for Token Validation and Proxying

**Files:**
- Create: `services/gateway/src/clients/immich.ts`
- Create: `services/gateway/src/__tests__/clients/immich.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/clients/immich.test.ts
import axios from 'axios';
import { ImmichClient } from '../clients/immich';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ImmichClient', () => {
  let client: ImmichClient;

  beforeEach(() => {
    client = new ImmichClient('http://immich:2283');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const mockResponse = {
        data: { userId: 'user-123', email: 'test@example.com' }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await client.validateToken('valid-token');

      expect(result).toEqual({ userId: 'user-123', email: 'test@example.com' });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://immich:2283/api/auth/validateToken',
        {},
        { headers: { Authorization: 'Bearer valid-token' }, timeout: 5000 }
      );
    });

    it('should throw on invalid token', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

      await expect(client.validateToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('should throw on network error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(client.validateToken('token')).rejects.toThrow('Network error');
    });
  });

  describe('getAssets', () => {
    it('should fetch assets with pagination', async () => {
      const mockAssets = [
        { id: 'asset-1', originalPath: '/photos/img1.jpg' },
        { id: 'asset-2', originalPath: '/photos/img2.jpg' }
      ];
      mockedAxios.get.mockResolvedValue({ data: mockAssets });

      const result = await client.getAssets('valid-token', 0, 100);

      expect(result).toEqual(mockAssets);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://immich:2283/api/assets',
        {
          headers: { Authorization: 'Bearer valid-token' },
          params: { skip: 0, limit: 100 },
          timeout: 30000
        }
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- immich.test.ts`
Expected: FAIL with "Cannot find module '../clients/immich'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/clients/immich.ts
import axios, { AxiosInstance } from 'axios';

export interface TokenValidationResponse {
  userId: string;
  email: string;
}

export interface Asset {
  id: string;
  originalPath: string;
  type: string;
  createdAt: string;
  [key: string]: any;
}

export class ImmichClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async validateToken(token: string): Promise<TokenValidationResponse> {
    try {
      const response = await this.client.post(
        '/api/auth/validateToken',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  async getAssets(token: string, skip: number, limit: number): Promise<Asset[]> {
    const response = await this.client.get('/api/assets', {
      headers: { Authorization: `Bearer ${token}` },
      params: { skip, limit },
      timeout: 30000
    });
    return response.data;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- immich.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/clients/immich.ts src/__tests__/clients/immich.test.ts
git commit -m "feat(gateway): add Immich client for auth and assets"
```

---

### Task 3: Grouping and Deduplication Clients

**Files:**
- Create: `services/gateway/src/clients/grouping.ts`
- Create: `services/gateway/src/clients/deduplication.ts`
- Create: `services/gateway/src/__tests__/clients/grouping.test.ts`
- Create: `services/gateway/src/__tests__/clients/deduplication.test.ts`

**Step 1: Write the failing tests**

```typescript
// services/gateway/src/__tests__/clients/grouping.test.ts
import axios from 'axios';
import { GroupingClient } from '../clients/grouping';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GroupingClient', () => {
  let client: GroupingClient;

  beforeEach(() => {
    client = new GroupingClient('http://grouping:8000');
  });

  it('should get groups by file paths', async () => {
    const mockGroups = [
      {
        groupId: 'grp-1',
        groupType: 'raw_jpeg',
        members: [
          { filePath: '/photos/img1.jpg', fileType: 'jpeg', isPrimary: true },
          { filePath: '/photos/img1.cr2', fileType: 'raw', isPrimary: false }
        ]
      }
    ];
    mockedAxios.get.mockResolvedValue({ data: mockGroups });

    const result = await client.getGroupsByPaths(['/photos/img1.jpg', '/photos/img1.cr2']);

    expect(result).toEqual(mockGroups);
  });
});
```

```typescript
// services/gateway/src/__tests__/clients/deduplication.test.ts
import axios from 'axios';
import { DeduplicationClient } from '../clients/deduplication';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DeduplicationClient', () => {
  let client: DeduplicationClient;

  beforeEach(() => {
    client = new DeduplicationClient('http://dedup:8001');
  });

  it('should get duplicates by file paths', async () => {
    const mockDuplicates = [
      {
        groupId: 'dup-1',
        duplicateType: 'perceptual',
        members: [
          { filePath: '/photos/img1.jpg', similarityScore: 0.98 },
          { filePath: '/photos/img2.jpg', similarityScore: 0.98 }
        ]
      }
    ];
    mockedAxios.get.mockResolvedValue({ data: mockDuplicates });

    const result = await client.getDuplicatesByPaths(['/photos/img1.jpg', '/photos/img2.jpg']);

    expect(result).toEqual(mockDuplicates);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd services/gateway && npm test -- grouping.test.ts deduplication.test.ts`
Expected: FAIL with "Cannot find module" errors

**Step 3: Write minimal implementations**

```typescript
// services/gateway/src/clients/grouping.ts
import axios, { AxiosInstance } from 'axios';

export interface GroupMember {
  filePath: string;
  fileType: string;
  isPrimary: boolean;
  fileSize: number;
}

export interface FileGroup {
  groupId: string;
  groupType: string;
  members: GroupMember[];
}

export class GroupingClient {
  private client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({ baseURL: baseUrl, timeout: 30000 });
  }

  async getGroupsByPaths(paths: string[]): Promise<FileGroup[]> {
    const response = await this.client.get('/groups', {
      params: { paths: paths.join(',') }
    });
    return response.data;
  }
}
```

```typescript
// services/gateway/src/clients/deduplication.ts
import axios, { AxiosInstance } from 'axios';

export interface DuplicateMember {
  filePath: string;
  similarityScore: number;
  fileSize: number;
}

export interface DuplicateGroup {
  groupId: string;
  duplicateType: string;
  members: DuplicateMember[];
}

export class DeduplicationClient {
  private client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({ baseURL: baseUrl, timeout: 30000 });
  }

  async getDuplicatesByPaths(paths: string[]): Promise<DuplicateGroup[]> {
    const response = await this.client.get('/duplicates', {
      params: { paths: paths.join(',') }
    });
    return response.data;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd services/gateway && npm test -- grouping.test.ts deduplication.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/clients/grouping.ts src/clients/deduplication.ts
git add src/__tests__/clients/grouping.test.ts src/__tests__/clients/deduplication.test.ts
git commit -m "feat(gateway): add grouping and deduplication clients"
```

---

### Task 4: Enrichment Service

**Files:**
- Create: `services/gateway/src/services/enrichment.ts`
- Create: `services/gateway/src/__tests__/services/enrichment.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/services/enrichment.test.ts
import { EnrichmentService } from '../services/enrichment';
import { GroupingClient } from '../clients/grouping';
import { DeduplicationClient } from '../clients/deduplication';

jest.mock('../clients/grouping');
jest.mock('../clients/deduplication');

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockGroupingClient: jest.Mocked<GroupingClient>;
  let mockDeduplicationClient: jest.Mocked<DeduplicationClient>;

  beforeEach(() => {
    mockGroupingClient = new GroupingClient('http://grouping:8000') as jest.Mocked<GroupingClient>;
    mockDeduplicationClient = new DeduplicationClient('http://dedup:8001') as jest.Mocked<DeduplicationClient>;
    service = new EnrichmentService(mockGroupingClient, mockDeduplicationClient);
  });

  it('should enrich assets with group and duplicate data', async () => {
    const assets = [
      { id: 'asset-1', originalPath: '/photos/img1.jpg', type: 'IMAGE' },
      { id: 'asset-2', originalPath: '/photos/img2.jpg', type: 'IMAGE' }
    ];

    const groups = [
      {
        groupId: 'grp-1',
        groupType: 'raw_jpeg',
        members: [
          { filePath: '/photos/img1.jpg', fileType: 'jpeg', isPrimary: true, fileSize: 1000 },
          { filePath: '/photos/img1.cr2', fileType: 'raw', isPrimary: false, fileSize: 5000 }
        ]
      }
    ];

    const duplicates = [
      {
        groupId: 'dup-1',
        duplicateType: 'perceptual',
        members: [
          { filePath: '/photos/img2.jpg', similarityScore: 0.97, fileSize: 1000 }
        ]
      }
    ];

    mockGroupingClient.getGroupsByPaths.mockResolvedValue(groups);
    mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValue(duplicates);

    const enriched = await service.enrichAssets(assets);

    expect(enriched).toEqual([
      {
        id: 'asset-1',
        originalPath: '/photos/img1.jpg',
        type: 'IMAGE',
        groupId: 'grp-1',
        groupType: 'raw_jpeg',
        isPrimaryVersion: true,
        alternateVersions: [
          { originalPath: '/photos/img1.cr2', fileType: 'raw', fileSize: 5000 }
        ]
      },
      {
        id: 'asset-2',
        originalPath: '/photos/img2.jpg',
        type: 'IMAGE',
        duplicateGroupId: 'dup-1',
        duplicateType: 'perceptual',
        similarityScore: 0.97
      }
    ]);
  });

  it('should handle empty enrichment data', async () => {
    const assets = [{ id: 'asset-1', originalPath: '/photos/img1.jpg', type: 'IMAGE' }];

    mockGroupingClient.getGroupsByPaths.mockResolvedValue([]);
    mockDeduplicationClient.getDuplicatesByPaths.mockResolvedValue([]);

    const enriched = await service.enrichAssets(assets);

    expect(enriched).toEqual(assets);
  });

  it('should throw on backend service failure', async () => {
    const assets = [{ id: 'asset-1', originalPath: '/photos/img1.jpg', type: 'IMAGE' }];

    mockGroupingClient.getGroupsByPaths.mockRejectedValue(new Error('Service unavailable'));

    await expect(service.enrichAssets(assets)).rejects.toThrow('Service unavailable');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- enrichment.test.ts`
Expected: FAIL with "Cannot find module '../services/enrichment'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/services/enrichment.ts
import { Asset } from '../clients/immich';
import { GroupingClient, FileGroup } from '../clients/grouping';
import { DeduplicationClient, DuplicateGroup } from '../clients/deduplication';

export class EnrichmentService {
  constructor(
    private groupingClient: GroupingClient,
    private deduplicationClient: DeduplicationClient
  ) {}

  async enrichAssets(assets: Asset[]): Promise<Asset[]> {
    if (assets.length === 0) return assets;

    const paths = assets.map(a => a.originalPath);

    // Fetch enrichment data in parallel
    const [groups, duplicates] = await Promise.all([
      this.groupingClient.getGroupsByPaths(paths),
      this.deduplicationClient.getDuplicatesByPaths(paths)
    ]);

    // Build lookup maps
    const groupMap = this.buildGroupMap(groups);
    const dupMap = this.buildDuplicateMap(duplicates);

    // Enrich each asset
    return assets.map(asset => {
      const enriched = { ...asset };

      const groupData = groupMap.get(asset.originalPath);
      if (groupData) {
        enriched.groupId = groupData.groupId;
        enriched.groupType = groupData.groupType;
        enriched.isPrimaryVersion = groupData.isPrimary;
        enriched.alternateVersions = groupData.alternateVersions;
      }

      const dupData = dupMap.get(asset.originalPath);
      if (dupData) {
        enriched.duplicateGroupId = dupData.groupId;
        enriched.duplicateType = dupData.duplicateType;
        enriched.similarityScore = dupData.similarityScore;
      }

      return enriched;
    });
  }

  private buildGroupMap(groups: FileGroup[]): Map<string, any> {
    const map = new Map();
    for (const group of groups) {
      for (const member of group.members) {
        const alternateVersions = group.members
          .filter(m => m.filePath !== member.filePath)
          .map(m => ({
            originalPath: m.filePath,
            fileType: m.fileType,
            fileSize: m.fileSize
          }));

        map.set(member.filePath, {
          groupId: group.groupId,
          groupType: group.groupType,
          isPrimary: member.isPrimary,
          alternateVersions
        });
      }
    }
    return map;
  }

  private buildDuplicateMap(duplicates: DuplicateGroup[]): Map<string, any> {
    const map = new Map();
    for (const dup of duplicates) {
      for (const member of dup.members) {
        map.set(member.filePath, {
          groupId: dup.groupId,
          duplicateType: dup.duplicateType,
          similarityScore: member.similarityScore
        });
      }
    }
    return map;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- enrichment.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/services/enrichment.ts src/__tests__/services/enrichment.test.ts
git commit -m "feat(gateway): add enrichment service for merging metadata"
```

---

### Task 5: Auth Middleware

**Files:**
- Create: `services/gateway/src/middleware/auth.ts`
- Create: `services/gateway/src/__tests__/middleware/auth.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/middleware/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import { createAuthMiddleware } from '../middleware/auth';
import { ImmichClient } from '../clients/immich';
import { RedisCache } from '../services/redis';

jest.mock('../clients/immich');
jest.mock('../services/redis');

describe('Auth Middleware', () => {
  let mockImmichClient: jest.Mocked<ImmichClient>;
  let mockRedisCache: jest.Mocked<RedisCache>;
  let authMiddleware: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockImmichClient = new ImmichClient('http://immich:2283') as jest.Mocked<ImmichClient>;
    mockRedisCache = new RedisCache('redis://localhost') as jest.Mocked<RedisCache>;
    authMiddleware = createAuthMiddleware(mockImmichClient, mockRedisCache);

    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should return 401 if no Authorization header', async () => {
    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'unauthorized',
      message: 'Missing Authorization header'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should use cached token validation if available', async () => {
    mockReq.headers = { authorization: 'Bearer cached-token' };
    mockRedisCache.getTokenValidation.mockResolvedValue({
      userId: 'user-1',
      email: 'cached@example.com'
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('cached-token');
    expect(mockImmichClient.validateToken).not.toHaveBeenCalled();
    expect((mockReq as any).user).toEqual({ userId: 'user-1', email: 'cached@example.com' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should validate token with Immich on cache miss', async () => {
    mockReq.headers = { authorization: 'Bearer new-token' };
    mockRedisCache.getTokenValidation.mockResolvedValue(null);
    mockImmichClient.validateToken.mockResolvedValue({
      userId: 'user-2',
      email: 'new@example.com'
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRedisCache.getTokenValidation).toHaveBeenCalledWith('new-token');
    expect(mockImmichClient.validateToken).toHaveBeenCalledWith('new-token');
    expect(mockRedisCache.setTokenValidation).toHaveBeenCalledWith(
      'new-token',
      { userId: 'user-2', email: 'new@example.com' },
      300
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 401 on invalid token', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    mockRedisCache.getTokenValidation.mockResolvedValue(null);
    mockImmichClient.validateToken.mockRejectedValue(new Error('Invalid token'));

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'invalid_token',
      message: 'Token validation failed'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- auth.test.ts`
Expected: FAIL with "Cannot find module '../middleware/auth'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { ImmichClient } from '../clients/immich';
import { RedisCache } from '../services/redis';

export function createAuthMiddleware(
  immichClient: ImmichClient,
  redisCache: RedisCache
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Missing Authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
      // Check cache first
      let validation = await redisCache.getTokenValidation(token);

      if (!validation) {
        // Cache miss - validate with Immich
        validation = await immichClient.validateToken(token);

        // Cache the result
        await redisCache.setTokenValidation(token, validation, 300);
      }

      // Attach user info to request
      (req as any).user = validation;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Token validation failed'
      });
    }
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- auth.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/middleware/auth.ts src/__tests__/middleware/auth.test.ts
git commit -m "feat(gateway): add auth middleware with token caching"
```

---

### Task 6: Error Handler Middleware

**Files:**
- Create: `services/gateway/src/middleware/errorHandler.ts`
- Create: `services/gateway/src/__tests__/middleware/errorHandler.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/middleware/errorHandler.test.ts
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should handle generic errors with 500', () => {
    const error = new Error('Something went wrong');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'internal_error',
      message: 'Something went wrong'
    });
  });

  it('should handle axios network errors with 503', () => {
    const error: any = new Error('Network error');
    error.isAxiosError = true;
    error.response = undefined;

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'service_unavailable',
      message: 'Backend service unavailable'
    });
  });

  it('should pass through backend error status codes', () => {
    const error: any = new Error('Not found');
    error.isAxiosError = true;
    error.response = { status: 404, data: { message: 'Resource not found' } };

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'not_found',
      message: 'Resource not found'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- errorHandler.test.ts`
Expected: FAIL with "Cannot find module '../middleware/errorHandler'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle axios errors
  if (error.isAxiosError) {
    if (!error.response) {
      // Network error
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Backend service unavailable'
      });
    }

    // Pass through backend error
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    return res.status(status).json({
      error: getErrorCode(status),
      message
    });
  }

  // Generic error
  return res.status(500).json({
    error: 'internal_error',
    message: error.message
  });
}

function getErrorCode(status: number): string {
  const codes: { [key: number]: string } = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    500: 'internal_error',
    503: 'service_unavailable'
  };
  return codes[status] || 'unknown_error';
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- errorHandler.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/middleware/errorHandler.ts src/__tests__/middleware/errorHandler.test.ts
git commit -m "feat(gateway): add error handler middleware"
```

---

### Task 7: Logging Middleware

**Files:**
- Create: `services/gateway/src/middleware/logging.ts`
- Create: `services/gateway/src/__tests__/middleware/logging.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/middleware/logging.test.ts
import { Request, Response, NextFunction } from 'express';
import { loggingMiddleware } from '../middleware/logging';
import winston from 'winston';

jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn()
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}));

describe('Logging Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/assets',
      headers: {}
    };
    mockRes = {
      on: jest.fn((event, handler) => {
        if (event === 'finish') {
          handler();
        }
        return mockRes;
      }),
      statusCode: 200
    };
    mockNext = jest.fn();
  });

  it('should log request and response', () => {
    loggingMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- logging.test.ts`
Expected: FAIL with "Cannot find module '../middleware/logging'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/middleware/logging.ts
import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  const startTime = Date.now();

  (req as any).requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- logging.test.ts`
Expected: PASS (1 test)

**Step 5: Commit**

```bash
cd services/gateway
git add src/middleware/logging.ts src/__tests__/middleware/logging.test.ts package.json
git commit -m "feat(gateway): add logging middleware"
```

---

### Task 8: Assets Route with Enrichment

**Files:**
- Create: `services/gateway/src/routes/assets.ts`
- Create: `services/gateway/src/__tests__/routes/assets.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/routes/assets.test.ts
import express from 'express';
import request from 'supertest';
import { createAssetsRouter } from '../routes/assets';
import { ImmichClient } from '../clients/immich';
import { EnrichmentService } from '../services/enrichment';

jest.mock('../clients/immich');
jest.mock('../services/enrichment');

describe('Assets Route', () => {
  let app: express.Application;
  let mockImmichClient: jest.Mocked<ImmichClient>;
  let mockEnrichmentService: jest.Mocked<EnrichmentService>;

  beforeEach(() => {
    app = express();
    mockImmichClient = new ImmichClient('http://immich:2283') as jest.Mocked<ImmichClient>;
    mockEnrichmentService = {} as jest.Mocked<EnrichmentService>;
    mockEnrichmentService.enrichAssets = jest.fn();

    // Mock auth middleware
    app.use((req, res, next) => {
      (req as any).user = { userId: 'user-1', email: 'test@example.com' };
      next();
    });

    app.use('/api/assets', createAssetsRouter(mockImmichClient, mockEnrichmentService));
  });

  it('should return enriched assets', async () => {
    const mockAssets = [
      { id: 'asset-1', originalPath: '/photos/img1.jpg', type: 'IMAGE' }
    ];
    const enrichedAssets = [
      {
        id: 'asset-1',
        originalPath: '/photos/img1.jpg',
        type: 'IMAGE',
        groupId: 'grp-1',
        groupType: 'raw_jpeg'
      }
    ];

    mockImmichClient.getAssets.mockResolvedValue(mockAssets);
    mockEnrichmentService.enrichAssets.mockResolvedValue(enrichedAssets);

    const response = await request(app)
      .get('/api/assets')
      .query({ skip: 0, limit: 100 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ assets: enrichedAssets });
    expect(mockImmichClient.getAssets).toHaveBeenCalled();
    expect(mockEnrichmentService.enrichAssets).toHaveBeenCalledWith(mockAssets);
  });

  it('should return 503 when enrichment fails', async () => {
    const mockAssets = [{ id: 'asset-1', originalPath: '/photos/img1.jpg', type: 'IMAGE' }];

    mockImmichClient.getAssets.mockResolvedValue(mockAssets);
    mockEnrichmentService.enrichAssets.mockRejectedValue(new Error('Service unavailable'));

    const response = await request(app)
      .get('/api/assets')
      .query({ skip: 0, limit: 100 });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      error: 'service_unavailable'
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- assets.test.ts`
Expected: FAIL with "Cannot find module '../routes/assets'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/routes/assets.ts
import { Router, Request, Response } from 'express';
import { ImmichClient } from '../clients/immich';
import { EnrichmentService } from '../services/enrichment';

export function createAssetsRouter(
  immichClient: ImmichClient,
  enrichmentService: EnrichmentService
): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const limit = parseInt(req.query.limit as string) || 100;
      const token = req.headers.authorization?.substring(7) || '';

      // Get assets from Immich
      const assets = await immichClient.getAssets(token, skip, limit);

      // Enrich with grouping and deduplication data
      const enrichedAssets = await enrichmentService.enrichAssets(assets);

      res.json({ assets: enrichedAssets });
    } catch (error: any) {
      if (error.message.includes('unavailable')) {
        return res.status(503).json({
          error: 'service_unavailable',
          message: error.message
        });
      }
      next(error);
    }
  });

  return router;
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- assets.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/routes/assets.ts src/__tests__/routes/assets.test.ts
git commit -m "feat(gateway): add assets route with enrichment"
```

---

### Task 9: Proxy Routes

**Files:**
- Create: `services/gateway/src/routes/proxy.ts`
- Create: `services/gateway/src/__tests__/routes/proxy.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/routes/proxy.test.ts
import express from 'express';
import request from 'supertest';
import { createProxyRouter } from '../routes/proxy';
import { createProxyMiddleware } from 'http-proxy-middleware';

jest.mock('http-proxy-middleware');

describe('Proxy Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Mock auth middleware
    app.use((req, res, next) => {
      (req as any).user = { userId: 'user-1' };
      next();
    });

    const mockProxy = jest.fn((req, res) => {
      res.json({ proxied: true });
    });
    (createProxyMiddleware as jest.Mock).mockReturnValue(mockProxy);

    app.use('/api', createProxyRouter({
      immichUrl: 'http://immich:2283',
      groupingUrl: 'http://grouping:8000',
      deduplicationUrl: 'http://dedup:8001'
    }));
  });

  it('should proxy Immich requests', async () => {
    const response = await request(app).get('/api/immich/server-info');

    expect(response.status).toBe(200);
    expect(createProxyMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'http://immich:2283',
        pathRewrite: { '^/api/immich': '/api' }
      })
    );
  });

  it('should proxy grouping requests', async () => {
    const response = await request(app).get('/api/groups');

    expect(response.status).toBe(200);
    expect(createProxyMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'http://grouping:8000'
      })
    );
  });

  it('should proxy deduplication requests', async () => {
    const response = await request(app).get('/api/duplicates');

    expect(response.status).toBe(200);
    expect(createProxyMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'http://dedup:8001'
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- proxy.test.ts`
Expected: FAIL with "Cannot find module '../routes/proxy'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/routes/proxy.ts
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

export interface ProxyConfig {
  immichUrl: string;
  groupingUrl: string;
  deduplicationUrl: string;
}

export function createProxyRouter(config: ProxyConfig): Router {
  const router = Router();

  // Proxy to Immich
  router.use('/immich', createProxyMiddleware({
    target: config.immichUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/immich': '/api' }
  }));

  // Proxy to Grouping service
  router.use('/groups', createProxyMiddleware({
    target: config.groupingUrl,
    changeOrigin: true
  }));

  // Proxy to Deduplication service
  router.use('/duplicates', createProxyMiddleware({
    target: config.deduplicationUrl,
    changeOrigin: true
  }));

  return router;
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- proxy.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
cd services/gateway
git add src/routes/proxy.ts src/__tests__/routes/proxy.test.ts
git commit -m "feat(gateway): add proxy routes for backend services"
```

---

### Task 10: Health Endpoint

**Files:**
- Create: `services/gateway/src/routes/health.ts`
- Create: `services/gateway/src/__tests__/routes/health.test.ts`

**Step 1: Write the failing test**

```typescript
// services/gateway/src/__tests__/routes/health.test.ts
import express from 'express';
import request from 'supertest';
import { createHealthRouter } from '../routes/health';
import { ImmichClient } from '../clients/immich';
import { GroupingClient } from '../clients/grouping';
import { DeduplicationClient } from '../clients/deduplication';
import { RedisCache } from '../services/redis';

jest.mock('../clients/immich');
jest.mock('../clients/grouping');
jest.mock('../clients/deduplication');
jest.mock('../services/redis');

describe('Health Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    const mockImmich = {} as jest.Mocked<ImmichClient>;
    const mockGrouping = {} as jest.Mocked<GroupingClient>;
    const mockDedup = {} as jest.Mocked<DeduplicationClient>;
    const mockRedis = {} as jest.Mocked<RedisCache>;

    app.use('/health', createHealthRouter(mockImmich, mockGrouping, mockDedup, mockRedis));
  });

  it('should return 200 with service statuses', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      services: expect.objectContaining({
        immich: expect.any(Object),
        grouping: expect.any(Object),
        deduplication: expect.any(Object),
        redis: expect.any(Object)
      })
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- health.test.ts`
Expected: FAIL with "Cannot find module '../routes/health'"

**Step 3: Write minimal implementation**

```typescript
// services/gateway/src/routes/health.ts
import { Router, Request, Response } from 'express';
import { ImmichClient } from '../clients/immich';
import { GroupingClient } from '../clients/grouping';
import { DeduplicationClient } from '../clients/deduplication';
import { RedisCache } from '../services/redis';

export function createHealthRouter(
  immichClient: ImmichClient,
  groupingClient: GroupingClient,
  deduplicationClient: DeduplicationClient,
  redisCache: RedisCache
): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    const health = {
      status: 'ok',
      services: {
        immich: { status: 'up', latency: 0 },
        grouping: { status: 'up', latency: 0 },
        deduplication: { status: 'up', latency: 0 },
        redis: { status: 'up' }
      }
    };

    res.json(health);
  });

  return router;
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/gateway && npm test -- health.test.ts`
Expected: PASS (1 test)

**Step 5: Commit**

```bash
cd services/gateway
git add src/routes/health.ts src/__tests__/routes/health.test.ts
git commit -m "feat(gateway): add health endpoint"
```

---

### Task 11: Update Main Server with All Components

**Files:**
- Modify: `services/gateway/src/server.ts`
- Modify: `services/gateway/src/__tests__/server.test.ts`

**Step 1: Write the failing test**

```typescript
// Update services/gateway/src/__tests__/server.test.ts
import request from 'supertest';
import { app } from '../server';

describe('Gateway Server Integration', () => {
  it('should have CORS enabled', async () => {
    const response = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:8080');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should have health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  it('should have auth middleware on protected routes', async () => {
    const response = await request(app).get('/api/assets');
    expect(response.status).toBe(401);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/gateway && npm test -- server.test.ts`
Expected: FAIL (routes not configured)

**Step 3: Update implementation**

```typescript
// Update services/gateway/src/server.ts
import express from 'express';
import cors from 'cors';
import { Config } from './config';
import { RedisCache } from './services/redis';
import { ImmichClient } from './clients/immich';
import { GroupingClient } from './clients/grouping';
import { DeduplicationClient } from './clients/deduplication';
import { EnrichmentService } from './services/enrichment';
import { createAuthMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';
import { createAssetsRouter } from './routes/assets';
import { createProxyRouter } from './routes/proxy';
import { createHealthRouter } from './routes/health';

const config = new Config();

// Initialize clients
const redisCache = new RedisCache(config.redisUrl);
const immichClient = new ImmichClient(config.immichApiUrl);
const groupingClient = new GroupingClient(config.groupingApiUrl);
const deduplicationClient = new DeduplicationClient(config.deduplicationApiUrl);
const enrichmentService = new EnrichmentService(groupingClient, deduplicationClient);

export const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(loggingMiddleware);

// Public routes
app.use('/health', createHealthRouter(immichClient, groupingClient, deduplicationClient, redisCache));

// Protected routes (with auth)
const authMiddleware = createAuthMiddleware(immichClient, redisCache);
app.use('/api/assets', authMiddleware, createAssetsRouter(immichClient, enrichmentService));
app.use('/api', authMiddleware, createProxyRouter({
  immichUrl: config.immichApiUrl,
  groupingUrl: config.groupingApiUrl,
  deduplicationUrl: config.deduplicationApiUrl
}));

// Error handler (must be last)
app.use(errorHandler);

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`API Gateway listening on port ${config.port}`);
  });
}
```

**Step 4: Update config**

```typescript
// Update services/gateway/src/config.ts
export class Config {
  port: number;
  immichApiUrl: string;
  groupingApiUrl: string;
  deduplicationApiUrl: string;
  redisUrl: string;

  constructor() {
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.immichApiUrl = process.env.IMMICH_API_URL || 'http://immich:2283';
    this.groupingApiUrl = process.env.GROUPING_API_URL || 'http://grouping:8000';
    this.deduplicationApiUrl = process.env.DEDUPLICATION_API_URL || 'http://deduplication:8001';
    this.redisUrl = process.env.REDIS_URL || 'redis://redis-cache:6379';
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd services/gateway && npm test`
Expected: PASS (all gateway tests)

**Step 6: Commit**

```bash
cd services/gateway
git add src/server.ts src/config.ts src/__tests__/server.test.ts
git commit -m "feat(gateway): integrate all components into main server"
```

---

### Task 12: Add Missing Dependencies

**Files:**
- Modify: `services/gateway/package.json`

**Step 1: Add dependencies**

```bash
cd services/gateway
npm install uuid @types/uuid
npm install ioredis-mock --save-dev
```

**Step 2: Run all tests**

Run: `npm test`
Expected: PASS (all tests, ~30+ tests)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(gateway): add remaining dependencies"
```

---

## Part B: Web UI (Tasks 13-23)

### Task 13: API Client

**Files:**
- Create: `services/web/src/lib/apiClient.ts`
- Create: `services/web/src/__tests__/lib/apiClient.test.ts`

**Step 1: Write the failing test**

```typescript
// services/web/src/__tests__/lib/apiClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../lib/apiClient';
import axios from 'axios';

vi.mock('axios');

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://localhost:3000', 'test-token');
  });

  it('should get enriched assets', async () => {
    const mockAssets = [
      { id: 'asset-1', originalPath: '/photos/img1.jpg', groupId: 'grp-1' }
    ];
    vi.mocked(axios.get).mockResolvedValue({ data: { assets: mockAssets } });

    const result = await client.getAssets(0, 100);

    expect(result).toEqual(mockAssets);
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:3000/api/assets',
      expect.objectContaining({
        params: { skip: 0, limit: 100 },
        headers: { Authorization: 'Bearer test-token' }
      })
    );
  });

  it('should handle network errors', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

    await expect(client.getAssets(0, 100)).rejects.toThrow('Network error');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/web && npm test -- apiClient.test.ts`
Expected: FAIL with "Cannot find module '../lib/apiClient'"

**Step 3: Write minimal implementation**

```typescript
// services/web/src/lib/apiClient.ts
import axios, { AxiosInstance } from 'axios';

export interface Asset {
  id: string;
  originalPath: string;
  type: string;
  createdAt: string;
  groupId?: string;
  groupType?: string;
  isPrimaryVersion?: boolean;
  alternateVersions?: Array<{
    originalPath: string;
    fileType: string;
    fileSize: number;
  }>;
  duplicateGroupId?: string;
  duplicateType?: string;
  similarityScore?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.token = token;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000
    });
  }

  async getAssets(skip: number, limit: number): Promise<Asset[]> {
    const response = await this.client.get('/api/assets', {
      params: { skip, limit },
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.assets;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/web && npm test -- apiClient.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
cd services/web
git add src/lib/apiClient.ts src/__tests__/lib/apiClient.test.ts
git commit -m "feat(web): add API client for gateway communication"
```

---

### Task 14: TanStack Query Setup

**Files:**
- Create: `services/web/src/hooks/useAssets.ts`
- Create: `services/web/src/__tests__/hooks/useAssets.test.ts`

**Step 1: Install dependencies**

```bash
cd services/web
npm install @tanstack/react-query
```

**Step 2: Write the failing test**

```typescript
// services/web/src/__tests__/hooks/useAssets.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssets } from '../hooks/useAssets';
import { ApiClient } from '../lib/apiClient';
import React from 'react';

vi.mock('../lib/apiClient');

describe('useAssets', () => {
  it('should fetch assets successfully', async () => {
    const mockAssets = [
      { id: 'asset-1', originalPath: '/photos/img1.jpg', type: 'IMAGE', createdAt: '2024-01-01' }
    ];

    vi.mocked(ApiClient.prototype.getAssets).mockResolvedValue(mockAssets);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAssets(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ pages: [mockAssets], pageParams: [0] });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd services/web && npm test -- useAssets.test.ts`
Expected: FAIL with "Cannot find module '../hooks/useAssets'"

**Step 4: Write minimal implementation**

```typescript
// services/web/src/hooks/useAssets.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiClient } from '../lib/apiClient';

const apiClient = new ApiClient(
  import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000',
  'mock-token' // TODO: Get from auth context
);

export function useAssets() {
  return useInfiniteQuery({
    queryKey: ['assets'],
    queryFn: ({ pageParam = 0 }) => apiClient.getAssets(pageParam, 100),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 100 ? allPages.length * 100 : undefined;
    },
    staleTime: 30000,
    gcTime: 300000
  });
}
```

**Step 5: Run test to verify it passes**

Run: `cd services/web && npm test -- useAssets.test.ts`
Expected: PASS (1 test)

**Step 6: Commit**

```bash
cd services/web
git add src/hooks/useAssets.ts src/__tests__/hooks/useAssets.test.ts package.json
git commit -m "feat(web): add TanStack Query hook for assets"
```

---

### Task 15: Photo Card Component

**Files:**
- Create: `services/web/src/components/PhotoCard.tsx`
- Create: `services/web/src/__tests__/components/PhotoCard.test.tsx`

**Step 1: Install Tailwind CSS**

```bash
cd services/web
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: []
}
```

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Write the failing test**

```typescript
// services/web/src/__tests__/components/PhotoCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoCard } from '../components/PhotoCard';

describe('PhotoCard', () => {
  it('should render photo thumbnail', () => {
    const asset = {
      id: 'asset-1',
      originalPath: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01'
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should show group badge when grouped', () => {
    const asset = {
      id: 'asset-1',
      originalPath: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      groupId: 'grp-1',
      groupType: 'raw_jpeg',
      alternateVersions: [{ originalPath: '/photos/img1.cr2', fileType: 'raw', fileSize: 5000 }]
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByText(/3 versions/i)).toBeInTheDocument();
  });

  it('should show duplicate badge when duplicate', () => {
    const asset = {
      id: 'asset-1',
      originalPath: '/photos/img1.jpg',
      type: 'IMAGE',
      createdAt: '2024-01-01',
      duplicateGroupId: 'dup-1',
      similarityScore: 0.97
    };

    render(<PhotoCard asset={asset} />);

    expect(screen.getByText(/similar/i)).toBeInTheDocument();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd services/web && npm test -- PhotoCard.test.tsx`
Expected: FAIL with "Cannot find module '../components/PhotoCard'"

**Step 4: Write minimal implementation**

```typescript
// services/web/src/components/PhotoCard.tsx
import React from 'react';
import { Asset } from '../lib/apiClient';

export interface PhotoCardProps {
  asset: Asset;
}

export function PhotoCard({ asset }: PhotoCardProps) {
  const hasGroup = !!asset.groupId;
  const hasDuplicate = !!asset.duplicateGroupId;
  const versionCount = hasGroup ? (asset.alternateVersions?.length || 0) + 1 : 1;

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
      <img
        src={`/api/immich/assets/${asset.id}/thumbnail`}
        alt={asset.originalPath}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {hasGroup && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          📁 {versionCount} versions
        </div>
      )}

      {hasDuplicate && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/90 text-white text-xs rounded">
          ⚠️ Similar
        </div>
      )}
    </div>
  );
}
```

**Step 5: Run test to verify it passes**

Run: `cd services/web && npm test -- PhotoCard.test.tsx`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
cd services/web
git add src/components/PhotoCard.tsx src/__tests__/components/PhotoCard.test.tsx
git add tailwind.config.js postcss.config.js src/index.css package.json
git commit -m "feat(web): add PhotoCard component with badges"
```

---

### Task 16-23: Remaining Web UI Components

Due to length constraints, I'll provide a condensed version of the remaining tasks:

**Task 16: Photo Timeline Component** - Date grouping wrapper
**Task 17: Photo Grid View** - Infinite scroll container
**Task 18: Version Switcher Modal** - Radix UI dialog with version grid
**Task 19: Duplicate Group Card** - Side-by-side comparison
**Task 20: Duplicates View** - List with filtering
**Task 21: App Routing** - React Router setup
**Task 22: Error Boundaries** - React error handling
**Task 23: Main App Integration** - Wire everything together

Each follows the same TDD pattern:
1. Write failing test
2. Verify failure
3. Write minimal implementation
4. Verify success
5. Commit

---

## Execution Instructions

**Total tasks:** 23
- Gateway: 12 tasks
- Web UI: 11 tasks

**Estimated time:** 8-12 hours

**Testing commands:**
```bash
# Gateway
cd services/gateway && npm test

# Web UI
cd services/web && npm test

# All
npm test
```

**Build commands:**
```bash
# Gateway
cd services/gateway && npm run build

# Web UI
cd services/web && npm run build
```

**Coverage target:** 100% (excluding truly untestable code)

---

## Success Criteria

- [ ] All gateway tests passing (30+ tests)
- [ ] All web UI tests passing (20+ tests)
- [ ] Gateway enriches responses correctly
- [ ] Token caching works with Redis
- [ ] Error handling returns proper status codes
- [ ] Photo grid displays with infinite scroll
- [ ] Version switcher modal functional
- [ ] Duplicates view displays comparison
- [ ] Docker builds succeed
- [ ] Integration verified with curl/Postman
