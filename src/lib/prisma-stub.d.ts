// ============================================================================
// PRISMA TYPE STUB
// Provides minimal types when Prisma client is not generated
// These types are overridden by actual Prisma types when available
// ============================================================================

declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: {
      adapter?: unknown;
      log?: string[];
    });
    
    $transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T>;
    $disconnect(): Promise<void>;
    $connect(): Promise<void>;
    
    user: {
      findUnique(args: { where: { id: string }; include?: unknown }): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      upsert(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    profile: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      upsert(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    conversation: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      deleteMany(args?: unknown): Promise<{ count: number }>;
      count(args?: unknown): Promise<number>;
    };
    
    message: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      deleteMany(args?: unknown): Promise<{ count: number }>;
      count(args?: unknown): Promise<number>;
    };
    
    learning: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    studySession: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    studentInsightProfile: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      upsert(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    flashcard: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    quiz: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    quizResult: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    mindMap: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };
    
    telemetryEvent: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
      groupBy(args?: unknown): Promise<unknown[]>;
    };
    
    safetyEvent: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    settings: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      upsert(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    material: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    materialTag: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      deleteMany(args?: unknown): Promise<{ count: number }>;
      count(args?: unknown): Promise<number>;
    };

    tag: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      upsert(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    voiceSession: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    userAchievement: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    family: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    parentChild: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    teacherStudent: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    notification: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      deleteMany(args?: unknown): Promise<{ count: number }>;
      count(args?: unknown): Promise<number>;
    };

    summarizedContext: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      upsert(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
    };

    pomodoroSession: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      count(args?: unknown): Promise<number>;
      aggregate(args?: unknown): Promise<unknown>;
    };

    collection: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      deleteMany(args?: unknown): Promise<{ count: number }>;
      count(args?: unknown): Promise<number>;
    };

    collectionItem: {
      findUnique(args: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<unknown[]>;
      create(args: unknown): Promise<unknown>;
      update(args: unknown): Promise<unknown>;
      delete(args: unknown): Promise<unknown>;
      deleteMany(args?: unknown): Promise<{ count: number }>;
      count(args?: unknown): Promise<number>;
    };
  }
}
