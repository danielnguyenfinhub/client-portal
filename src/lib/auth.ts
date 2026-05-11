import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'portal_session';

export interface AuthUser {
  userId: string;
  mercuryId: string;
}

// ─── Session auth (for protected API routes) ──────────────────────────────

export async function getAuthenticatedUser(
  request?: Request
): Promise<AuthUser | null> {
  try {
    let token: string | undefined;

    if (request) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
      );
      token = match?.[1];
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE)?.value;
    }

    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;
    if (new Date() > session.expiresAt) return null;
    if (!session.user || !session.user.isActivated) return null;

    return {
      userId: session.user.id,
      mercuryId: session.user.mercuryId,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// ─── Passphrase hashing ────────────────────────────────────────────────────

export async function hashPassphrase(passphrase: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(passphrase, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

export async function verifyPassphrase(
  passphrase: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  const buf = (await scryptAsync(passphrase, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, 'hex');
  return timingSafeEqual(buf, storedBuf);
}

// ─── Session management ────────────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
}

// ─── OTP ────────────────────────────────────────────────────────────────────

export async function generateOTP(userId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert a session with OTP (reuse existing or create new)
  const token = randomBytes(32).toString('hex');
  await prisma.session.create({
    data: {
      userId,
      token,
      otp: code,
      otpExpiry,
      expiresAt: otpExpiry,
    },
  });

  return code;
}

export async function verifyOTP(userId: string, code: string): Promise<boolean> {
  const session = await prisma.session.findFirst({
    where: {
      userId,
      otp: code,
      otpExpiry: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) return false;

  // Clean up used OTP session
  await prisma.session.delete({ where: { id: session.id } }).catch(() => {});

  return true;
}

// ─── Identifier normalisation ───────────────────────────────────────────────

export async function normaliseIdentifier(
  identifier: string
): Promise<{ type: 'email' | 'mobile'; normalised: string } | null> {
  const trimmed = identifier.trim();

  // Email
  if (trimmed.includes('@')) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { type: 'email', normalised: email };
  }

  // Mobile — normalise to +61 format
  const digits = trimmed.replace(/[\s\-\(\)]/g, '');
  if (/^\+?\d{8,15}$/.test(digits)) {
    let normalised = digits;
    if (normalised.startsWith('0')) {
      normalised = '+61' + normalised.slice(1);
    } else if (!normalised.startsWith('+')) {
      normalised = '+61' + normalised;
    }
    return { type: 'mobile', normalised };
  }

  return null;
}

// ─── Activation tokens ─────────────────────────────────────────────────────

export async function generateActivationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.user.update({
    where: { id: userId },
    data: {
      activationToken: token,
      activationExpiry: expiry,
    },
  });

  return token;
}
