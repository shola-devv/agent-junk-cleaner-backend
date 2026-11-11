import type { Request, Response } from 'express';
import { downloadCountsCollection, visitorsCollection } from '../services/mongo.service';
import { sendFailure, sendSuccess } from '../utils/respond';

export async function registerVisitor(req: Request, res: Response): Promise<void> {
  const ip = req.ip;
  if (!ip) {
    sendFailure(req, res, 400, {
      code: 'CLIENT_IP_UNAVAILABLE',
      message: 'The client IP address could not be determined.',
      retryable: false,
    });
    return;
  }

  const now = new Date();
  await (await visitorsCollection()).updateOne(
    { ip },
    { $setOnInsert: { ip, firstSeenAt: now }, $set: { lastSeenAt: now } },
    { upsert: true },
  );
  sendSuccess(req, res, { registered: true });
}

export async function recordDownload(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const result = await (await downloadCountsCollection()).findOneAndUpdate(
    { _id: 'global-downloads' },
    { $inc: { count: 1 }, $set: { updatedAt: now } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!result) throw new Error('MongoDB did not return the updated download count.');
  sendSuccess(req, res, { count: result.count }, 201);
}

export async function getDownloadCount(req: Request, res: Response): Promise<void> {
  const result = await (await downloadCountsCollection()).findOne({ _id: 'global-downloads' });
  sendSuccess(req, res, { count: result?.count ?? 0 });
}
