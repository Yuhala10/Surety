const db = require('../config/database');
const campayService = require('./campayService');

class WalletService {
  /**
   * Get wallet by user ID
   * @param {String} userId
   * @returns {Promise<Object>}
   */
  async getWallet(userId) {
    const result = await db.query(
      'SELECT * FROM wallet WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    return result.rows[0];
  }

  /**
   * Create deposit transaction
   * @param {String} userId
   * @param {Number} amount
   * @param {String} phone
   * @returns {Promise<Object>}
   */
  async initiateDeposit(userId, amount, phone) {
    try {
      // Initiate Campay payment
      const paymentResult = await campayService.initiatePayment({
        phone,
        amount,
        currency: 'XAF',
        description: `SURETY Wallet Deposit - ${amount} XAF`,
        externalId: `DEPOSIT-${userId}-${Date.now()}`,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/deposit-callback`
      });

      // Create wallet transaction record
      const txResult = await db.query(
        `INSERT INTO wallet_transactions (
          user_id, type, amount, reference, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, reference, status`,
        [userId, 'DEPOSIT', amount, paymentResult.transactionId, 'PENDING']
      );

      return {
        success: true,
        deposit_id: txResult.rows[0].id,
        reference: txResult.rows[0].reference,
        status: txResult.rows[0].status,
        amount,
        payment_data: paymentResult.data
      };
    } catch (error) {
      console.error('Deposit initiation error:', error);
      throw error;
    }
  }

  /**
   * Confirm deposit and update wallet
   * @param {String} userId
   * @param {String} reference - Campay reference
   * @returns {Promise<Object>}
   */
  async confirmDeposit(userId, reference) {
    try {
      // Check payment status with Campay
      const paymentStatus = await campayService.getPaymentStatus(reference);

      if (paymentStatus.status !== 'SUCCESSFUL') {
        return {
          success: false,
          message: 'Payment not successful',
          status: paymentStatus.status
        };
      }

      // Get amount from wallet transaction
      const txResult = await db.query(
        'SELECT id, amount FROM wallet_transactions WHERE user_id = $1 AND reference = $2',
        [userId, reference]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const transaction = txResult.rows[0];

      // Update wallet balance
      await db.query(
        `UPDATE wallet SET 
          balance = balance + $1,
          total_received = total_received + $2,
          updated_at = NOW()
         WHERE user_id = $3`,
        [transaction.amount, transaction.amount, userId]
      );

      // Update transaction status
      await db.query(
        'UPDATE wallet_transactions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['COMPLETED', transaction.id]
      );

      // Create notification
      await db.query(
        `INSERT INTO notifications (
          user_id, type, title, message, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [userId, 'DEPOSIT_SUCCESS', 'Deposit Successful', `XAF ${transaction.amount} has been added to your wallet`]
      );

      return {
        success: true,
        message: 'Deposit confirmed',
        amount: transaction.amount,
        new_balance: await this.getBalance(userId)
      };
    } catch (error) {
      console.error('Deposit confirmation error:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @param {String} userId
   * @returns {Promise<Number>}
   */
  async getBalance(userId) {
    const result = await db.query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    return result.rows[0].balance;
  }

  /**
   * Withdraw funds
   * @param {String} userId
   * @param {Number} amount
   * @param {String} phone - Recipient phone number
   * @returns {Promise<Object>}
   */
  async initiateWithdrawal(userId, amount, phone) {
    try {
      // Check balance
      const balance = await this.getBalance(userId);

      if (balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct from wallet (hold in withdrawal)
      await db.query(
        `UPDATE wallet SET 
          balance = balance - $1,
          updated_at = NOW()
         WHERE user_id = $2`,
        [amount, userId]
      );

      // Create withdrawal transaction
      const txResult = await db.query(
        `INSERT INTO wallet_transactions (
          user_id, type, amount, phone, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, reference, status`,
        [userId, 'WITHDRAWAL', amount, phone, 'PENDING']
      );

      // TODO: Integrate with Campay to send money to phone

      return {
        success: true,
        withdrawal_id: txResult.rows[0].id,
        reference: txResult.rows[0].reference,
        amount,
        status: 'PENDING',
        message: 'Withdrawal initiated'
      };
    } catch (error) {
      console.error('Withdrawal initiation error:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();
