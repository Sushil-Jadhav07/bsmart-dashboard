import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { register } from '../store/authSlice.js'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'

function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const status = useSelector((s) => s.auth.status)
  const serverError = useSelector((s) => s.auth.error)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !email || !password) {
      setError('Please fill all fields')
      return
    }
    dispatch(register({ name, email, password }))
      .unwrap()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => {})
  }

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-soft p-6">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-neutral-800">Create account</h1>
          <p className="text-sm text-neutral-500 mt-1">Start managing your platform</p>
        </div>
        {(error || serverError) && (
          <div className="mb-4 text-sm text-red-600">{error || serverError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            fullWidth
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            fullWidth
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            fullWidth
          />
          <Button type="submit" variant="primary" className="w-full" disabled={status === 'loading'}>
            Sign up
          </Button>
        </form>
        <div className="mt-4 text-sm text-neutral-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default Register
