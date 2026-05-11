export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sendRateReviewNotification } from '@/lib/email';

const PORTAL = process.env.PORTAL_API_URL || 'https://mercury-mcp-v2-production.up.railway.app/portal';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { loanId, loanName, currentRate, lender, rateType, message } = await req.json();

    // Fetch client name + email
    let clientName = 'Client';
    let clientEmail = '';
    try {
      const contactRes = await fetch(`${PORTAL}/contact/${user.mercuryId}`);
      if (contactRes.ok) {
        const c = await contactRes.json();
        clientName = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Client';
        clientEmail = c.email || '';
      }
    } catch { /* non-fatal */ }

    // Add note to Mercury opportunity via portal API (non-fatal if fails)
    if (loanId) {
      try {
        await fetch(`${PORTAL}/rate-review-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: user.mercuryId,
            loan_id: loanId,
            current_rate: currentRate,
            rate_type: rateType,
            message,
            client_name: clientName,
          }),
        });
      } catch { /* non-fatal — email is primary notification */ }
    }

    // Send email notification to Daniel
    await sendRateReviewNotification({
      clientName,
      clientEmail,
      loanId,
      loanName,
      currentRate,
      rateType,
      lender,
      message,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
