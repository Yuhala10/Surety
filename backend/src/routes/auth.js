const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const db = require('../config/database');

const router = express.Router();

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

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  '/register',
  [
    body('email', 'Valid email is required').isEmail(),
    body('phone_number', 'Valid phone number is required').notEmpty(),
    body('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
    body('first_name', 'First name is required').notEmpty(),
    body('last_name', 'Last name is required').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, phone_number, password, first_name, last_name } = req.body;

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
        [email, phone_number]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Email or phone number already registered'
        });
      }

      // Hash password
      const passwordHash = await authService.hashPassword(password);

      // Generate OTP secret
      const otpSecret = authService.generateOTPSecret();

      // Create user
      const result = await db.query(
        `INSERT INTO users (
          email, phone_number, password_hash, first_name, last_name,
          otp_secret, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, email, first_name, last_name, phone_number`,
        [
          email,
          phone_number,
          passwordHash,
          first_name,
          last_name,
          otpSecret.base32,
          'ACTIVE'
        ]
      );

      const user = result.rows[0];

      // Create wallet for user
      await db.query(
        `INSERT INTO wallet (user_id, balance, escrow_balance, currency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [user.id, 0, 0, 'XAF']
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number
        },
        otp_secret: otpSecret.base32,
        qr_code: otpSecret.otpauth_url
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and complete registration
// @access  Public
router.post(
  '/verify-otp',
  [
    body('user_id', 'User ID is required').notEmpty(),
    body('otp', 'OTP is required').isLength({ min: 6, max: 6 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { user_id, otp } = req.body;

      // Get user
      const userResult = await db.query(
        'SELECT id, otp_secret, email FROM users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Verify OTP
      const isValidOTP = authService.verifyOTP(user.otp_secret, otp);

      if (!isValidOTP) {
        return res.status(401).json({
          success: false,
          error: 'Invalid OTP'
        });
      }

      // Mark user as OTP verified
      await db.query(
        'UPDATE users SET otp_verified = true, email_verified = true WHERE id = $1',
        [user_id]
      );

      // Generate JWT token
      const token = authService.generateJWT(user_id);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        token,
        user: {
          id: user_id,
          email: user.email
        }
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        error: 'OTP verification failed'
      });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email', 'Valid email is required').isEmail(),
    body('password', 'Password is required').notEmpty()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user
      const userResult = await db.query(
        'SELECT id, password_hash, email, first_name, last_name, status FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      const user = userResult.rows[0];

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'Account is not active'
        });
      }

      // Verify password
      const isPasswordValid = await authService.comparePassword(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const token = authService.generateJWT(user.id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', (req, res) => {
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

    const newToken = authService.generateJWT(decoded.userId);

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

module.exports = router;
