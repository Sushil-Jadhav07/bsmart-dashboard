import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clsx } from 'clsx'
import {
  ArrowLeft, ArrowRight, AtSign, BadgeCheck, Briefcase, Eye, EyeOff, KeyRound, Lock, Megaphone, ShieldAlert,
  ShieldCheck, ShoppingBag, Sparkles, Wallet,
} from 'lucide-react'
import { login } from '../store/authSlice.js'
import { connectSocket, fetchNotifications } from '../store/notificationsSlice.js'
import { registerFCMToken } from '../lib/firebase.js'
import { API_BASE_URL, API_BASE_WITH_PATH } from '../lib/apiBase.js'
import logo from '../assets/bsmart_logo.png'

// Each workspace only accepts the matching account role.
const WORKSPACES = [
  { key: 'admin', label: 'Super Admin', roles: ['admin'], hint: 'Full platform administration' },
  { key: 'sales', label: 'Sales CRM', roles: ['sales'], hint: 'Vendor onboarding and sales pipeline' },
]

const CAPABILITIES = [
  { icon: Briefcase, label: 'Vendors', text: 'Onboarding & validation', tone: 'bg-pink-100 text-[#C81345]' },
  { icon: ShoppingBag, label: 'Marketplace', text: 'Orders, refunds & sellers', tone: 'bg-purple-100 text-[#8E35B5]' },
  { icon: Megaphone, label: 'Campaigns', text: 'Spotlights & promo review', tone: 'bg-amber-100 text-amber-700' },
  { icon: Wallet, label: 'Vault', text: 'Coin wallets & payouts', tone: 'bg-emerald-100 text-emerald-700' },
]

const inputShell = 'flex h-11 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3.5 transition focus-within:border-[#E8194E]/50 focus-within:ring-4 focus-within:ring-[#E8194E]/10'
const inputCls = 'h-full w-full bg-transparent text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400'
const labelCls = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-neutral-700'

// Pings the API's health route so the status chip reflects reality.
function useApiHealth() {
  const [state, setState] = useState('checking')
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal })
      .then((res) => { if (!cancelled) setState(res.ok ? 'up' : 'degraded') })
      .catch(() => { if (!cancelled) setState('down') })
      .finally(() => clearTimeout(timer))
    return () => { cancelled = true; controller.abort() }
  }, [])
  return state
}

const HEALTH = {
  checking: { label: 'Checking systems…', dot: 'bg-neutral-400', cls: 'text-neutral-600' },
  up: { label: 'Systems Nominal', dot: 'bg-emerald-500', cls: 'text-emerald-700' },
  degraded: { label: 'Systems Degraded', dot: 'bg-amber-500', cls: 'text-amber-700' },
  down: { label: 'API Unreachable', dot: 'bg-rose-500', cls: 'text-rose-700' },
}

