const NODE_ENV = process.env.NODE_ENV;

const hour = 24;

export const cookieOptions: any = {
  maxAge: hour * 60 * 60 * 1000,
  httpOnly: false,
  secure: NODE_ENV !== 'development',
  sameSite: NODE_ENV !== 'development' ? 'none' : 'lax',
  domain: NODE_ENV?.includes('live')
    ? process.env.COOKIE_DOMAIN || undefined
    : undefined,
  path: '/',
};
