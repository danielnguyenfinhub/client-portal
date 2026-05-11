'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function requestOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No account found for this email. Please contact your broker.')
        return
      }
      setUserId(data.userId)
      setStep('otp')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function resendOTP() {
    setResending(true)
    setResent(false)
    setError('')
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }),
      })
      const data = await res.json()
      if (res.ok) {
        setUserId(data.userId)
        setResent(true)
        setOtp('')
      } else {
        setError(data.error || 'Failed to resend code.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setResending(false)
    }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid or expired code. Please try again.')
        return
      }
      // Always go straight to dashboard — no passphrase step
      window.location.href = '/dashboard'
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: '#0a1628' }}>
      {/* Background gradient */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(245,166,35,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(30,50,100,0.4) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #f5a623, #e8952c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 22, color: '#0a1628',
              boxShadow: '0 4px 20px rgba(245,166,35,0.3)'
            }}>F</div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white leading-none">FinHub</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Finance &amp; Mortgage</div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white">Client Portal</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Your mortgage. Your way.</p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 32,
          backdropFilter: 'blur(10px)',
        }}>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <h3 className="text-lg font-semibold text-white mb-1">Sign in to your portal</h3>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Enter your email address and we'll send you a secure sign-in code.
              </p>
              <form onSubmit={requestOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      color: 'white',
                      fontSize: 15,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                    <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? 'rgba(245,166,35,0.5)' : 'linear-gradient(135deg, #f5a623, #e8952c)',
                    color: '#0a1628',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '13px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Sending code…' : 'Send Sign-In Code →'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <h3 className="text-lg font-semibold text-white mb-1">Check your inbox</h3>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We sent a 6-digit code to{' '}
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{email}</strong>.
                {' '}Valid for 10 minutes.
              </p>

              {resent && (
                <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <p className="text-sm" style={{ color: '#86efac' }}>✅ New code sent — check your inbox.</p>
                </div>
              )}

              <form onSubmit={verifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    6-Digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      padding: '14px 16px',
                      color: 'white',
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: '0.5em',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                    <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  style={{
                    width: '100%',
                    background: (loading || otp.length < 6) ? 'rgba(245,166,35,0.4)' : 'linear-gradient(135deg, #f5a623, #e8952c)',
                    color: '#0a1628',
                    fontWeight: 700,
                    fontSize: 15,
                    padding: '13px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'Verifying…' : 'Sign In →'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={resendOTP}
                    disabled={resending}
                    className="text-sm transition-colors"
                    style={{ color: resending ? 'rgba(255,255,255,0.3)' : '#f5a623' }}
                  >
                    {resending ? 'Sending…' : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); setError(''); setResent(false); }}
                    className="text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    ← Different email
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Need help?{' '}
          <a href="mailto:daniel@finhub.net.au" style={{ color: '#f5a623' }} className="hover:underline">
            daniel@finhub.net.au
          </a>
          {' '}· 0430 11 11 88
        </p>
      </div>
    </div>
  )
}
