'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(v);

const BOOK_URL = 'https://finhub.net.au/book-appointment.html';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-[#1a2d52] rounded w-1/3" />
      <div className="h-28 bg-[#1a2d52] rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#1a2d52] rounded-xl" />)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [loansRes, alertsRes, detailsRes] = await Promise.all([
          fetch('/api/loans', { credentials: 'include' }),
          fetch('/api/alerts', { credentials: 'include' }),
          fetch('/api/details', { credentials: 'include' }),
        ]);

        if (loansRes.status === 401) { router.push('/'); return; }

        if (loansRes.ok) {
          const d = await loansRes.json();
          setLoans(d.loans || d || []);
        }
        if (alertsRes.ok) {
          const d = await alertsRes.json();
          setAlerts(d.alerts || []);
        }
        if (detailsRes.ok) {
          const d = await detailsRes.json();
          setUser(d);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const activeLoans = loans.filter((l) => {
    const code = l.statusCode ?? l.status?.code ?? l.opportunityStatusCode;
    return typeof code === 'number' ? ![12, 13, 14].includes(code) : true;
  });

  const totalBalance = activeLoans.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
  const criticalAlerts = alerts.filter((a) => a.daysRemaining !== undefined && a.daysRemaining <= 30);

  const firstName = user?.firstName || user?.contactName?.split(' ')[0] || '';

  const quickActions = [
    {
      emoji: '📅',
      label: 'Book Appointment',
      description: 'Schedule a call with your broker',
      color: '#f5a623',
      bg: 'rgba(245,166,35,0.1)',
      border: 'rgba(245,166,35,0.3)',
      action: () => window.open(BOOK_URL, '_blank'),
    },
    {
      emoji: '🏦',
      label: 'My Loans',
      description: 'View loan details & rates',
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.1)',
      border: 'rgba(96,165,250,0.3)',
      action: () => router.push('/loans'),
    },
    {
      emoji: '💰',
      label: 'Financials',
      description: 'Income, expenses & assets',
      color: '#34d399',
      bg: 'rgba(52,211,153,0.1)',
      border: 'rgba(52,211,153,0.3)',
      action: () => router.push('/financials'),
    },
    {
      emoji: '👥',
      label: 'Refer a Friend',
      description: 'Earn rewards for referrals',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.1)',
      border: 'rgba(167,139,250,0.3)',
      action: () => router.push('/refer'),
    },
    {
      emoji: '👤',
      label: 'My Details',
      description: 'Update personal information',
      color: '#fb7185',
      bg: 'rgba(251,113,133,0.1)',
      border: 'rgba(251,113,133,0.3)',
      action: () => router.push('/details'),
    },
    {
      emoji: '🎁',
      label: 'Offers',
      description: 'Exclusive deals for you',
      color: '#f472b6',
      bg: 'rgba(244,114,182,0.1)',
      border: 'rgba(244,114,182,0.3)',
      action: () => router.push('/offers'),
    },
    {
      emoji: '⚙️',
      label: 'Preferences',
      description: 'Email & notification settings',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.1)',
      border: 'rgba(148,163,184,0.3)',
      action: () => router.push('/preferences'),
    },
    {
      emoji: '🏠',
      label: 'Property Report',
      description: 'Market values & estimates',
      color: '#38bdf8',
      bg: 'rgba(56,189,248,0.1)',
      border: 'rgba(56,189,248,0.3)',
      action: () => router.push('/property-report'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Greeting */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back{firstName ? `, ${firstName}` : ''}! 👋
                </h1>
                <p className="text-gray-400 text-sm mt-1">Here's your mortgage snapshot</p>
              </div>
              {/* Book CTA — prominent */}
              <button
                onClick={() => window.open(BOOK_URL, '_blank')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, #f5a623, #e8952c)',
                  color: '#0a1628',
                  boxShadow: '0 4px 16px rgba(245,166,35,0.3)',
                }}
              >
                <span>📅</span> Book Appointment
              </button>
            </div>

            {/* Loan summary banner */}
            {activeLoans.length > 0 && (
              <div
                className="rounded-xl p-5 border"
                style={{ backgroundColor: '#0f1d32', borderColor: '#1a2d52' }}
              >
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Active Loans</p>
                    <p className="text-3xl font-bold text-white mt-1">{activeLoans.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Balance</p>
                    <p className="text-3xl font-bold text-[#f5a623] mt-1">{fmtCurrency(totalBalance)}</p>
                  </div>
                  {activeLoans[0]?.interestRate && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Interest Rate</p>
                      <p className="text-3xl font-bold text-white mt-1">{activeLoans[0].interestRate}%</p>
                    </div>
                  )}
                  {activeLoans[0]?.lender && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Lender</p>
                      <p className="text-3xl font-bold text-white mt-1">{activeLoans[0].lender}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push('/loans')}
                  className="mt-4 text-sm font-medium transition-colors"
                  style={{ color: '#f5a623' }}
                >
                  View full loan details →
                </button>
              </div>
            )}

            {/* Critical alerts */}
            {criticalAlerts.length > 0 && (
              <div
                className="rounded-xl p-4 border flex items-start gap-3"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-red-400 font-semibold text-sm">
                    {criticalAlerts.length} alert{criticalAlerts.length > 1 ? 's' : ''} need your attention
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {criticalAlerts[0]?.message || 'Action required on your loan'}
                  </p>
                  <button
                    onClick={() => router.push('/alerts')}
                    className="mt-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    View alerts →
                  </button>
                </div>
              </div>
            )}

            {/* Quick actions grid */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
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

            {/* No loans state */}
            {loans.length === 0 && (
              <div
                className="rounded-xl p-10 text-center border"
                style={{ backgroundColor: '#0f1d32', borderColor: '#1a2d52' }}
              >
                <p className="text-4xl mb-3">🏠</p>
                <p className="text-white font-semibold">No loan data yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">
                  Your loan information will appear here once your application is in progress.
                </p>
                <button
                  onClick={() => window.open(BOOK_URL, '_blank')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #f5a623, #e8952c)',
                    color: '#0a1628',
                  }}
                >
                  📅 Book a Free Appointment
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
