'use client'

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const BOOK_URL = 'https://finhub.net.au/book-appointment.html';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(v);

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  brokerName?: string;
}

interface LoanCard {
  loan_id: string;
  lender: string;
  lenderShort: string;
  amount: number | null;
  interestRate: number | null;
  baseRate: number | null;
  discountApplied: number | null;
  rateType: string | null;
  isInterestOnly: boolean;
  tranxType: string;
  settledDate: string;
  lenderReference: string;
  isActive: boolean;
  fixedRateExpiry?: string | null;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-36 bg-[#1a2d52] rounded-xl" />
      <div className="h-48 bg-[#1a2d52] rounded-xl" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loans, setLoans] = useState<LoanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string>('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [profileRes, loansRes] = await Promise.all([
        fetch('/api/details', { credentials: 'include' }),
        fetch('/api/loans', { credentials: 'include' }),
      ]);

      if (profileRes.status === 401 || loansRes.status === 401) {
        router.push('/');
        return;
      }

      const profileData = profileRes.ok ? await profileRes.json() : null;
      const loansData = loansRes.ok ? await loansRes.json() : { loans: [] };

      if (profileData) setProfile(profileData);
      setLoans(loansData.loans || []);
      setLastSynced(new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeLoans = loans.filter((l) => l.isActive !== false);
  const syncedCount = activeLoans.length;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        <h1 className="text-2xl font-bold text-white">Your Profile</h1>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="bg-[#0f1d32] border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-4">⚠️ {error}</p>
            <button
              onClick={() => loadData()}
              className="bg-[#f5a623] hover:bg-[#d4891c] text-[#0a1628] font-semibold px-5 py-2 rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Contact Details */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Contact Details</p>
              <div className="space-y-3">
                <Row label="Name" value={profile ? `${profile.firstName} ${profile.lastName}`.trim() : '—'} dark />
                <Row label="Email" value={profile?.email || '—'} dark />
                <Row label="Mobile" value={profile?.mobile || '—'} dark />
                <Row label="Your Broker" value={profile?.brokerName || 'Daniel Nguyen'} dark />
              </div>
            </div>

            {/* Loans */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your Loans</p>
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="text-[#f5a623] text-sm flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  <span className={refreshing ? 'animate-spin' : ''}>↺</span>
                  <span>Refresh</span>
                </button>
              </div>

              {syncedCount > 0 && (
                <p className="text-sm text-green-600 font-medium mb-4 flex items-center gap-1.5">
                  <span className="w-4 h-4 bg-green-100 rounded flex items-center justify-center text-xs">✓</span>
                  Synced {syncedCount} loan{syncedCount !== 1 ? 's' : ''}
                </p>
              )}

              {activeLoans.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No active loans found.</p>
              ) : (
                <div className="space-y-3">
                  {activeLoans.map((loan) => {
                    const hasDiscount = loan.discountApplied != null && loan.discountApplied > 0 && loan.baseRate != null;
                    // interestRate is already the effective rate (baseRate - discount) from the API
                    const displayRate = loan.interestRate ?? loan.baseRate;
                    const rateType = loan.rateType || 'Variable';

                    return (
                      <div key={loan.loan_id} className="border border-gray-100 rounded-xl p-4">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-gray-900">{loan.lenderShort || loan.lender}</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            rateType.toLowerCase().includes('fixed')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {rateType}
                          </span>
                        </div>

                        {/* Rate + Amount */}
                        <div className="flex items-end gap-6">
                          <div>
                            {hasDiscount && (
                              <p className="text-xs text-gray-400 line-through mb-0.5">
                                {loan.baseRate}% standard rate
                              </p>
                            )}
                            <p className="text-2xl font-bold text-gray-900">
                              {displayRate != null ? `${displayRate}%` : '—'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {hasDiscount ? `Effective rate (${loan.discountApplied}% discount applied)` : (loan.isInterestOnly ? 'Interest only rate' : 'Your current rate')}
                            </p>
                          </div>
                          {loan.amount != null && (
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{fmtCurrency(loan.amount)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Loan amount</p>
                            </div>
                          )}
                        </div>

                        {/* Reference + date */}
                        <p className="text-xs text-gray-400 mt-3">
                          Ref: {loan.lenderReference || loan.loan_id.slice(0, 8)}
                          {lastSynced && ` · Last synced ${lastSynced}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Book button */}
            <a
              href={BOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#f5a623] hover:bg-[#d4891c] text-white text-center font-semibold text-base py-4 rounded-xl transition-all shadow-sm"
            >
              📅 Book a Loan Review With Your Broker
            </a>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${dark ? 'text-gray-900' : 'text-white'}`}>{value}</span>
    </div>
  );
}
