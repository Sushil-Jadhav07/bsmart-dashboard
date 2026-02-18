import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { registerAdmin } from '../store/authSlice.js'

function AdminCreate() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const status = useSelector((s) => s.auth.adminCreateStatus)
  const error = useSelector((s) => s.auth.adminCreateError)

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username || !fullName || !email || !password) {
      setLocalError('Please fill required fields')
      return
    }
    dispatch(registerAdmin({ username, full_name: fullName, email, password, phone }))
      .unwrap()
      .then(() => navigate('/users', { replace: true }))
      .catch(() => {})
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Create Admin</h1>
          <p className="text-neutral-500 mt-1">Register a new administrator account</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(localError || error) && (
            <div className="text-sm text-red-600">{localError || error}</div>
          )}
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="adminuser"
            fullWidth
          />
          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Admin"
            fullWidth
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
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
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            fullWidth
          />
          <Button type="submit" variant="primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Creating…' : 'Create Admin'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default AdminCreate
