'use client'

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(v);

const BOOK_URL = 'https://finhub.net.au/book-appointment.html';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 max-w-2xl mx-auto px-4 py-6">
      <div className="h-6 bg-[#1a2d52] rounded w-2/3" />
      <div className="h-4 bg-[#1a2d52] rounded w-1/3" />
      <div className="h-32 bg-[#1a2d52] rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-[#1a2d52] rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Rate Review Modal ─────────────────────────────────────────────────────────
function RateReviewModal({ loan, onClose }: { loan: any; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function handleSubmit() {
    setStatus('sending');
    try {
      const res = await fetch('/api/rate-review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId:      loan.loan_id,
          loanName:    loan.name,
          currentRate: loan.interestRate,
          rateType:    loan.rateType,
          lender:      loan.lender,
          message:     message.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: '#0f1d32', border: '1px solid #1a2d52' }}
      >
        {status === 'done' ? (
          <div className="text-center py-6">
            <p className="text-4xl mb-3">✅</p>
            <h3 className="text-white font-bold text-lg">Request Sent!</h3>
            <p className="text-gray-400 text-sm mt-2">
              Daniel will review your rate and get back to you shortly.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white w-full"
              style={{ backgroundColor: '#1a2d52' }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">Request Rate Review</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  We&apos;ll contact your lender to negotiate a better rate.
                </p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white ml-3 text-2xl leading-none">×</button>
            </div>

            <div
              className="rounded-xl p-4 mb-5 flex items-center justify-between"
              style={{ backgroundColor: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }}
            >
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Rate</p>
                <p className="text-2xl font-bold text-[#f5a623] mt-0.5">
                  {loan.interestRate != null ? `${loan.interestRate}% p.a.` : 'Not on file'}
                </p>
                {loan.rateType && <p className="text-xs text-gray-500 mt-0.5">{loan.rateType}</p>}
              </div>
              {loan.lender && <p className="text-sm font-semibold text-gray-300">{loan.lender}</p>}
            </div>

            <div className="mb-5">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
                Message to broker <span className="normal-case text-gray-600">(optional)</span>
              </label>
              <textarea
                className="w-full rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-[#f5a623]"
                style={{ backgroundColor: '#0a1628', border: '1px solid #1a2d52', height: '90px' }}
                placeholder="e.g. I've been with this lender for 3 years and would like to review my rate…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-sm mb-4">Something went wrong. Please try again.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                style={{ backgroundColor: '#1a2d52' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === 'sending'}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f5a623, #e8952c)', color: '#0a1628' }}
              >
                {status === 'sending' ? 'Sending…' : 'Send Request'}
              </button>
            </div>

            <p className="text-center text-xs text-gray-600 mt-4">
              Daniel will update your rate in Mercury after reviewing.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [loans,         setLoans]         = useState<any[]>([]);
  const [user,          setUser]          = useState<any>(null);
  const [alerts,        setAlerts]        = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showRateModal, setShowRateModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [loansRes, alertsRes, detailsRes] = await Promise.all([
          fetch('/api/loans',   { credentials: 'include' }),
          fetch('/api/alerts',  { credentials: 'include' }),
          fetch('/api/details', { credentials: 'include' }),
        ]);
        if (loansRes.status === 401) { router.push('/'); return; }
        if (loansRes.ok)   { const d = await loansRes.json();   setLoans(d.loans || d || []); }
        if (alertsRes.ok)  { const d = await alertsRes.json();  setAlerts(d.alerts || []); }
        if (detailsRes.ok) { const d = await detailsRes.json(); setUser(d); }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  const activeLoans     = loans.filter((l) => l.isActive !== false);
  const totalBalance    = activeLoans.reduce((sum, l) => sum + (l.amount || l.loanAmount || 0), 0);
  const criticalAlerts  = alerts.filter((a) => a.daysRemaining !== undefined && a.daysRemaining <= 30);
  const primaryLoan     = activeLoans[0] || null;
  const firstName       = user?.firstName || user?.contactName?.split(' ')[0] || '';

  const quickActions = [
    {
      emoji: '📅', label: 'Book Appointment',
      description: 'Schedule a call with your broker',
      color: '#f5a623', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.3)',
      action: () => window.open(BOOK_URL, '_blank'),
    },
    {
      emoji: '🏦', label: 'My Loans',
      description: 'View loan details & rates',
      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)',
      action: () => router.push('/loans'),
    },
    {
      emoji: '💰', label: 'Financials',
      description: 'Income, expenses & assets',
      color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)',
      action: () => router.push('/financials'),
    },
    {
      emoji: '👥', label: 'Refer a Friend',
      description: 'Earn rewards for referrals',
      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)',
      action: () => router.push('/refer'),
    },
    {
      emoji: '👤', label: 'My Details',
      description: 'Update personal information',
      color: '#fb7185', bg: 'rgba(251,113,133,0.1)', border: 'rgba(251,113,133,0.3)',
      action: () => router.push('/details'),
    },
    {
      emoji: '🎁', label: 'Offers',
      description: 'Exclusive deals for you',
      color: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.3)',
      action: () => router.push('/offers'),
    },
    {
      emoji: '⚙️', label: 'Preferences',
      description: 'Email & notification settings',
      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)',
      action: () => router.push('/preferences'),
    },
    {
      emoji: '🏠', label: 'Property Report',
      description: 'Market values & estimates',
      color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)',
      action: () => router.push('/property-report'),
    },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#0a1628]">
      <Navbar />
      <LoadingSkeleton />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Navbar />

      {showRateModal && primaryLoan && (
        <RateReviewModal loan={primaryLoan} onClose={() => setShowRateModal(false)} />
      )}

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-white">
            Welcome back{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Here&apos;s your mortgage snapshot</p>
        </div>

        {/* Book Loan Review CTA — full width */}
        <a
          href={BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #f5a623, #e8952c)',
            color: '#0a1628',
            boxShadow: '0 4px 16px rgba(245,166,35,0.25)',
            display: 'flex',
          }}
        >
          <span>📅</span> Book a Loan Review With Your Broker
        </a>

        {/* Critical alerts */}
        {criticalAlerts.length > 0 && (
          <div
            className="rounded-xl p-4 border flex items-start gap-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-red-400 font-semibold text-sm">
                {criticalAlerts.length} alert{criticalAlerts.length > 1 ? 's' : ''} need your attention
              </p>
              <p className="text-gray-400 text-xs mt-0.5 truncate">
                {criticalAlerts[0]?.message || 'Action required on your loan'}
              </p>
              <button
                onClick={() => router.push('/alerts')}
                className="mt-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                View alerts →
              </button>
            </div>
          </div>
        )}

        {/* Loan summary card */}
        {activeLoans.length > 0 ? (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: '#0f1d32', borderColor: '#1a2d52' }}
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-[#1a2d52]">
              {/* Active Loans */}
              <div className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Active Loans</p>
                <p className="text-2xl font-bold text-white mt-1">{activeLoans.length}</p>
              </div>

              {/* Total Balance */}
              <div className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Balance</p>
                <p className="text-2xl font-bold text-[#f5a623] mt-1">{fmtCurrency(totalBalance)}</p>
              </div>

              {/* Effective Interest Rate */}
              <div className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Effective Rate</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-2xl font-bold text-white">
                    {primaryLoan?.interestRate != null ? `${primaryLoan.interestRate}%` : '—'}
                  </p>
                  {primaryLoan?.rateType && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: 'rgba(245,166,35,0.15)',
                        color: '#f5a623',
                        border: '1px solid rgba(245,166,35,0.3)',
                      }}
                    >
                      {primaryLoan.rateType}
                    </span>
                  )}
                </div>
                {primaryLoan?.discountApplied != null && primaryLoan.discountApplied > 0 && primaryLoan.baseRate != null && (
                  <p className="text-xs text-gray-500 mt-0.5 line-through">{primaryLoan.baseRate}% standard</p>
                )}
                <button
                  onClick={() => setShowRateModal(true)}
                  className="mt-1 text-xs font-medium text-[#60a5fa] hover:underline"
                >
                  🔔 Request rate review →
                </button>
              </div>

              {/* Lender */}
              <div className="p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Lender</p>
                <p className="text-2xl font-bold text-white mt-1 truncate">
                  {primaryLoan?.lender || '—'}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#1a2d52]">
              <button
                onClick={() => router.push('/loans')}
                className="text-sm font-medium text-[#f5a623] hover:underline"
              >
                View full loan details →
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-8 text-center border"
            style={{ backgroundColor: '#0f1d32', borderColor: '#1a2d52' }}
          >
            <p className="text-4xl mb-3">🏠</p>
            <p className="text-white font-semibold">No loan data yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">
              Your loan information will appear here once your application is in progress.
            </p>
            <a
              href={BOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm w-full justify-center"
              style={{ background: 'linear-gradient(135deg, #f5a623, #e8952c)', color: '#0a1628', display: 'inline-flex' }}
            >
              📅 Book a Loan Review With Your Broker
            </a>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="rounded-xl p-4 text-left transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: '#0f1d32',
                  border: `1px solid ${action.border}`,
                }}
              >
                <span className="text-2xl block mb-2">{action.emoji}</span>
                <p className="font-semibold text-sm text-white leading-tight">{action.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
