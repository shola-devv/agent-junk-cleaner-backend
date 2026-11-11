import type { RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import { env } from '../config/env';
import { visitorsCollection } from '../services/mongo.service';
import { sendFailure } from '../utils/respond';

export const ipRateLimiter: RequestHandler = (req, res, next) => {
  void enforceIpLimit(req, res, next).catch(next);
};

async function enforceIpLimit(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
): Promise<void> {
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
  const dayId = now.toISOString().slice(0, 10);
  const windowId = Math.floor(now.getTime() / env.RATE_LIMIT_WINDOW_MS);
  const visitors = await visitorsCollection();
  const pipeline = [
    {
      $set: {
        ip,
        firstSeenAt: { $ifNull: ['$firstSeenAt', now] },
        lastSeenAt: now,
        dayId: { $cond: [{ $eq: ['$dayId', dayId] }, '$dayId', dayId] },
        dayCount: { $cond: [{ $eq: ['$dayId', dayId] }, '$dayCount', 0] },
        windowId: { $cond: [{ $eq: ['$windowId', windowId] }, '$windowId', windowId] },
        windowCount: {
          $cond: [{ $eq: ['$windowId', windowId] }, '$windowCount', 0],
        },
      },
    },
    {
      $set: {
        blockedBy: {
          $cond: [
            { $gte: ['$dayCount', env.DAILY_RATE_LIMIT_MAX] },
            'day',
            {
              $cond: [
                { $gte: ['$windowCount', env.RATE_LIMIT_MAX] },
                'window',
                null,
              ],
            },
          ],
        },
      },
    },
    {
      $set: {
        windowCount: {
          $cond: [
            { $eq: ['$blockedBy', null] },
            { $add: ['$windowCount', 1] },
            '$windowCount',
          ],
        },
        dayCount: {
          $cond: [{ $eq: ['$blockedBy', null] }, { $add: ['$dayCount', 1] }, '$dayCount'],
        },
      },
    },
  ];
  let visitor;
  try {
    visitor = await visitors.findOneAndUpdate(
      { ip },
      pipeline,
      { upsert: true, returnDocument: 'after' },
    );
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    visitor = await visitors.findOneAndUpdate(
      { ip },
      pipeline,
      { returnDocument: 'after' },
    );
  }

  if (!visitor) {
    next(new Error('MongoDB did not return the updated visitor rate-limit record.'));
    return;
  }

  if (visitor.blockedBy) {
    const retryAfterSeconds =
      visitor.blockedBy === 'day'
        ? Math.ceil((Date.parse(`${dayId}T00:00:00.000Z`) + 86_400_000 - now.getTime()) / 1000)
        : Math.ceil(((windowId + 1) * env.RATE_LIMIT_WINDOW_MS - now.getTime()) / 1000);
    res.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
    sendFailure(req, res, 429, {
      code: 'RATE_LIMITED',
      message:
        visitor.blockedBy === 'day'
          ? 'Daily request limit reached. Please try again tomorrow.'
          : 'Too many requests. Please wait a moment and try again.',
      retryable: true,
    });
    return;
  }

  next();
}
