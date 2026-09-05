import jwt, { SignOptions } from 'jsonwebtoken';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const generateToken = (id: string): string => {
  const secret = requireEnv('JWT_SECRET');
  const options: SignOptions = {};
  return jwt.sign({ id }, secret, options);
};

export const generateRefreshToken = (id: string): string => {
  const secret = requireEnv('JWT_REFRESH_SECRET');
  const options: SignOptions = {};
  return jwt.sign({ id }, secret, options);
};

export const verifyToken = (token: string): any => {
  const secret = requireEnv('JWT_SECRET');
  return jwt.verify(token, secret);
};

export const verifyRefreshToken = (token: string): any => {
  const secret = requireEnv('JWT_REFRESH_SECRET');
  return jwt.verify(token, secret);
};
