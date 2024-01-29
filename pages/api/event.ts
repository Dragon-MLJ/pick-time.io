import { DateValue } from '@models/date';
import { TimeRange } from '@models/time';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { customAlphabet } from 'nanoid';
import RedisClient from '@utils/getRedis';
import { ErrorCode } from '@models/errors';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(20, "12 h"),
  analytics: false,
});

const handler: NextApiHandler = (req, res) => {
  switch (req.method) {
    case 'POST':
      return handleCreateEvent(req, res);
    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).json({ error: ErrorCode.METHOD_NOT_ALLOWED });
  }
};

async function handleCreateEvent(req: NextApiRequest, res: NextApiResponse) {
  const ipIdentifier = req.headers['x-real-cdn-ip'] ?? req.headers['x-real-ip'];
  const { success } = await ratelimit.limit(
    `picktime_limit_ip:${ipIdentifier}`
  )
  try {
    const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6);
    const title: string = req.body.title;
    
     if (!success) {
      res.status(429).json({ error: 'ratelimit' });
      return;
    }

    if (!title) {
      res.status(400).json({ error: ErrorCode.INVALID_REQUEST });
      return;
    }

    const d: string[] = req.body.availableDates;
    const t: string[] = req.body.availableTimes;

    const availableDate = d.map((date) => DateValue().fromString(date));
    const availableTime = t.map((time) => TimeRange().fromString(time));
    if (availableTime.length === 0 || availableDate.length === 0) {
      res.status(400).json({ error: ErrorCode.INVALID_REQUEST });
      return;
    }
    const redis = new RedisClient();
    const insert = {
      title,
      nanoid: nanoid(),
      availableDates: d,
      availableTimes: t
    };
    await redis.setEvent(insert);
    res.status(201).json(insert);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: ErrorCode.INVALID_REQUEST });
  }
}

export default handler;
