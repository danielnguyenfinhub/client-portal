'use client'

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  brokerName?: string;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-[#1a2d52] rounded-xl" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/details', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = res.ok ? await res.json() : null;
      if (data) setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

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
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Contact Details</p>
            <div className="space-y-3">
              <Row label="Name" value={profile ? `${profile.firstName} ${profile.lastName}`.trim() : '—'} />
              <Row label="Email" value={profile?.email || '—'} />
              <Row label="Mobile" value={profile?.mobile || '—'} />
              <Row label="Your Broker" value={profile?.brokerName || 'Daniel Nguyen'} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