function ResetPanel({ initialEmail, onBack }) {
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const call = async (path, body) => {
    const res = await fetch(`${API_BASE_WITH_PATH}/auth/forgot-password/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Request failed')
    return data
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      if (step === 'request') {
        const data = await call('check', { email: email.trim() })
        setMessage({ tone: 'ok', text: data?.message || 'A verification code has been sent to your email.' })
        setStep('verify')
      } else {
        await call('verify-reset', { email: email.trim(), otp: otp.trim(), newPassword: password })
        setMessage({ tone: 'ok', text: 'Password updated. You can sign in with your new password.' })
        setStep('done')
      }
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <button type="button" onClick={onBack} className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-neutral-600 hover:text-neutral-900">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back to sign in
      </button>
      <div>
        <h2 className="font-display text-[20px] font-bold text-neutral-900">Reset your password</h2>
        <p className="mt-0.5 text-[12.5px] text-neutral-500">We'll email a 6-digit code. Your account must have two-factor authentication turned on.</p>
      </div>

      {step !== 'done' && (
        <div>
          <label className={labelCls}>Work email address</label>
          <div className={inputShell}>
            <AtSign className="h-4 w-4 flex-shrink-0 text-neutral-400" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={step === 'verify'} placeholder="name@company.com" className={inputCls} />
          </div>
        </div>
      )}

      {step === 'verify' && (
        <>
          <div>
            <label className={labelCls}>Verification code</label>
            <div className={inputShell}>
              <KeyRound className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              <input inputMode="numeric" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" className={clsx(inputCls, 'tracking-[0.3em]')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <div className={inputShell}>
              <Lock className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputCls} />
            </div>
          </div>
        </>
      )}

      {message && (
        <div className={clsx('rounded-xl border px-3.5 py-2.5 text-[12.5px]', message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700')}>
          {message.text}
        </div>
      )}

      {step === 'done' ? (
        <button type="button" onClick={onBack} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[14px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5">
          Return to sign in <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[14px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
          {busy ? 'Please wait…' : step === 'request' ? 'Send verification code' : 'Update password'}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      )}
    </form>
  )
}

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const status = useSelector((s) => s.auth.status)
  const serverError = useSelector((s) => s.auth.error)
  const health = useApiHealth()
  const [workspace, setWorkspace] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)

  const active = WORKSPACES.find((w) => w.key === workspace)
  const loading = status === 'loading'
  const shownError = error || (status === 'failed' ? serverError : '')
  const healthMeta = HEALTH[health]

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    dispatch(login({ email, password, remember, allowedRoles: active.roles }))
      .unwrap()
      .then((result) => {
        const userId = result?.user?.id || result?.user?._id
        if (userId) connectSocket(String(userId), dispatch)
        dispatch(fetchNotifications())
        if (result?.token) registerFCMToken(result.token)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {})
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FBF7FB]">
      {/* Background wash */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-[480px] w-[480px] rounded-full bg-purple-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-rose-100/60 blur-3xl" />
      </div>

      {/* Top-right status */}
      <div className="relative z-10 flex justify-end gap-2 px-6 pt-5">
        <span className={clsx('inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11.5px] font-semibold shadow-sm backdrop-blur', healthMeta.cls)}>
          <span className={clsx('h-1.5 w-1.5 rounded-full', healthMeta.dot, health === 'up' && 'animate-pulse')} /> {healthMeta.label}
        </span>
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-52px)] max-w-[1240px] grid-cols-1 items-center gap-10 px-6 pb-10 lg:grid-cols-[1.1fr_440px] lg:px-10">
        {/* Brand panel */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl shadow-[0_10px_24px_-10px_rgba(232,25,78,0.7)]">
              <img src={logo} alt="B-smart" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-[20px] font-bold tracking-tight text-neutral-900">B-smart</p>
                <span className="rounded-md border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#C81345]">Admin & Sales</span>
              </div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-neutral-500">Unified Commerce & CRM Console</p>
            </div>
            <span className="ml-auto rounded-md border border-neutral-200 bg-white/80 px-2 py-0.5 font-mono text-[10.5px] text-neutral-600">{import.meta.env.MODE}</span>
          </div>

          <span className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/70 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#C81345]">
            <Sparkles className="h-3.5 w-3.5" /> Enterprise operations & sales intelligence
          </span>
          <h1 className="mt-4 font-display text-[46px] font-extrabold leading-[1.05] tracking-tight text-neutral-900">
            Command social commerce & sales from{' '}
            <span className="bg-gradient-to-r from-[#E8194E] to-[#8E35B5] bg-clip-text text-transparent">one console.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-600">
            Manage merchant onboarding, settle marketplace orders, review promotional campaigns, moderate bSparks and buzz, and keep coin wallets in check, all from one role-based workspace.
          </p>

          <div className="mt-8 rounded-2xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_50px_-30px_rgba(16,24,40,0.35)] backdrop-blur">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-700">One console for</p>
            <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {CAPABILITIES.map((c) => (
                <div key={c.label} className="group rounded-xl bg-[#F6F4FB] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                  <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110', c.tone)}><c.icon className="h-4 w-4" /></span>
                  <p className="mt-2 text-[13px] font-bold text-neutral-900">{c.label}</p>
                  <p className="text-[11px] text-neutral-500">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">Workspaces:</span>
            {WORKSPACES.map((w) => (
              <span key={w.key} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/80 px-2.5 py-0.5 text-[11.5px] font-semibold text-neutral-700">
                <span className={clsx('h-1.5 w-1.5 rounded-full', w.key === 'admin' ? 'bg-[#E8194E]' : 'bg-[#8E35B5]')} /> {w.label}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/70 px-2 py-0.5"><ShieldCheck className="h-3 w-3 text-emerald-600" /> Role-based access</span>
            {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/70 px-2 py-0.5"><Lock className="h-3 w-3 text-emerald-600" /> Encrypted connection</span>
            )}
            <span className="font-mono text-neutral-400">host: {typeof window !== 'undefined' ? window.location.host : ''}</span>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <img src={logo} alt="B-smart" className="h-10 w-10 rounded-xl" />
            <p className="font-display text-[20px] font-bold text-neutral-900">B-smart</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/95 p-7 shadow-[0_30px_70px_-30px_rgba(76,29,90,0.45)] backdrop-blur">
            {resetting ? (
              <ResetPanel initialEmail={email} onBack={() => setResetting(false)} />
            ) : (
              <>
                <div className="flex rounded-xl bg-[#F3F1F8] p-1">
                  {WORKSPACES.map((w) => (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => { setWorkspace(w.key); setError('') }}
                      className={clsx(
                        'flex-1 rounded-lg py-2 text-[12.5px] font-bold transition',
                        workspace === w.key ? 'bg-gradient-to-r from-[#E8194E] to-[#C0114A] text-white shadow-[0_6px_14px_-6px_rgba(232,25,78,0.7)]' : 'text-neutral-600 hover:text-neutral-900'
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex flex-col items-center text-center">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl shadow-[0_10px_24px_-10px_rgba(232,25,78,0.7)]">
                    <img src={logo} alt="" className="h-full w-full object-cover" />
                  </div>
                  <h2 className="mt-3 font-display text-[22px] font-bold tracking-tight text-neutral-900">Welcome to B-smart</h2>
                  <p className="mt-0.5 text-[12.5px] text-neutral-500">{active.hint}. Sign in with your authorized account.</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className={labelCls}>Work email address</label>
                    <div className={inputShell}>
                      <AtSign className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                      <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-700">Password</label>
                      <button type="button" onClick={() => setResetting(true)} className="text-[11.5px] font-bold text-[#C81345] hover:underline">Forgot password?</button>
                    </div>
                    <div className={inputShell}>
                      <Lock className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                      <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" className={inputCls} />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-neutral-400 transition hover:text-neutral-700">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-neutral-700">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-[#E8194E]" />
                    Keep me signed in on this device
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E8194E] to-[#8E35B5] text-[14px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(232,25,78,0.7)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_rgba(232,25,78,0.8)] disabled:translate-y-0 disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Sign in to Command Console'}
                    {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>

                  {shownError && (
                    <div className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
                      <p className="text-[12.5px] text-rose-800"><span className="font-bold">Access denied: </span>{shownError}</p>
                    </div>
                  )}
                </form>

                <div className="mt-6 border-t border-neutral-100 pt-4 text-center">
                  <p className="text-[12px] text-neutral-600">
                    Need access? New admin accounts are created by an existing <span className="font-bold text-[#C81345]">Super Admin</span>.
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-400"><BadgeCheck className="h-3 w-3" /> Sessions are signed tokens and end on sign out</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
