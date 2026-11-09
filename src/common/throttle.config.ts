import type { ThrottlerOptions } from '@nestjs/throttler';

// Global yumshoq limit: 1 daqiqada 100 ta so'rov (IP bo'yicha)
export const GLOBAL_THROTTLE: ThrottlerOptions = { ttl: 60_000, limit: 100 };

// Qattiqroq limitlar (1 daqiqada, IP bo'yicha)
export const LOGIN_THROTTLE = { default: { ttl: 60_000, limit: 10 } };
export const REGISTER_THROTTLE = { default: { ttl: 60_000, limit: 5 } };
export const INQUIRY_THROTTLE = { default: { ttl: 60_000, limit: 5 } };
