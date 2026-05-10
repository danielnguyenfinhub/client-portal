'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  emoji: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', emoji: '🏠' },
  { label: 'Loans',     href: '/loans',     emoji: '🏦' },
  { label: 'Details',   href: '/details',   emoji: '👤' },
  { label: 'Financials',href: '/financials',emoji: '💰' },
  { label: 'Assets',    href: '/assets',    emoji: '🏡' },
  { label: 'Alerts',    href: '/alerts',    emoji: '⏰' },
  { label: 'Offers',    href: '/offers',    emoji: '🎁' },
  { label: 'Refer',     href: '/refer',     emoji: '👥' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const [unreadCount,    setUnreadCount]    = useState(0);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [alertsRes, notifsRes] = await Promise.all([
          fetch('/api/alerts',              { credentials: 'include' }),
          fetch('/api/notifications?limit=50', { credentials: 'include' }),
        ]);
        if (alertsRes.ok) {
          const d = await alertsRes.json();
          setCriticalAlerts(
            (d.alerts || []).filter((a: any) => a.daysRemaining !== undefined && a.daysRemaining <= 30).length
          );
        }
        if (notifsRes.ok) {
          const d = await notifsRes.json();
          setUnreadCount((d.notifications || []).filter((n: any) => !n.read).length);
        }
      } catch { /* ignore */ }
    }
    fetchCounts();
  }, [pathname]);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { /* ignore */ }
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0f1d32]/95 backdrop-blur-md border-b border-[#1a2d52]">
      <div className="max-w-2xl mx-auto px-4">

        {/* ── Top bar: Logo | Bell + Logout ── */}
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 shrink-0">
            <span className="text-[#f5a623] text-xl font-bold">Fin</span>
            <span className="text-white text-xl font-bold">Hub</span>
          </button>

          {/* Right: bell + logout */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => router.push('/dashboard')}
              className="relative p-2 text-gray-400 hover:text-white transition-colors"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#f5a623] rounded-full text-[9px] font-bold text-[#0a1628] flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* ── Scrollable pill nav — same on ALL screen sizes ── */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
          <div className="flex gap-1 min-w-max">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`relative flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#f5a623]/15 text-[#f5a623]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                  {item.href === '/alerts' && criticalAlerts > 0 && (
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </nav>
  );
}
