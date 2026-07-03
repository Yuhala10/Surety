const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const db = require('../config/database');

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

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

// @route   POST /api/transactions
// @desc    Create new transaction
// @access  Private
router.post(
  '/',
  authenticate,
  [
    body('seller_id', 'Seller ID is required').notEmpty(),
    body('amount', 'Amount must be a positive number').isNumeric().custom(v => v > 0),
    body('title', 'Title is required').notEmpty(),
    body('description', 'Description is required').notEmpty(),
    body('sector', 'Sector is required').isIn(['e-commerce', 'freelancing', 'real-estate']),
    body('delivery_deadline', 'Delivery deadline is required').isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const buyer_id = req.userId;
      const { seller_id, amount, title, description, sector, delivery_deadline, delivery_address } = req.body;

      // Validate buyer and seller are different
      if (buyer_id === seller_id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot create transaction with yourself'
        });
      }

      // Verify seller exists
      const sellerResult = await db.query(
        'SELECT id FROM users WHERE id = $1',
        [seller_id]
      );

      if (sellerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Seller not found'
        });
      }

      // Calculate commissions
      const buyer_commission = amount * 0.02; // 2%
      const seller_commission = amount * 0.02; // 2%
      const platform_fee = buyer_commission + seller_commission;
      const total_with_commission = amount + buyer_commission;

      // Check buyer wallet balance
      const walletResult = await db.query(
        'SELECT balance FROM wallet WHERE user_id = $1',
        [buyer_id]
      );

      const wallet = walletResult.rows[0];
      if (!wallet || wallet.balance < total_with_commission) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient wallet balance'
        });
      }

      // Generate transaction code
      const transaction_code = authService.generateTransactionCode();

      // Create transaction
      const result = await db.query(
        `INSERT INTO transactions (
          transaction_code, buyer_id, seller_id, title, description, amount,
          buyer_commission, seller_commission, platform_fee, currency,
          sector, delivery_deadline, delivery_address, status, escrow_status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING id, transaction_code, status, escrow_status, created_at`,
        [
          transaction_code,
          buyer_id,
          seller_id,
          title,
          description,
          amount,
          buyer_commission,
          seller_commission,
          platform_fee,
          'XAF',
          sector,
          delivery_deadline,
          delivery_address,
          'PENDING',
          'PENDING'
        ]
      );

      const transaction = result.rows[0];

      // Deduct buyer commission from wallet (hold in escrow)
      await db.query(
        `UPDATE wallet SET 
          balance = balance - $1,
          escrow_balance = escrow_balance + $2
         WHERE user_id = $3`,
        [buyer_commission, amount + buyer_commission, buyer_id]
      );

      // Create notification for seller
      await db.query(
        `INSERT INTO notifications (
          user_id, type, title, message, related_transaction_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          seller_id,
          'TRANSACTION_CREATED',
          'New Transaction',
          `${title} - XAF ${amount}`,
          transaction.id
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        transaction: {
          id: transaction.id,
          transaction_code: transaction.transaction_code,
          amount,
          status: transaction.status,
          escrow_status: transaction.escrow_status,
          created_at: transaction.created_at
        }
      });
    } catch (error) {
      console.error('Transaction creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Transaction creation failed'
      });
    }
  }
);

// @route   GET /api/transactions/:id
// @desc    Get transaction details
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await db.query(
      `SELECT id, transaction_code, buyer_id, seller_id, title, description,
              amount, currency, status, escrow_status, buyer_confirmed, seller_confirmed,
              sector, delivery_deadline, delivery_address, created_at, updated_at
       FROM transactions
       WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const transaction = result.rows[0];

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction'
    });
  }
});

// @route   GET /api/transactions
// @desc    Get user transactions
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 10, offset = 0 } = req.query;

    let query = `SELECT id, transaction_code, buyer_id, seller_id, title, amount,
                        status, escrow_status, created_at
                 FROM transactions
                 WHERE (buyer_id = $1 OR seller_id = $1)`;
    let values = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, values);

    res.json({
      success: true,
      transactions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

// @route   PUT /api/transactions/:id/confirm
// @desc    Confirm transaction (release escrow)
// @access  Private
router.put(
  '/:id/confirm',
  authenticate,
  [
    body('confirmed', 'Confirmed must be boolean').isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { confirmed } = req.body;

      // Get transaction
      const txResult = await db.query(
        'SELECT * FROM transactions WHERE id = $1',
        [id]
      );

      if (txResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      const transaction = txResult.rows[0];

      // Verify user is buyer or seller
      if (userId !== transaction.buyer_id && userId !== transaction.seller_id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Update confirmation
      if (userId === transaction.buyer_id) {
        await db.query(
          'UPDATE transactions SET buyer_confirmed = $1, buyer_confirmed_at = NOW() WHERE id = $2',
          [confirmed, id]
        );
      } else {
        await db.query(
          'UPDATE transactions SET seller_confirmed = $1, seller_confirmed_at = NOW() WHERE id = $2',
          [confirmed, id]
        );
      }

      // Check if both parties confirmed
      const updatedTx = await db.query(
        'SELECT buyer_confirmed, seller_confirmed FROM transactions WHERE id = $1',
        [id]
      );

      const tx = updatedTx.rows[0];

      if (tx.buyer_confirmed && tx.seller_confirmed) {
        // Release escrow to seller
        await db.query(
          `UPDATE wallet SET 
            escrow_balance = escrow_balance - $1,
            balance = balance + $2
           WHERE user_id = $3`,
          [transaction.amount + transaction.buyer_commission, transaction.amount - transaction.seller_commission, transaction.seller_id]
        );

        // Update transaction status
        await db.query(
          'UPDATE transactions SET status = $1, escrow_status = $2, completed_at = NOW() WHERE id = $3',
          ['COMPLETED', 'RELEASED', id]
        );

        // Create notifications
        await db.query(
          `INSERT INTO notifications (
            user_id, type, title, message, related_transaction_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW()), ($6, $7, $8, $9, $10, NOW())`,
          [
            transaction.buyer_id, 'TRANSACTION_COMPLETED', 'Transaction Complete', 'Your transaction has been completed',
            id,
            transaction.seller_id, 'TRANSACTION_COMPLETED', 'Transaction Complete', 'Funds have been released to your wallet',
            id
          ]
        );
      }

      res.json({
        success: true,
        message: 'Transaction confirmed',
        transaction: {
          id,
          status: 'CONFIRMED'
        }
      });
    } catch (error) {
      console.error('Confirm transaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm transaction'
      });
    }
  }
);

module.exports = router;
