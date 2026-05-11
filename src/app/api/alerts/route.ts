export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

const PORTAL = process.env.PORTAL_API_URL || 'https://mercury-mcp-v2-production.up.railway.app/portal';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const loansRes = await fetch(`${PORTAL}/contact/${user.mercuryId}/loans`);
    if (!loansRes.ok) return NextResponse.json({ alerts: [] });
    const loans: any[] = await loansRes.json();

    const alerts: any[] = [];
    const now = Date.now();

    for (const loan of loans) {
      if (!loan.isActive) continue;

      if (loan.fixedRateExpiry) {
        const expiry = new Date(loan.fixedRateExpiry).getTime();
        const daysRemaining = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
        if (daysRemaining > 0 && daysRemaining <= 90) {
          alerts.push({
            type: 'fixed_rate_expiry',
            message: `Your fixed rate expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
            daysRemaining,
            loanId: loan.loan_id,
          });
        }
      }

      if (loan.interestOnlyExpiry) {
        const expiry = new Date(loan.interestOnlyExpiry).getTime();
        const daysRemaining = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
        if (daysRemaining > 0 && daysRemaining <= 90) {
          alerts.push({
            type: 'io_expiry',
            message: `Your interest-only period expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
            daysRemaining,
            loanId: loan.loan_id,
          });
        }
      }
    }

    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}
