export const dynamic = 'force-dynamic'

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

    // Enrich ALL active loans with product details (to get effective rate)
    const activeLoans = loans.filter((l: any) => l.isActive !== false);
    const enriched = new Map<string, any>();

    await Promise.all(
      activeLoans.map(async (loan: any) => {
        try {
          const detailRes = await fetch(`${PORTAL}/loan/${loan.loan_id}`);
          if (!detailRes.ok) return;
          const detail = await detailRes.json();
          const primaryProduct = detail.products?.[0];
          // effectiveRate = baseRate - discountApplied (already computed in portal-router)
          const effectiveRate = primaryProduct?.effectiveRate ?? primaryProduct?.baseRate ?? null;
          enriched.set(loan.loan_id, {
            interestRate: effectiveRate,
            baseRate: primaryProduct?.baseRate ?? null,
            discountApplied: primaryProduct?.discountApplied ?? null,
            rateType: primaryProduct?.rateType ?? null,
            isInterestOnly: primaryProduct?.isInterestOnly ?? false,
            products: detail.products || [],
          });
        } catch { /* enrichment failure is non-fatal */ }
      })
    );

    const enrichedLoans = loans.map((l: any) => {
      const extra = enriched.get(l.loan_id);
      return extra ? { ...l, ...extra } : l;
    });

    return NextResponse.json({ loans: enrichedLoans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
