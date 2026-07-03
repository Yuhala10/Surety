const express = require('express');
const db = require('../config/database');
const authService = require('../services/authService');
const trustScoreService = require('../services/trustScoreService');

const router = express.Router();

// Middleware to authenticate user
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.slice(7);
    const decoded = authService.verifyJWT(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// @route   GET /api/trust-score/my
// @desc    Get current user trust score
// @access  Private
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await db.query(
      `SELECT trust_score, trust_tier, reputation_score, total_transactions,
              completed_transactions, on_time_deliveries, total_disputes,
              disputes_won, disputes_lost FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const scoreData = await trustScoreService.calculateTrustScore(userId);

    res.json({
      success: true,
      trust_score: scoreData.trust_score,
      trust_tier: user.trust_tier,
      reputation_score: user.reputation_score,
      scores: {
        completion: scoreData.completion_score,
        on_time: scoreData.on_time_score,
        disputes: scoreData.dispute_score,
        rating: scoreData.rating_score
      },
      breakdown: scoreData.breakdown,
      stats: {
        total_transactions: user.total_transactions,
        completed_transactions: user.completed_transactions,
        on_time_deliveries: user.on_time_deliveries,
        total_disputes: user.total_disputes,
        disputes_won: user.disputes_won,
        disputes_lost: user.disputes_lost
      }
    });
  } catch (error) {
    console.error('Get trust score error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust score'
    });
  }
});

// @route   GET /api/trust-score/history
// @desc    Get trust score history
// @access  Private
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.query;

    const history = await trustScoreService.getTrustScoreHistory(userId, parseInt(limit));

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get history'
    });
  }
});

// @route   PUT /api/trust-score/recalculate
// @desc    Recalculate trust score (triggers on transaction complete/dispute resolve)
// @access  Private (System)
router.put('/recalculate', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await trustScoreService.updateUserTrustScore(userId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Recalculate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate'
    });
  }
});

module.exports = router;
