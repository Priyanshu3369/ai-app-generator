import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from './db/pool';

const JWT_SECRET = process.env.JWT_SECRET || 'app-generator-secret-key-change-in-production';

interface TokenPayload {
  userId: string;
  email: string;
  appId?: string;
  role?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload, expiresIn = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function signup(email: string, password: string, name?: string, appId?: string) {
  const existing = await query('SELECT id FROM _platform_users WHERE email = $1 AND (app_id = $2 OR app_id IS NULL)', [email, appId]);
  if (existing.rows.length > 0) {
    throw new Error('User with this email already exists');
  }
  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  await query(
    'INSERT INTO _platform_users (id, email, password_hash, name, app_id) VALUES ($1, $2, $3, $4, $5)',
    [id, email, passwordHash, name || '', appId || null]
  );
  const token = generateToken({ userId: id, email, appId, role: 'user' });
  return { user: { id, email, name, role: 'user' }, token };
}

export async function login(email: string, password: string, appId?: string) {
  const result = await query(
    'SELECT * FROM _platform_users WHERE email = $1 AND (app_id = $2 OR app_id IS NULL)',
    [email, appId]
  );
  const user = result.rows[0];
  if (!user) throw new Error('Invalid email or password');
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new Error('Invalid email or password');
  const token = generateToken({ userId: user.id, email: user.email, appId, role: user.role });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
}

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookie = request.headers.get('cookie');
  if (cookie) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

export function authenticateRequest(request: Request): TokenPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}
