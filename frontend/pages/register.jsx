import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import toast from 'react-hot-toast'

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    password: '',
    first_name: '',
    last_name: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
        formData
      )

      if (response.data.success) {
        toast.success('Registration successful! Verify OTP to continue.')
        // Store user ID for OTP verification
        localStorage.setItem('registerUserId', response.data.user.id)
        localStorage.setItem('otpSecret', response.data.otp_secret)
        // Redirect to OTP page
        window.location.href = '/verify-otp'
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Register - SURETY</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-white to-accent flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-lg mx-auto mb-4"></div>
            <h1 className="text-3xl font-bold text-primary">SURETY</h1>
            <p className="text-gray-600 mt-2">Join the Trust Network</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-dark mb-6">Create Account</h2>

            {/* First Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="John"
              />
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="Doe"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="you@example.com"
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="+237123456789"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-600 mt-1">Min 8 characters</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-600 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  )
}

export default Register
