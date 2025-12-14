// import Redis from 'ioredis';

// const globalForRedis = global as unknown as { redis: Redis | undefined };

// export const redis =
//   globalForRedis.redis ||
//   new Redis({
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//     password: process.env.REDIS_PASSWORD,
//     maxRetriesPerRequest: null,
//   });

// redis.on('error', (err) => console.error('Redis error:', err));
// redis.on('connect', () => console.log('Redis connected'));

// if (process.env.NODE_ENV !== 'production') {
//   globalForRedis.redis = redis;
// }