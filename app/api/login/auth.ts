import jwt from 'jsonwebtoken';

const JWT_SECRET = 'my-sky-jwt-secret-key';
const JWT_EXPIRES_IN = '30Days';

const VALID_CREDENTIALS = {
  username: 'sky',
  password: '111',
};

export function validateCredentials(
  username: string,
  password: string,
): boolean {
  return (
    username === VALID_CREDENTIALS.username &&
    password === VALID_CREDENTIALS.password
  );
}

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function validateToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}