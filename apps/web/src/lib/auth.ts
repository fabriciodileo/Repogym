export const AUTH_COOKIE_KEYS = {
  accessToken: 'gym_access_token',
  refreshToken: 'gym_refresh_token',
  user: 'gym_user',
} as const;

export const AUTH_COOKIE_MAX_AGE = {
  accessToken: 60 * 15,
  refreshToken: 60 * 60 * 24 * 7,
  user: 60 * 60 * 24 * 7,
} as const;

export const API_BASE_URL = process.env.API_URL ?? 'http://localhost:4000';
