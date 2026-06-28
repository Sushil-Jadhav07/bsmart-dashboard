import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { login } from '../store/authSlice.js'
import { connectSocket } from '../store/notificationsSlice.js'
import { fetchNotifications } from '../store/notificationsSlice.js'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import logo from '../assets/bsmart_logo.png'

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const status = useSelector((s) => s.auth.status)
  const serverError = useSelector((s) => s.auth.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    dispatch(login({ email, password }))
      .unwrap()
      .then((result) => {
        const userId = result?.user?.id || result?.user?._id
        if (userId) {
          connectSocket(String(userId), dispatch)
        }
        dispatch(fetchNotifications())
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-violet-500/[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#fff] flex items-center justify-center shadow-lg overflow-hidden mb-4">
            <img src={logo} alt="B-smart" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">Welcome back</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to your admin console</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6 sm:p-8">
          {(error || serverError) && (
            <div className="mb-5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error || serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              icon={Mail}
              fullWidth
              inputClassName="bg-white border-neutral-200 focus:border-primary transition-colors h-11"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                fullWidth
                inputClassName="bg-white border-neutral-200 focus:border-primary transition-colors h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] h-5 w-5 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 text-primary focus:ring-primary border-neutral-300 rounded cursor-pointer"
                />
                <span className="text-sm text-neutral-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 text-sm font-semibold shadow-brand transition-all active:scale-[0.98]"
              disabled={status === 'loading'}
              loading={status === 'loading'}
            >
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3 h-3" />
          Secured by B-smart Cloud
        </div>
      </div>
    </div>
  )
}

export default Login
