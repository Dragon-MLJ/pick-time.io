import { Redis } from '@upstash/redis';
import { SerializedEventData } from '@models/event';
import { SerializedEventResult } from '@models/Pick';

class RedisClient {
  private _redis: Redis;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private readonly Expires = 365 * 24 * 60 * 60; // 1 year in seconds
  
  constructor() {
    const {
      UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN
    } = process.env;
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    this._redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  private setWithExpiration(key: string, value: any) {
    return this._redis.set(key, value, { ex: this.Expires });
  }

  public setEvent(data: SerializedEventData) {
    const key = `event:${data.nanoid}`;
    return this.setWithExpiration(key, data);
  }

  public getEvent(nanoid: string) {
    return this._redis.get(`event:${nanoid}`) as unknown as SerializedEventData;
  }

  public setUser(nanoid: string, name: string, passwordHash?: string) {
    const key = `event:${nanoid}:user:${name}`;
    const value = { name, passwordHash };
    return this.setWithExpiration(key, value);
  }

  public getUser(nanoid: string, name: string): Promise<{
    name: string; passwordHash?: string;
  } | null> {
    return this._redis.get(`event:${nanoid}:user:${name}`);
  }

  public setPicks(nanoid: string, picks: SerializedEventResult[]) {
    const key = `events:${nanoid}:picks`;
    return this.setWithExpiration(key, picks);
  }

  public getPicks(nanoid: string): Promise<SerializedEventResult[] | null> {
    return this._redis.get(`events:${nanoid}:picks`);
  }
}

export default RedisClient;
