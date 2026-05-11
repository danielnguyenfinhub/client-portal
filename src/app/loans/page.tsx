'use client'

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback , Suspense} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(v);

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-AU');

const INACTIVE_CODES = [12, 13, 14];

function isActiveLoan(opp: any): boolean {
  const code = opp.statusCode ?? opp.status?.code ?? opp.opportunityStatusCode;
  if (typeof code === 'number') return !INACTIVE_CODES.includes(code);
  return true;
}

function daysUntil(ms: number): number {
  return Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-[#1a2d52] rounded w-1/3" />
      <div className="h-32 bg-[#1a2d52] rounded-xl" />
      <div className="h-32 bg-[#1a2d52] rounded-xl" />
      <div className="h-32 bg-[#1a2d52] rounded-xl" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-3 mt-4">
      <div className="h-6 bg-[#1a2d52] rounded w-1/4" />
      <div className="h-20 bg-[#1a2d52] rounded-xl" />
      <div className="h-6 bg-[#1a2d52] rounded w-1/4" />
      <div className="h-20 bg-[#1a2d52] rounded-xl" />
    </div>
  );
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
        toast.type === 'success'
          ? 'bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#22c55e]'
          : 'bg-red-500/20 border border-red-500/40 text-red-400'
      }`}
    >
      {toast.type === 'success' ? '✅' : '❌'} {toast.message}
    </div>
  );
}

interface EditingField {
  loanId: string;
  itemType: 'asset' | 'liability';
  itemId: string;
  field: string;
  currentValue: number;
}

function LoansPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailCache, setDetailCache] = useState<Record<string, any>>({});
  const [detailLoading, setDetailLoading] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/loans', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('Failed to load loans');
      const data = await res.json();
      setLoans(data.loans || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Auto-expand highlighted loan
  useEffect(() => {
    if (highlightId && loans.length > 0) {
      setExpandedIds((prev) => new Set([...prev, highlightId]));
      // Scroll to it
      setTimeout(() => {
        const el = document.getElementById(`loan-${highlightId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [highlightId, loans]);

  const toggleExpand = async (oppId: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(oppId)) {
      newSet.delete(oppId);
    } else {
      newSet.add(oppId);
      // Fetch detail if not cached
      if (!detailCache[oppId]) {
        setDetailLoading((prev) => new Set([...prev, oppId]));
        try {
          const res = await fetch(`/api/loans/${oppId}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setDetailCache((prev) => ({ ...prev, [oppId]: data }));
          }
        } catch {
          // ignore
        } finally {
          setDetailLoading((prev) => {
            const n = new Set(prev);
            n.delete(oppId);
            return n;
          });
        }
      }
    }
    setExpandedIds(newSet);
  };

  const startEditing = (loanId: string, itemType: 'asset' | 'liability', itemId: string, field: string, currentValue: number) => {
    setEditing({ loanId, itemType, itemId, field, currentValue });
    setEditValue(String(currentValue || 0));
  };

  const cancelEditing = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const endpoint =
        editing.itemType === 'asset'
          ? `/api/loans/${editing.loanId}/assets`
          : `/api/loans/${editing.loanId}/liabilities`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.itemId,
          [editing.field]: parseFloat(editValue) || 0,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      // Refresh the detail
      const detailRes = await fetch(`/api/loans/${editing.loanId}`, { credentials: 'include' });
      if (detailRes.ok) {
        const data = await detailRes.json();
        setDetailCache((prev) => ({ ...prev, [editing.loanId]: data }));
      }

      setToast({ message: 'Updated successfully', type: 'success' });
      cancelEditing();
    } catch {
      setToast({ message: 'Failed to save — please try again', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const activeCount = loans.filter(isActiveLoan).length;

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Navbar />
      {toast && <ToastMessage toast={toast} onDismiss={() => setToast(null)} />}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🏦</span> My Loans
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f5a623]/20 text-[#f5a623] ml-2">
              {loans.length} total
            </span>
          </h1>
          {activeCount > 0 && (
            <span className="text-sm text-gray-400">
              {activeCount} active · {loans.length - activeCount} inactive
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="bg-[#0f1d32] border border-red-500/30 rounded-xl p-8 text-center">
            <p className="text-red-400 text-lg mb-4">⚠️ {error}</p>
            <button
              onClick={fetchLoans}
              className="bg-[#f5a623] hover:bg-[#d4891c] text-[#0a1628] font-semibold px-6 py-3 rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        ) : loans.length === 0 ? (
          <div className="bg-[#0f1d32] border border-[#1a2d52] rounded-xl p-12 text-center">
            <p className="text-4xl mb-4">🏠</p>
            <p className="text-white text-lg font-semibold">No loans found</p>
            <p className="text-gray-400 mt-2">Your loan information will appear here once available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => {
              const active = isActiveLoan(loan);
              const expanded = expandedIds.has(loan.opportunityId);
              const detail = detailCache[loan.opportunityId];
              const isLoadingDetail = detailLoading.has(loan.opportunityId);

              return (
                <div
                  key={loan.opportunityId}
                  id={`loan-${loan.opportunityId}`}
                  className={`bg-[#0f1d32] border rounded-xl transition-all ${
                    expanded ? 'border-[#f5a623]/30' : 'border-[#1a2d52] hover:border-[#f5a623]/20'
                  }`}
                >
                  {/* Collapsed header — always visible */}
                  <button
                    onClick={() => toggleExpand(loan.opportunityId)}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <p className="text-white font-semibold text-lg">
                          {loan.lender || 'Unknown Lender'}
                        </p>
                        {active ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#22c55e]/20 text-[#22c55e]">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                      <div>
                        <p className="text-xl font-bold text-[#f5a623]">
                          {loan.loanAmount ? fmtCurrency(loan.loanAmount) : '—'}
                        </p>
                        <p className="text-xs text-gray-500">Loan Amount</p>
                      </div>
                      {loan.interestRate !== undefined && loan.interestRate !== null && (
                        <div>
                          <p className="text-xl font-bold text-white">{loan.interestRate}%</p>
                          <p className="text-xs text-gray-500">Interest Rate</p>
                        </div>
                      )}
                      {loan.products && loan.products.length > 0 && loan.products[0].repaymentAmount && (
                        <div>
                          <p className="text-xl font-bold text-white">
                            {fmtCurrency(loan.products[0].repaymentAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {loan.products[0].repaymentFrequency || 'Monthly'} Repayment
                          </p>
                        </div>
                      )}
                      {loan.settlementDate && (
                        <div>
                          <p className="text-sm text-gray-300">{fmtDate(loan.settlementDate)}</p>
                          <p className="text-xs text-gray-500">Settlement Date</p>
                        </div>
                      )}
                      {loan.loanType && (
                        <div>
                          <p className="text-sm text-gray-300">{loan.loanType}</p>
                          <p className="text-xs text-gray-500">Loan Type</p>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="border-t border-[#1a2d52] px-5 pb-5">
                      {isLoadingDetail ? (
                        <DetailSkeleton />
                      ) : !detail ? (
                        <p className="text-gray-400 py-6 text-center">Unable to load loan details</p>
                      ) : (
                        <div className="space-y-6 mt-5">
                          {/* Section 1: Loan Overview */}
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                              📋 Loan Overview
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {detail.purpose && (
                                <div>
                                  <p className="text-xs text-gray-500">Purpose</p>
                                  <p className="text-sm text-gray-200">{detail.purpose}</p>
                                </div>
                              )}
                              {detail.transactionType && (
                                <div>
                                  <p className="text-xs text-gray-500">Transaction Type</p>
                                  <p className="text-sm text-gray-200">{detail.transactionType}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500">Status</p>
                                <p className="text-sm text-gray-200">{active ? 'Active' : 'Inactive'}</p>
                              </div>
                              {detail.settlementDate && (
                                <div>
                                  <p className="text-xs text-gray-500">Settlement Date</p>
                                  <p className="text-sm text-gray-200">{fmtDate(detail.settlementDate)}</p>
                                </div>
                              )}
                              {detail.preApprovalExpiry && (
                                <div>
                                  <p className="text-xs text-gray-500">Pre-Approval Expiry</p>
                                  <p className="text-sm text-gray-200">{fmtDate(detail.preApprovalExpiry)}</p>
                                </div>
                              )}
                              {detail.loanWriter && (
                                <div>
                                  <p className="text-xs text-gray-500">Loan Writer</p>
                                  <p className="text-sm text-gray-200">{detail.loanWriter}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Section 2: Products */}
                          {detail.products && detail.products.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                💳 Products
                              </h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {detail.products.map((product: any, idx: number) => {
                                  const fixedExpiry = product.fixedRateExpiry || product.fixedRateExpiryDate;
                                  const ioExpiry = product.interestOnlyExpiry || product.interestOnlyExpiryDate;
                                  const fixedDays = fixedExpiry ? daysUntil(fixedExpiry) : null;
                                  const ioDays = ioExpiry ? daysUntil(ioExpiry) : null;

                                  return (
                                    <div
                                      key={product.productId || idx}
                                      className="bg-[#0a1628] border border-[#1a2d52] rounded-lg p-4"
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-white font-medium">
                                          {product.lender || loan.lender || 'Lender'}{' '}
                                          {product.productName && (
                                            <span className="text-gray-400 font-normal">
                                              — {product.productName}
                                            </span>
                                          )}
                                        </p>
                                        {product.rateType && (
                                          <span
                                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                              product.rateType.toLowerCase().includes('fixed')
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                            }`}
                                          >
                                            {product.rateType}
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {product.interestRate !== undefined && product.interestRate !== null && (
                                          <div>
                                            <p className="text-2xl font-bold text-[#f5a623]">
                                              {product.interestRate}%
                                            </p>
                                            <p className="text-xs text-gray-500">Interest Rate</p>
                                          </div>
                                        )}
                                        {product.loanAmount && (
                                          <div>
                                            <p className="text-lg font-semibold text-white">
                                              {fmtCurrency(product.loanAmount)}
                                            </p>
                                            <p className="text-xs text-gray-500">Loan Amount</p>
                                          </div>
                                        )}
                                        {product.repaymentAmount && (
                                          <div>
                                            <p className="text-lg font-semibold text-white">
                                              {fmtCurrency(product.repaymentAmount)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {product.repaymentFrequency || 'Monthly'} Repayment
                                            </p>
                                          </div>
                                        )}
                                        {product.lvr !== undefined && product.lvr !== null && (
                                          <div>
                                            <p className="text-lg font-semibold text-white">
                                              {product.lvr}%
                                            </p>
                                            <p className="text-xs text-gray-500">LVR</p>
                                          </div>
                                        )}
                                      </div>
                                      {/* Expiry warnings */}
                                      <div className="mt-3 space-y-1">
                                        {fixedExpiry && fixedDays !== null && (
                                          <div className="flex items-center gap-2">
                                            {fixedDays <= 30 ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                                                Fixed rate expires in {fixedDays} days
                                              </span>
                                            ) : fixedDays <= 90 ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f5a623]/20 text-[#f5a623]">
                                                Fixed rate expires in {fixedDays} days
                                              </span>
                                            ) : (
                                              <span className="text-xs text-gray-400">
                                                Fixed rate expires {fmtDate(fixedExpiry)}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {ioExpiry && ioDays !== null && (
                                          <div className="flex items-center gap-2">
                                            {ioDays <= 30 ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                                                IO period expires in {ioDays} days
                                              </span>
                                            ) : ioDays <= 90 ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f5a623]/20 text-[#f5a623]">
                                                IO period expires in {ioDays} days
                                              </span>
                                            ) : (
                                              <span className="text-xs text-gray-400">
                                                IO period expires {fmtDate(ioExpiry)}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section 3: Security/Assets */}
                          {detail.assets && detail.assets.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                🏡 Security &amp; Assets
                              </h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {detail.assets.map((asset: any, idx: number) => {
                                  const isEditingThis =
                                    editing &&
                                    editing.loanId === loan.opportunityId &&
                                    editing.itemType === 'asset' &&
                                    editing.itemId === (asset.assetId || asset.id || String(idx));

                                  return (
                                    <div
                                      key={asset.assetId || asset.id || idx}
                                      className="bg-[#0a1628] border border-[#1a2d52] rounded-lg p-4"
                                    >
                                      <p className="text-white font-medium mb-1">
                                        {asset.description || asset.type || asset.assetType || 'Asset'}
                                      </p>
                                      {asset.address && (
                                        <p className="text-sm text-gray-400 mb-2">{asset.address}</p>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <div>
                                          {isEditingThis ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 text-sm">$</span>
                                              <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="bg-[#0f1d32] border border-[#f5a623]/50 rounded px-3 py-1.5 text-[#f5a623] font-semibold w-40 focus:outline-none focus:border-[#f5a623]"
                                                autoFocus
                                              />
                                              <button
                                                onClick={saveEdit}
                                                disabled={saving}
                                                className="bg-[#22c55e]/20 text-[#22c55e] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#22c55e]/30 transition-all disabled:opacity-50"
                                              >
                                                {saving ? '...' : 'Save'}
                                              </button>
                                              <button
                                                onClick={cancelEditing}
                                                className="text-gray-400 px-2 py-1.5 rounded text-xs hover:text-white transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <p className="text-xl font-bold text-[#f5a623]">
                                                {asset.value || asset.estimatedValue
                                                  ? fmtCurrency(asset.value || asset.estimatedValue)
                                                  : '—'}
                                              </p>
                                              <p className="text-xs text-gray-500">Estimated Value</p>
                                            </>
                                          )}
                                        </div>
                                        {!isEditingThis && (
                                          <button
                                            onClick={() =>
                                              startEditing(
                                                loan.opportunityId,
                                                'asset',
                                                asset.assetId || asset.id || String(idx),
                                                'value',
                                                asset.value || asset.estimatedValue || 0
                                              )
                                            }
                                            className="border border-[#f5a623]/50 text-[#f5a623] hover:bg-[#f5a623]/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                          >
                                            Update Value
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section 4: Liabilities */}
                          {detail.liabilities && detail.liabilities.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                📊 Liabilities
                              </h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {detail.liabilities.map((liability: any, idx: number) => {
                                  const isEditingThis =
                                    editing &&
                                    editing.loanId === loan.opportunityId &&
                                    editing.itemType === 'liability' &&
                                    editing.itemId === (liability.liabilityId || liability.id || String(idx));

                                  return (
                                    <div
                                      key={liability.liabilityId || liability.id || idx}
                                      className="bg-[#0a1628] border border-[#1a2d52] rounded-lg p-4"
                                    >
                                      <p className="text-white font-medium mb-1">
                                        {liability.description || liability.type || liability.liabilityType || 'Liability'}
                                      </p>
                                      {liability.lender && (
                                        <p className="text-sm text-gray-400 mb-2">{liability.lender}</p>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <div>
                                          {isEditingThis ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 text-sm">$</span>
                                              <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="bg-[#0f1d32] border border-[#f5a623]/50 rounded px-3 py-1.5 text-[#f5a623] font-semibold w-40 focus:outline-none focus:border-[#f5a623]"
                                                autoFocus
                                              />
                                              <button
                                                onClick={saveEdit}
                                                disabled={saving}
                                                className="bg-[#22c55e]/20 text-[#22c55e] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#22c55e]/30 transition-all disabled:opacity-50"
                                              >
                                                {saving ? '...' : 'Save'}
                                              </button>
                                              <button
                                                onClick={cancelEditing}
                                                className="text-gray-400 px-2 py-1.5 rounded text-xs hover:text-white transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-4">
                                              <div>
                                                <p className="text-xl font-bold text-[#f5a623]">
                                                  {liability.balance || liability.currentBalance
                                                    ? fmtCurrency(liability.balance || liability.currentBalance)
                                                    : '—'}
                                                </p>
                                                <p className="text-xs text-gray-500">Current Balance</p>
                                              </div>
                                              {(liability.repayment || liability.repaymentAmount) && (
                                                <div>
                                                  <p className="text-sm text-gray-300">
                                                    {fmtCurrency(liability.repayment || liability.repaymentAmount)}
                                                  </p>
                                                  <p className="text-xs text-gray-500">Repayment</p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        {!isEditingThis && (
                                          <button
                                            onClick={() =>
                                              startEditing(
                                                loan.opportunityId,
                                                'liability',
                                                liability.liabilityId || liability.id || String(idx),
                                                'balance',
                                                liability.balance || liability.currentBalance || 0
                                              )
                                            }
                                            className="border border-[#f5a623]/50 text-[#f5a623] hover:bg-[#f5a623]/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                          >
                                            Update Balance
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section 5: Co-Borrowers / Related Parties */}
                          {detail.relatedParties && detail.relatedParties.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                👥 Co-Borrowers &amp; Related Parties
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {detail.relatedParties.map((party: any, idx: number) => (
                                  <div
                                    key={party.id || idx}
                                    className="bg-[#0a1628] border border-[#1a2d52] rounded-lg p-4"
                                  >
                                    <p className="text-white font-medium">
                                      {party.firstName} {party.lastName}
                                    </p>
                                    {party.relationship && (
                                      <p className="text-xs text-gray-500 mt-0.5">{party.relationship}</p>
                                    )}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
                                      {party.email && <span>✉️ {party.email}</span>}
                                      {party.mobile && <span>📱 {party.mobile}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function LoansPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <LoansPageInner />
    </Suspense>
  )
}
