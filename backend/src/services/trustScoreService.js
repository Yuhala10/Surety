const db = require('../config/database');

class TrustScoreService {
  /**
   * Calculate trust score for a user
   * Factors:
   * - Transaction completion rate (40%)
   * - On-time delivery (30%)
   * - Dispute resolution (20%)
   * - User ratings (10%)
   */
  async calculateTrustScore(userId) {
    try {
      // Get user stats
      const userResult = await db.query(
        `SELECT total_transactions, completed_transactions, on_time_deliveries,
                total_disputes, disputes_won FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Calculate completion rate (40%)
      const completionRate = user.total_transactions > 0
        ? (user.completed_transactions / user.total_transactions) * 100
        : 0;
      const completionScore = (completionRate / 100) * 40;

      // Calculate on-time delivery rate (30%)
      const onTimeRate = user.completed_transactions > 0
        ? (user.on_time_deliveries / user.completed_transactions) * 100
        : 0;
      const onTimeScore = (onTimeRate / 100) * 30;

      // Calculate dispute resolution (20%)
      const disputeResolution = user.total_disputes > 0
        ? (user.disputes_won / user.total_disputes) * 100
        : 100; // If no disputes, full score
      const disputeScore = (disputeResolution / 100) * 20;

      // Get average rating (10%)
      const ratingsResult = await db.query(
        `SELECT AVG(rating) as avg_rating FROM ratings WHERE rated_user_id = $1`,
        [userId]
      );

      const avgRating = ratingsResult.rows[0]?.avg_rating || 0;
      const ratingScore = (avgRating / 5) * 10;

      // Calculate total trust score (0-100)
      const trustScore = Math.round(
        completionScore + onTimeScore + disputeScore + ratingScore
      );

      return {
        trust_score: Math.min(100, Math.max(0, trustScore)),
        completion_score: Math.round(completionScore),
        on_time_score: Math.round(onTimeScore),
        dispute_score: Math.round(disputeScore),
        rating_score: Math.round(ratingScore),
        breakdown: {
          completion_rate: Math.round(completionRate),
          on_time_rate: Math.round(onTimeRate),
          dispute_resolution: Math.round(disputeResolution),
          avg_rating: parseFloat(avgRating).toFixed(2)
        }
      };
    } catch (error) {
      console.error('Calculate trust score error:', error);
      throw error;
    }
  }

  /**
   * Update trust tier based on score
   */
  getTrustTier(score) {
    if (score >= 76) return 'PLATINUM';
    if (score >= 51) return 'GOLD';
    if (score >= 26) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Update user trust score and tier
   */
  async updateUserTrustScore(userId) {
    try {
      const scoreData = await this.calculateTrustScore(userId);
      const trustTier = this.getTrustTier(scoreData.trust_score);

      // Update user
      await db.query(
        `UPDATE users SET 
          trust_score = $1,
          trust_tier = $2,
          reputation_score = $3,
          updated_at = NOW()
         WHERE id = $4`,
        [
          scoreData.trust_score,
          trustTier,
          parseFloat(scoreData.breakdown.avg_rating),
          userId
        ]
      );

      // Log score change
      const previousScore = await db.query(
        `SELECT trust_score FROM trust_score_log WHERE user_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      const prevScore = previousScore.rows[0]?.trust_score || 0;

      if (prevScore !== scoreData.trust_score) {
        await db.query(
          `INSERT INTO trust_score_log (
            user_id, previous_score, new_score, score_change, reason, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            userId,
            prevScore,
            scoreData.trust_score,
            scoreData.trust_score - prevScore,
            'Automatic calculation'
          ]
        );
      }

      return {
        success: true,
        trust_score: scoreData.trust_score,
        trust_tier: trustTier,
        ...scoreData
      };
    } catch (error) {
      console.error('Update trust score error:', error);
      throw error;
    }
  }

  /**
   * Record transaction completion
   */
  async recordTransactionCompletion(userId, transactionId, wasOnTime) {
    try {
      // Update user stats
      await db.query(
        `UPDATE users SET 
          total_transactions = total_transactions + 1,
          completed_transactions = completed_transactions + 1,
          on_time_deliveries = on_time_deliveries + CASE WHEN $1 THEN 1 ELSE 0 END,
          updated_at = NOW()
         WHERE id = $2`,
        [wasOnTime, userId]
      );

      // Recalculate trust score
      return await this.updateUserTrustScore(userId);
    } catch (error) {
      console.error('Record transaction completion error:', error);
      throw error;
    }
  }

  /**
   * Record dispute
   */
  async recordDispute(userId, won) {
    try {
      await db.query(
        `UPDATE users SET 
          total_disputes = total_disputes + 1,
          disputes_won = disputes_won + CASE WHEN $1 THEN 1 ELSE 0 END,
          disputes_lost = disputes_lost + CASE WHEN $1 THEN 0 ELSE 1 END,
          updated_at = NOW()
         WHERE id = $2`,
        [won, userId]
      );

      // Recalculate trust score
      return await this.updateUserTrustScore(userId);
    } catch (error) {
      console.error('Record dispute error:', error);
      throw error;
    }
  }

  /**
   * Get trust score history
   */
  async getTrustScoreHistory(userId, limit = 10) {
    try {
      const result = await db.query(
        `SELECT id, previous_score, new_score, score_change, reason, created_at
         FROM trust_score_log
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Get trust score history error:', error);
      throw error;
    }
  }
}

module.exports = new TrustScoreService();
