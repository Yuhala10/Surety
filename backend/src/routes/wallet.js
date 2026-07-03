const express = require('express');
const { body, validationResult } = require('express-validator');
const walletService = require('../services/walletService');
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

// @route   GET /api/wallet
// @desc    Get wallet info
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const wallet = await walletService.getWallet(userId);

    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        escrow_balance: wallet.escrow_balance,
        total_received: wallet.total_received,
        total_sent: wallet.total_sent,
        currency: wallet.currency
      }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet'
    });
  }
});

// @route   POST /api/wallet/deposit/initiate
// @desc    Initiate deposit with Campay
// @access  Private
router.post(
  '/deposit/initiate',
  authenticate,
  [
    body('amount', 'Amount must be positive').isNumeric().custom(v => v > 0),
    body('phone', 'Phone number is required').isMobilePhone('any')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { amount, phone } = req.body;

      const result = await walletService.initiateDeposit(userId, amount, phone);

      res.status(201).json({
        success: true,
        message: 'Deposit initiated',
        ...result
      });
    } catch (error) {
      console.error('Deposit initiation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Deposit initiation failed'
      });
    }
  }
);

// @route   POST /api/wallet/deposit/confirm
// @desc    Confirm deposit
// @access  Private
router.post(
  '/deposit/confirm',
  authenticate,
  [
    body('reference', 'Reference is required').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { reference } = req.body;

      const result = await walletService.confirmDeposit(userId, reference);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: result.message,
        amount: result.amount,
        new_balance: result.new_balance
      });
    } catch (error) {
      console.error('Deposit confirmation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Deposit confirmation failed'
      });
    }
  }
);

// @route   POST /api/wallet/withdraw
// @desc    Initiate withdrawal
// @access  Private
router.post(
  '/withdraw',
  authenticate,
  [
    body('amount', 'Amount must be positive').isNumeric().custom(v => v > 0),
    body('phone', 'Phone number is required').isMobilePhone('any')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { amount, phone } = req.body;

      const result = await walletService.initiateWithdrawal(userId, amount, phone);

      res.status(201).json({
        success: true,
        message: result.message,
        ...result
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Withdrawal failed'
      });
    }
  }
);

module.exports = router;
