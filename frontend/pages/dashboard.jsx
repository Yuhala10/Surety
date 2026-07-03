import Head from 'next/head'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import axios from 'axios'

const Dashboard = () => {
  const [user, setUser] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [trustScore, setTrustScore] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          window.location.href = '/login'
          return
        }

        const headers = { Authorization: `Bearer ${token}` }

        // Fetch user profile
        const userRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/users/profile`,
          { headers }
        )
        setUser(userRes.data.user)

        // Fetch wallet
        const walletRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/wallet`,
          { headers }
        )
        setWallet(walletRes.data.wallet)

        // Fetch trust score
        const scoreRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/trust-score/my`,
          { headers }
        )
        setTrustScore(scoreRes.data)

        // Fetch transactions
        const txRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions?limit=5`,
          { headers }
        )
        setTransactions(txRes.data.transactions)

        setLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load dashboard')
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard - SURETY</title>
      </Head>

      <div className="min-h-screen bg-light">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg"></div>
              <span className="text-primary font-bold text-xl">SURETY</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{user?.first_name} {user?.last_name}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  window.location.href = '/login'
                }}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-dark mb-2">
              Welcome back, {user?.first_name}! 👋
            </h1>
            <p className="text-gray-600">Here's your SURETY dashboard overview</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Trust Score Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-premium transition"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Trust Score</h3>
                <span className="text-2xl">💎</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {trustScore?.trust_score || 0}
                </span>
                <span className="text-gray-500">/100</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Tier: <span className="font-semibold text-primary">{trustScore?.trust_tier}</span>
              </p>
            </motion.div>

            {/* Wallet Balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-premium transition"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Wallet Balance</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                XAF {wallet?.balance?.toLocaleString() || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Escrow: XAF {wallet?.escrow_balance?.toLocaleString() || 0}
              </p>
            </motion.div>

            {/* Completed Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-premium transition"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Transactions</h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                {trustScore?.stats?.completed_transactions || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Total: {trustScore?.stats?.total_transactions || 0}
              </p>
            </motion.div>

            {/* Disputes Won */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-premium transition"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Disputes</h3>
                <span className="text-2xl">⚖️</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                {trustScore?.stats?.disputes_won || 0}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Won/Total: {trustScore?.stats?.disputes_won}/{trustScore?.stats?.total_disputes}
              </p>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8"
          >
            <h2 className="text-lg font-semibold text-dark mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition">
                Create Transaction
              </button>
              <button className="bg-accent text-primary px-6 py-2 rounded-lg hover:bg-opacity-80 transition">
                Deposit Funds
              </button>
              <button className="border border-primary text-primary px-6 py-2 rounded-lg hover:bg-accent transition">
                View Wallet
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-light transition">
                Settings
              </button>
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-dark mb-4">Recent Transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Code</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Title</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-light transition">
                        <td className="py-3 px-4 text-sm font-mono text-gray-700">{tx.transaction_code}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{tx.title}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-primary">XAF {tx.amount?.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            tx.status === 'DISPUTED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </>
  )
}

export default Dashboard
