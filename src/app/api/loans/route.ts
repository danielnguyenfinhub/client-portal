import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

const PORTAL = process.env.PORTAL_API_URL || 'https://mercury-mcp-v2-production.up.railway.app/portal';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const loansRes = await fetch(`${PORTAL}/contact/${user.mercuryId}/loans`);
    if (!loansRes.ok) throw new Error('Failed to fetch loans');
    const loans: any[] = await loansRes.json();

    // Enrich the first active loan with product details (to get interest rate)
    const activeLoans = loans.filter((l: any) => l.isActive !== false);
    let enrichedLoans = loans;

    if (activeLoans.length > 0) {
      try {
        const detailRes = await fetch(`${PORTAL}/loan/${activeLoans[0].loan_id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const primaryProduct = detail.products?.[0];
          enrichedLoans = loans.map((l: any) => {
            if (l.loan_id === activeLoans[0].loan_id) {
              return {
                ...l,
                interestRate: primaryProduct?.baseRate ?? null,
                rateType: primaryProduct?.rateType ?? null,
                isInterestOnly: primaryProduct?.isInterestOnly ?? false,
                products: detail.products || [],
              };
            }
            return l;
          });
        }
      } catch { /* enrichment failure is non-fatal */ }
    }

    return NextResponse.json({ loans: enrichedLoans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
