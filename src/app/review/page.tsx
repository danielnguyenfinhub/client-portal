'use client'

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Loan {
  id: string;
  lender: string;
  lenderLogo?: string;
  balance: number;
  interestRate: number;
  rateType: string;
  settlementDate?: string;
  fixedExpiry?: string;
  productName?: string;
}

interface FormData {
  selectedLoans: string[];
  reviewType: string;
  additionalContext: string;
  preferredContact: string;
}

const REVIEW_TYPES = [
  { value: 'rate-review', emoji: '🔍', label: 'Rate Review', desc: 'Check if there\'s a better rate available' },
  { value: 'refinance', emoji: '💰', label: 'Refinance Assessment', desc: 'Explore switching to a different lender' },
  { value: 'top-up', emoji: '🏠', label: 'Top-Up / Equity Release', desc: 'Access equity in your property' },
  { value: 'general', emoji: '📋', label: 'General Review', desc: 'Overall loan health check' },
];

const CONTACT_METHODS = [
  { value: 'phone', emoji: '📱', label: 'Phone call' },
  { value: 'email', emoji: '📧', label: 'Email' },
  { value: 'portal', emoji: '💬', label: 'Portal notification' },
];

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 ${type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'} text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">✕</button>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export default function ReviewPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState<FormData>({
    selectedLoans: [],
    reviewType: '',
    additionalContext: '',
    preferredContact: 'phone',
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/loans', { credentials: 'include' });
        if (res.status === 401) { router.push('/'); return; }
        if (!res.ok) throw new Error('Failed to load loans');
        const data = await res.json();
        const loanList = Array.isArray(data) ? data : data.loans || [];
        setLoans(loanList);

        // Pre-select from URL params
        const params = new URLSearchParams(window.location.search);
        const loanId = params.get('loanId');
        const type = params.get('type');
        if (loanId && loanList.some((l: Loan) => l.id === loanId)) {
          setForm((prev) => ({ ...prev, selectedLoans: [loanId] }));
        }
        if (type && REVIEW_TYPES.some((rt) => rt.value === type)) {
          setForm((prev) => ({ ...prev, reviewType: type }));
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load loans');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function toggleLoan(loanId: string) {
    setForm((prev) => ({
      ...prev,
      selectedLoans: prev.selectedLoans.includes(loanId)
        ? prev.selectedLoans.filter((id) => id !== loanId)
        : [...prev.selectedLoans, loanId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.selectedLoans.length === 0 && loans.length > 0) {
      setToast({ message: 'Please select at least one loan to review', type: 'error' });
      return;
    }
    if (!form.reviewType) {
      setToast({ message: 'Please select a review type', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanIds: form.selectedLoans,
          reviewType: form.reviewType,
          additionalContext: form.additionalContext.trim() || undefined,
          preferredContact: form.preferredContact,
        }),
      });

      if (res.status === 401) { router.push('/'); return; }
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to submit review request');
      }

      setSubmitted(true);
      setToast({ message: 'Review request sent!', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to submit', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#f5a623] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Loading your loans...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center px-4">
        <div className="bg-[#0f1d32] border border-[#1a2d52] rounded-xl p-10 text-center max-w-lg w-full">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-bold mb-3">Review Requested!</h2>
          <p className="text-gray-400 mb-6">
            Daniel will review your loan(s) and get back to you within 2 business days via your preferred contact method.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#f5a623] hover:bg-[#d4891c] text-[#0a1628] font-semibold px-6 py-3 rounded-lg transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">🔄 Loan Review With Your Broker</h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            Request a review and your broker will check your current rates and explore better options for you.
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-[#f5a623] to-transparent rounded mt-4" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Loan Selection */}
          {loans.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Loan(s) to Review</h2>
              <div className="space-y-3">
                {loans.map((loan) => {
                  const selected = form.selectedLoans.includes(loan.id);
                  return (
                    <button
                      key={loan.id}
                      type="button"
                      onClick={() => toggleLoan(loan.id)}
                      className={`w-full text-left bg-[#0f1d32] border rounded-xl p-4 transition-all ${
                        selected
                          ? 'border-[#f5a623] bg-[#f5a623]/5'
                          : 'border-[#1a2d52] hover:border-[#f5a623]/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selected ? 'border-[#f5a623] bg-[#f5a623]' : 'border-gray-500'
                        }`}>
                          {selected && <span className="text-[#0a1628] text-xs font-bold">✓</span>}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{loan.lender}</span>
                            {loan.productName && (
                              <span className="text-gray-400 text-sm">— {loan.productName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm flex-wrap">
                            <span className="text-gray-400">
                              {formatCurrency(loan.balance)} at{' '}
                              <span className="text-[#f5a623]">{loan.interestRate.toFixed(2)}%</span>{' '}
                              ({loan.rateType})
                            </span>
                            {loan.settlementDate && (
                              <span className="text-gray-500">
                                Settled {new Date(loan.settlementDate).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                            {loan.fixedExpiry && (
                              <span className="text-amber-400 text-xs">
                                Fixed expires {new Date(loan.fixedExpiry).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review Type */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Review Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REVIEW_TYPES.map((rt) => {
                const selected = form.reviewType === rt.value;
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, reviewType: rt.value }))}
                    className={`text-left bg-[#0f1d32] border rounded-xl p-4 transition-all ${
                      selected
                        ? 'border-[#f5a623] bg-[#f5a623]/5'
                        : 'border-[#1a2d52] hover:border-[#f5a623]/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        selected ? 'border-[#f5a623]' : 'border-gray-500'
                      }`}>
                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#f5a623]" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {rt.emoji} {rt.label}
                        </p>
                        <p className="text-gray-400 text-sm mt-0.5">{rt.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Additional Context</h2>
            <div className="bg-[#0f1d32] border border-[#1a2d52] rounded-xl p-5">
              <label className="block text-sm text-gray-400 mb-2">
                Anything specific you&apos;d like Daniel to look at?
              </label>
              <textarea
                value={form.additionalContext}
                onChange={(e) => setForm((prev) => ({ ...prev, additionalContext: e.target.value }))}
                placeholder="E.g., I've seen a lower rate advertised, my fixed rate is expiring soon, I'd like to access some equity for renovations..."
                rows={4}
                className="w-full bg-[#1a2d52] border border-[#f5a623]/50 text-white px-3 py-2 rounded-lg focus:border-[#f5a623] outline-none resize-none"
              />
            </div>
          </div>

          {/* Preferred Contact */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Preferred Contact Method</h2>
            <div className="flex flex-wrap gap-3">
              {CONTACT_METHODS.map((cm) => {
                const selected = form.preferredContact === cm.value;
                return (
                  <button
                    key={cm.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, preferredContact: cm.value }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                      selected
                        ? 'border-[#f5a623] bg-[#f5a623]/10 text-[#f5a623]'
                        : 'border-[#1a2d52] bg-[#0f1d32] text-gray-400 hover:border-[#f5a623]/30'
                    }`}
                  >
                    <span>{cm.emoji}</span>
                    <span className="text-sm font-medium">{cm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#f5a623] hover:bg-[#d4891c] text-[#0a1628] font-semibold px-8 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {submitting ? 'Submitting...' : 'Request Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
