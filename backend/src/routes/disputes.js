const express = require('express');
const { body, validationResult } = require('express-validator');
const disputeService = require('../services/disputeService');
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

// @route   POST /api/disputes
// @desc    File a dispute
// @access  Private
router.post(
  '/',
  authenticate,
  [
    body('transaction_id', 'Transaction ID is required').notEmpty(),
    body('other_party_id', 'Other party ID is required').notEmpty(),
    body('reason', 'Reason is required').notEmpty().isIn([
      'NON_DELIVERY',
      'POOR_QUALITY',
      'WRONG_ITEM',
      'INCOMPLETE',
      'DAMAGED',
      'NOT_AS_DESCRIBED',
      'OTHER'
    ]),
    body('description', 'Description is required and must be 20+ characters').isLength({ min: 20 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { transaction_id, other_party_id, reason, description, evidence_documents } = req.body;

      const result = await disputeService.fileDispute({
        transaction_id,
        initiated_by_user_id: userId,
        other_party_id,
        reason,
        description,
        evidence_documents: evidence_documents || []
      });

      res.status(201).json({
        success: true,
        message: 'Dispute filed successfully',
        ...result
      });
    } catch (error) {
      console.error('File dispute error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to file dispute'
      });
    }
  }
);

// @route   GET /api/disputes/:id
// @desc    Get dispute details
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const dispute = await disputeService.getDispute(id);

    // Verify user is involved in dispute
    if (userId !== dispute.initiated_by_user_id && userId !== dispute.other_party_id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      dispute
    });
  } catch (error) {
    console.error('Get dispute error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dispute'
    });
  }
});

// @route   POST /api/disputes/:id/resolve
// @desc    Resolve dispute (Admin only)
// @access  Private (Admin)
router.post(
  '/:id/resolve',
  authenticate,
  [
    body('resolution_status', 'Resolution status required').isIn([
      'REFUND_BUYER',
      'RELEASE_SELLER',
      'PARTIAL_REFUND'
    ]),
    body('arbitrator_notes', 'Arbitrator notes required').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const arbitrator_id = req.userId;
      const { resolution_status, arbitrator_notes, resolution_amount } = req.body;

      // TODO: Add admin verification

      const result = await disputeService.resolveDispute({
        dispute_id: id,
        arbitrator_id,
        resolution_status,
        arbitrator_notes,
        resolution_amount
      });

      res.json({
        success: true,
        message: result.message,
        resolution_status: result.resolution_status
      });
    } catch (error) {
      console.error('Resolve dispute error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to resolve dispute'
      });
    }
  }
);

// @route   POST /api/disputes/:id/appeal
// @desc    Appeal a resolved dispute
// @access  Private
router.post(
  '/:id/appeal',
  authenticate,
  [
    body('appeal_reason', 'Appeal reason required and must be 50+ characters').isLength({ min: 50 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { appeal_reason } = req.body;

      const result = await disputeService.appealDispute({
        dispute_id: id,
        appealing_user_id: userId,
        appeal_reason
      });

      res.json({
        success: true,
        message: result.message,
        status: result.status
      });
    } catch (error) {
      console.error('Appeal dispute error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to appeal dispute'
      });
    }
  }
);

module.exports = router;
