const express = require('express');
const { body, validationResult } = require('express-validator');
const campayService = require('../services/campayService');

const router = express.Router();

// Middleware to check validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   POST /api/payments/initiate
// @desc    Initiate payment with Campay
// @access  Private
router.post(
  '/initiate',
  [
    body('phone', 'Phone number is required').notEmpty().isMobilePhone('any'),
    body('amount', 'Amount must be a number').isNumeric().custom(v => v > 0),
    body('description', 'Description is required').notEmpty(),
    body('externalId', 'External ID is required').notEmpty(),
    body('transactionType', 'Transaction type is required').isIn(['DEPOSIT', 'ESCROW', 'WITHDRAWAL'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { phone, amount, description, externalId, transactionType } = req.body;
      
      // TODO: Add authentication middleware to verify user
      // const userId = req.user.id;

      const paymentData = {
        phone,
        amount,
        currency: 'XAF',
        description: `${transactionType} - ${description}`,
        externalId,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`
      };

      const result = await campayService.initiatePayment(paymentData);

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        transactionId: result.transactionId,
        data: result.data
      });
    } catch (error) {
      console.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// @route   GET /api/payments/status/:reference
// @desc    Get payment status
// @access  Private
router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Transaction reference is required'
      });
    }

    const result = await campayService.getPaymentStatus(reference);

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/payments/webhook
// @desc    Campay webhook for payment notifications
// @access  Public (but verify signature)
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-campay-signature'];

    // Verify webhook signature
    const isValid = campayService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // TODO: Update transaction status in database
    // const { reference, status, amount } = payload;
    // Update transaction record with status

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   POST /api/payments/refund
// @desc    Refund a payment
// @access  Private (Admin only)
router.post(
  '/refund',
  [
    body('reference', 'Transaction reference is required').notEmpty(),
    body('amount', 'Refund amount is required').isNumeric().custom(v => v > 0)
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reference, amount } = req.body;
      
      // TODO: Add admin authorization check

      const result = await campayService.refundPayment(reference, amount);

      res.json({
        success: true,
        message: 'Refund initiated successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
