import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

const PORTAL = process.env.PORTAL_API_URL || 'https://mercury-mcp-v2-production.up.railway.app/portal';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${PORTAL}/contact/${user.mercuryId}`);
    if (!res.ok) throw new Error('Failed to fetch contact');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
