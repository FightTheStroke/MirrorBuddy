// ============================================================================
// REDIS SSE STORE - Multi-instance safe SSE client management
// Uses Upstash Redis in production, in-memory for development
// ============================================================================

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { isRedisConfigured as checkRedisConfig, getRedisUrl, getRedisToken } from '@/lib/redis';

const log = logger.child({ module: 'sse-store' });

// ============================================================================
// TYPES
// ============================================================================

export interface SSEClientMetadata {
  id: string;
  roomId: string;
  userId: string;
  instanceId: string; // Server instance identifier
  createdAt: number;
}

export interface SSEClientStore {
  register(client: SSEClientMetadata): Promise<void>;
  unregister(clientId: string): Promise<void>;
  getClientsInRoom(roomId: string): Promise<SSEClientMetadata[]>;
  getRoomClientCount(roomId: string): Promise<number>;
  cleanupStale(maxAgeMs: number): Promise<number>;
  getMode(): 'redis' | 'memory';
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const REDIS_KEY_PREFIX = 'mirrorbuddy:sse:';
const CLIENT_TTL_SECONDS = 600; // 10 minutes TTL for client entries

// Unique identifier for this server instance
const INSTANCE_ID =
  process.env.VERCEL_DEPLOYMENT_ID || `local-${Math.random().toString(36).slice(2, 8)}`;

// Redis config resolved via centralized resolver in @/lib/redis

// ============================================================================
// IN-MEMORY STORE (Development)
// ============================================================================

class MemorySSEStore implements SSEClientStore {
  private clients = new Map<string, SSEClientMetadata>();

  async register(client: SSEClientMetadata): Promise<void> {
    this.clients.set(client.id, client);
    log.debug('Memory SSE client registered', {
      clientId: client.id,
      roomId: client.roomId,
    });
  }

  async unregister(clientId: string): Promise<void> {
    this.clients.delete(clientId);
    log.debug('Memory SSE client unregistered', { clientId });
  }

  async getClientsInRoom(roomId: string): Promise<SSEClientMetadata[]> {
    const results: SSEClientMetadata[] = [];
    this.clients.forEach((client) => {
      if (client.roomId === roomId) {
        results.push(client);
      }
    });
    return results;
  }

  async getRoomClientCount(roomId: string): Promise<number> {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.roomId === roomId) count++;
    });
    return count;
  }

  async cleanupStale(maxAgeMs: number): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    this.clients.forEach((client, id) => {
      if (now - client.createdAt > maxAgeMs) {
        this.clients.delete(id);
        cleaned++;
      }
    });
    return cleaned;
  }

  getMode(): 'redis' | 'memory' {
    return 'memory';
  }
}

// ============================================================================
// REDIS STORE (Production)
// ============================================================================

class RedisSSEStore implements SSEClientStore {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: getRedisUrl()!.trim(),
      token: getRedisToken()!.trim(),
    });
    log.info('Redis SSE store initialized', { instanceId: INSTANCE_ID });
  }

  private clientKey(clientId: string): string {
    return `${REDIS_KEY_PREFIX}client:${clientId}`;
  }

  private roomKey(roomId: string): string {
    return `${REDIS_KEY_PREFIX}room:${roomId}`;
  }

  async register(client: SSEClientMetadata): Promise<void> {
    const clientData = { ...client, instanceId: INSTANCE_ID };

    // Store client data with TTL
    await this.redis.set(this.clientKey(client.id), JSON.stringify(clientData), {
      ex: CLIENT_TTL_SECONDS,
    });

    // Add to room set with score as timestamp for ordered cleanup
    await this.redis.zadd(this.roomKey(client.roomId), {
      score: client.createdAt,
      member: client.id,
    });

    log.debug('Redis SSE client registered', {
      clientId: client.id,
      roomId: client.roomId,
      instanceId: INSTANCE_ID,
    });
  }

  async unregister(clientId: string): Promise<void> {
    // Get client data first to know the room
    const data = await this.redis.get<string>(this.clientKey(clientId));
    if (data) {
      const client = typeof data === 'string' ? JSON.parse(data) : (data as SSEClientMetadata);
      // Remove from room set
      await this.redis.zrem(this.roomKey(client.roomId), clientId);
    }

    // Delete client data
    await this.redis.del(this.clientKey(clientId));

    log.debug('Redis SSE client unregistered', { clientId });
  }

  async getClientsInRoom(roomId: string): Promise<SSEClientMetadata[]> {
    // Get all client IDs in room
    const clientIds = await this.redis.zrange(this.roomKey(roomId), 0, -1);

    if (!clientIds || clientIds.length === 0) {
      return [];
    }

    // Fetch all client data in parallel
    const clientPromises = clientIds.map(async (id) => {
      const data = await this.redis.get<string>(this.clientKey(id as string));
      if (!data) return null;
      return typeof data === 'string' ? JSON.parse(data) : (data as SSEClientMetadata);
    });

    const clients = await Promise.all(clientPromises);
    return clients.filter((c): c is SSEClientMetadata => c !== null);
  }

  async getRoomClientCount(roomId: string): Promise<number> {
    const count = await this.redis.zcard(this.roomKey(roomId));
    return count ?? 0;
  }

  async cleanupStale(maxAgeMs: number): Promise<number> {
    // This is handled by Redis TTL, but we can clean room sets
    // For simplicity, TTL on individual keys handles this
    log.debug('Redis cleanup triggered (handled by TTL)', { maxAgeMs });
    return 0;
  }

  getMode(): 'redis' | 'memory' {
    return 'redis';
  }
}

// ============================================================================
// STORE FACTORY
// ============================================================================

let storeInstance: SSEClientStore | null = null;

/**
 * Get the SSE client store instance
 * Uses Redis in production when configured, memory otherwise
 */
export function getSSEStore(): SSEClientStore {
  if (!storeInstance) {
    if (checkRedisConfig()) {
      storeInstance = new RedisSSEStore();
      log.info('Using Redis SSE store');
    } else {
      storeInstance = new MemorySSEStore();
      log.info('Using in-memory SSE store (Redis not configured)');
    }
  }
  return storeInstance;
}

/**
 * Get the current instance ID (for pub/sub filtering)
 */
export function getInstanceId(): string {
  return INSTANCE_ID;
}

/**
 * Check if current instance owns a client connection
 */
export function isLocalClient(client: SSEClientMetadata): boolean {
  return client.instanceId === INSTANCE_ID;
}
