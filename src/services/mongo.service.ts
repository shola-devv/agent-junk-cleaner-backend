import { MongoClient, type Collection, type Db } from 'mongodb';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

export interface VisitorRecord {
  ip: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  dayId: string;
  dayCount: number;
  windowId: number;
  windowCount: number;
  blockedBy: 'window' | 'day' | null;
}

interface DownloadCountRecord {
  _id: 'global-downloads';
  count: number;
  updatedAt: Date;
}

let clientPromise: Promise<MongoClient> | undefined;
let visitorIndexesPromise: Promise<void> | undefined;

async function mongoClient(): Promise<MongoClient> {
  if (!env.MONGODB_URI) {
    throw new AppError(
      'MONGODB_NOT_CONFIGURED',
      'MongoDB is not configured. Set MONGODB_URI to enable this endpoint.',
      503,
      true,
    );
  }

  if (!clientPromise) {
    const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect().catch(async (error: unknown) => {
      clientPromise = undefined;
      await client.close();
      throw error;
    });
  }
  return clientPromise;
}

export async function mongoDatabase(): Promise<Db> {
  const client = await mongoClient();
  return client.db(env.MONGODB_DATABASE);
}

export async function visitorsCollection(): Promise<Collection<VisitorRecord>> {
  const collection = (await mongoDatabase()).collection<VisitorRecord>('visitors');
  if (!visitorIndexesPromise) {
    visitorIndexesPromise = Promise.all([
      collection.createIndex({ ip: 1 }, { unique: true }),
      collection.createIndex({ lastSeenAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        visitorIndexesPromise = undefined;
        throw error;
      });
  }
  await visitorIndexesPromise;
  return collection;
}

export async function downloadCountsCollection(): Promise<Collection<DownloadCountRecord>> {
  return (await mongoDatabase()).collection<DownloadCountRecord>('downloadCounts');
}

export async function isMongoReady(): Promise<boolean> {
  if (!env.MONGODB_URI) return false;
  const db = await mongoDatabase();
  await db.command({ ping: 1 });
  return true;
}

export async function closeMongoConnection(): Promise<void> {
  if (!clientPromise) return;
  const client = await clientPromise;
  clientPromise = undefined;
  visitorIndexesPromise = undefined;
  await client.close();
}
