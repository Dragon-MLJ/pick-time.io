import { NextApiHandler } from 'next';
import bcrypt from 'bcrypt';
import jsonwebtoken from 'jsonwebtoken';
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
  limiter: Ratelimit.fixedWindow(10, "12 h"),
  analytics: false,
});

const signIn: NextApiHandler = async (req, res) => {
  const {
    name,
    password
  } = req.body;

  const ipIdentifier = req.headers['x-real-cdn-ip'] ?? req.headers['x-real-ip'];
  const { success } = await ratelimit.limit(
    `picktime_signin_limit_ip:${ipIdentifier}`
  )

  if (!success) {
    res.status(429).json({ error: 'ratelimit' });
    return;
  }


  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: ErrorCode.INTERNAL_ERROR });
    return;
  }

  const { eventId } = req.query;
  if (!eventId || typeof eventId !== 'string') {
    res.status(404).json({ error: ErrorCode.EVENT_NOT_FOUND });
    return;
  }

  const redis = new RedisClient();
  const find = await redis.getUser(eventId, name) as any;
  if (!find) {
    const insertData: any = {
      name,
      eventId
    };
    if (password.length > 0) {
      insertData.passwordHash = bcrypt.hashSync(password, 10);
    }
    await redis.setUser(eventId, insertData.name, insertData.passwordHash);
    const token = jsonwebtoken.sign({
      iat: Date.now(),
      sub: name,
      eventId
    }, process.env.JWT_SECRET);
    res.status(201).json({
      name: insertData.name,
      token
    });
    return;
  }

  if (find.passwordHash) {
    const isValid = bcrypt.compareSync(password, find.passwordHash);
    if (!isValid) {
      res.status(400).json({ error: ErrorCode.INVALID_PASSWORD });
      return;
    }
  }

  const token = jsonwebtoken.sign({
    iat: Date.now(),
    sub: find.name,
    eventId
  }, process.env.JWT_SECRET);

  delete find.passwordHash;

  res.status(200).json({
    user: find,
    token
  });
};

export default signIn;
