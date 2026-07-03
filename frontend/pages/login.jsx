import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password }
      )

      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        toast.success('Login successful!')
        window.location.href = '/dashboard'
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Login - SURETY</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-white to-accent flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-lg mx-auto mb-4"></div>
            <h1 className="text-3xl font-bold text-primary">SURETY</h1>
            <p className="text-gray-600 mt-2">Digital Trust & Escrow Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-dark mb-6">Welcome Back</h2>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* Signup Link */}
            <p className="text-center text-gray-600 mt-6">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  )
}

export default Login
