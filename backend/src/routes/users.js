const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const authService = require('../services/authService');

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

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await db.query(
      `SELECT id, email, phone_number, first_name, last_name, profile_picture_url,
              trust_score, trust_tier, reputation_score, total_transactions,
              completed_transactions, on_time_deliveries, total_disputes,
              disputes_won, disputes_lost, sector, country, city, bio, status,
              kyc_status, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get wallet info
    const walletResult = await db.query(
      'SELECT balance, escrow_balance, total_received, total_sent FROM wallet WHERE user_id = $1',
      [userId]
    );

    const wallet = walletResult.rows[0];

    res.json({
      success: true,
      user: {
        ...user,
        wallet
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  authenticate,
  [
    body('first_name').optional().notEmpty(),
    body('last_name').optional().notEmpty(),
    body('bio').optional(),
    body('sector').optional().isIn(['e-commerce', 'freelancing', 'real-estate']),
    body('country').optional(),
    body('city').optional()
  ],
  async (req, res) => {
    try {
      const userId = req.userId;
      const { first_name, last_name, bio, sector, country, city } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (first_name) {
        updates.push(`first_name = $${paramCount}`);
        values.push(first_name);
        paramCount++;
      }

      if (last_name) {
        updates.push(`last_name = $${paramCount}`);
        values.push(last_name);
        paramCount++;
      }

      if (bio !== undefined) {
        updates.push(`bio = $${paramCount}`);
        values.push(bio);
        paramCount++;
      }

      if (sector) {
        updates.push(`sector = $${paramCount}`);
        values.push(sector);
        paramCount++;
      }

      if (country) {
        updates.push(`country = $${paramCount}`);
        values.push(country);
        paramCount++;
      }

      if (city) {
        updates.push(`city = $${paramCount}`);
        values.push(city);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No updates provided'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING id, first_name, last_name, bio, sector, country, city`;

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

// @route   GET /api/users/:userId/trust-score
// @desc    Get user trust score
// @access  Public
router.get('/:userId/trust-score', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT id, first_name, last_name, trust_score, trust_tier, reputation_score,
              total_transactions, completed_transactions, on_time_deliveries,
              total_disputes, disputes_won, disputes_lost
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get ratings
    const ratingsResult = await db.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
       FROM ratings WHERE rated_user_id = $1`,
      [userId]
    );

    const ratings = ratingsResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        trust_score: user.trust_score,
        trust_tier: user.trust_tier,
        reputation_score: user.reputation_score,
        avg_rating: parseFloat(ratings.avg_rating || 0).toFixed(2),
        total_ratings: ratings.total_ratings,
        stats: {
          total_transactions: user.total_transactions,
          completed_transactions: user.completed_transactions,
          completion_rate: user.total_transactions > 0 
            ? ((user.completed_transactions / user.total_transactions) * 100).toFixed(2) + '%'
            : '0%',
          on_time_deliveries: user.on_time_deliveries,
          total_disputes: user.total_disputes,
          disputes_won: user.disputes_won,
          disputes_lost: user.disputes_lost
        }
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

module.exports = router;
