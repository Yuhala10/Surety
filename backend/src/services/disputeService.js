const db = require('../config/database');

class DisputeService {
  /**
   * Generate dispute code
   * @returns {String}
   */
  generateDisputeCode() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `DSP-${date}-${random}`;
  }

  /**
   * File a dispute
   * @param {Object} disputeData
   * @returns {Promise<Object>}
   */
  async fileDispute(disputeData) {
    try {
      const {
        transaction_id,
        initiated_by_user_id,
        other_party_id,
        reason,
        description,
        evidence_documents = []
      } = disputeData;

      // Get transaction to verify it exists
      const txResult = await db.query(
        'SELECT * FROM transactions WHERE id = $1',
        [transaction_id]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      // Check if dispute already exists for this transaction
      const existingDispute = await db.query(
        `SELECT id FROM disputes 
         WHERE transaction_id = $1 AND status != 'CLOSED'`,
        [transaction_id]
      );

      if (existingDispute.rows.length > 0) {
        throw new Error('Dispute already exists for this transaction');
      }

      // Generate dispute code
      const dispute_code = this.generateDisputeCode();

      // Calculate SLA deadline (5 business days from now)
      const resolved_by_date = new Date();
      resolved_by_date.setDate(resolved_by_date.getDate() + 7); // 7 days for SLA

      // Create dispute
      const result = await db.query(
        `INSERT INTO disputes (
          dispute_code, transaction_id, initiated_by_user_id, other_party_id,
          reason, description, evidence_documents, status, resolved_by_date,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, dispute_code, status, created_at`,
        [
          dispute_code,
          transaction_id,
          initiated_by_user_id,
          other_party_id,
          reason,
          description,
          JSON.stringify(evidence_documents),
          'OPEN',
          resolved_by_date
        ]
      );

      const dispute = result.rows[0];

      // Update transaction status
      await db.query(
        'UPDATE transactions SET status = $1, escrow_status = $2 WHERE id = $3',
        ['DISPUTED', 'DISPUTED', transaction_id]
      );

      // Create notifications
      await db.query(
        `INSERT INTO notifications (
          user_id, type, title, message, related_dispute_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW()), ($6, $7, $8, $9, $10, NOW())`,
        [
          initiated_by_user_id, 'DISPUTE_FILED', 'Dispute Filed', 'Your dispute has been filed and is under review',
          dispute.id,
          other_party_id, 'DISPUTE_FILED', 'Dispute Against You', 'A dispute has been filed against you on a transaction',
          dispute.id
        ]
      );

      // Update user dispute count
      await db.query(
        `UPDATE users SET total_disputes = total_disputes + 1 WHERE id = $1`,
        [initiated_by_user_id]
      );

      return {
        success: true,
        dispute: {
          id: dispute.id,
          dispute_code: dispute.dispute_code,
          status: dispute.status,
          created_at: dispute.created_at
        }
      };
    } catch (error) {
      console.error('File dispute error:', error);
      throw error;
    }
  }

  /**
   * Get dispute details
   * @param {String} disputeId
   * @returns {Promise<Object>}
   */
  async getDispute(disputeId) {
    const result = await db.query(
      `SELECT d.*, 
              u1.first_name as initiator_name, u1.email as initiator_email,
              u2.first_name as respondent_name, u2.email as respondent_email,
              t.title as transaction_title, t.amount as transaction_amount
       FROM disputes d
       JOIN users u1 ON d.initiated_by_user_id = u1.id
       JOIN users u2 ON d.other_party_id = u2.id
       JOIN transactions t ON d.transaction_id = t.id
       WHERE d.id = $1`,
      [disputeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Dispute not found');
    }

    return result.rows[0];
  }

  /**
   * Resolve dispute
   * @param {Object} resolutionData
   * @returns {Promise<Object>}
   */
  async resolveDispute(resolutionData) {
    try {
      const {
        dispute_id,
        arbitrator_id,
        resolution_status, // REFUND_BUYER, RELEASE_SELLER, PARTIAL_REFUND
        arbitrator_notes,
        resolution_amount
      } = resolutionData;

      // Get dispute
      const disputeResult = await db.query(
        'SELECT * FROM disputes WHERE id = $1',
        [dispute_id]
      );

      if (disputeResult.rows.length === 0) {
        throw new Error('Dispute not found');
      }

      const dispute = disputeResult.rows[0];

      // Get transaction
      const txResult = await db.query(
        'SELECT * FROM transactions WHERE id = $1',
        [dispute.transaction_id]
      );

      const transaction = txResult.rows[0];

      // Handle resolution based on status
      if (resolution_status === 'REFUND_BUYER') {
        // Refund entire amount to buyer
        await db.query(
          `UPDATE wallet SET 
            balance = balance + $1,
            escrow_balance = escrow_balance - $2
           WHERE user_id = $3`,
          [transaction.amount + transaction.buyer_commission, transaction.amount + transaction.buyer_commission, transaction.buyer_id]
        );

        // Update user stats - buyer wins
        await db.query(
          'UPDATE users SET disputes_won = disputes_won + 1 WHERE id = $1',
          [transaction.buyer_id]
        );
        await db.query(
          'UPDATE users SET disputes_lost = disputes_lost + 1 WHERE id = $1',
          [transaction.seller_id]
        );
      } else if (resolution_status === 'RELEASE_SELLER') {
        // Release to seller minus commission
        await db.query(
          `UPDATE wallet SET 
            balance = balance + $1,
            escrow_balance = escrow_balance - $2
           WHERE user_id = $3`,
          [transaction.amount - transaction.seller_commission, transaction.amount + transaction.buyer_commission, transaction.seller_id]
        );

        // Update user stats - seller wins
        await db.query(
          'UPDATE users SET disputes_won = disputes_won + 1 WHERE id = $1',
          [transaction.seller_id]
        );
        await db.query(
          'UPDATE users SET disputes_lost = disputes_lost + 1 WHERE id = $1',
          [transaction.buyer_id]
        );
      } else if (resolution_status === 'PARTIAL_REFUND') {
        // Partial refund
        const refund_amount = resolution_amount || transaction.amount / 2;
        const seller_amount = (transaction.amount - refund_amount) - transaction.seller_commission;

        await db.query(
          `UPDATE wallet SET 
            balance = balance + $1,
            escrow_balance = escrow_balance - $2
           WHERE user_id = $3`,
          [refund_amount + transaction.buyer_commission, transaction.amount + transaction.buyer_commission, transaction.buyer_id]
        );

        await db.query(
          `UPDATE wallet SET 
            balance = balance + $1,
            escrow_balance = escrow_balance - $2
           WHERE user_id = $3`,
          [seller_amount, transaction.amount + transaction.buyer_commission, transaction.seller_id]
        );
      }

      // Update dispute
      await db.query(
        `UPDATE disputes SET 
          status = $1,
          resolution_status = $2,
          arbitrator_id = $3,
          arbitrator_notes = $4,
          resolved_at = NOW(),
          updated_at = NOW()
         WHERE id = $5`,
        ['RESOLVED', resolution_status, arbitrator_id, arbitrator_notes, dispute_id]
      );

      // Update transaction
      await db.query(
        'UPDATE transactions SET status = $1, escrow_status = $2, completed_at = NOW() WHERE id = $3',
        ['COMPLETED', 'RELEASED', dispute.transaction_id]
      );

      // Create notifications
      const resolution_message = resolution_status === 'REFUND_BUYER' 
        ? 'Dispute resolved - Full refund to buyer'
        : resolution_status === 'RELEASE_SELLER'
        ? 'Dispute resolved - Funds released to seller'
        : 'Dispute resolved - Partial refund';

      await db.query(
        `INSERT INTO notifications (
          user_id, type, title, message, related_dispute_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW()), ($6, $7, $8, $9, $10, NOW())`,
        [
          dispute.initiated_by_user_id, 'DISPUTE_RESOLVED', 'Dispute Resolved', resolution_message,
          dispute_id,
          dispute.other_party_id, 'DISPUTE_RESOLVED', 'Dispute Resolved', resolution_message,
          dispute_id
        ]
      );

      return {
        success: true,
        message: 'Dispute resolved',
        resolution_status,
        resolved_at: new Date()
      };
    } catch (error) {
      console.error('Resolve dispute error:', error);
      throw error;
    }
  }

  /**
   * Appeal dispute
   * @param {Object} appealData
   * @returns {Promise<Object>}
   */
  async appealDispute(appealData) {
    try {
      const {
        dispute_id,
        appealing_user_id,
        appeal_reason
      } = appealData;

      // Get dispute
      const result = await db.query(
        'SELECT * FROM disputes WHERE id = $1',
        [dispute_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Dispute not found');
      }

      const dispute = result.rows[0];

      // Verify user can appeal
      if (appealing_user_id !== dispute.initiated_by_user_id && appealing_user_id !== dispute.other_party_id) {
        throw new Error('Unauthorized');
      }

      // Update dispute with appeal
      await db.query(
        `UPDATE disputes SET 
          status = $1,
          appeal_reason = $2,
          appealed_at = NOW(),
          updated_at = NOW()
         WHERE id = $3`,
        ['APPEALED', appeal_reason, dispute_id]
      );

      return {
        success: true,
        message: 'Appeal submitted',
        status: 'APPEALED'
      };
    } catch (error) {
      console.error('Appeal dispute error:', error);
      throw error;
    }
  }
}

module.exports = new DisputeService();
