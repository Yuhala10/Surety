const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Hash password
   * @param {String} password
   * @returns {Promise<String>} Hashed password
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   * @param {String} password
   * @param {String} hash
   * @returns {Promise<Boolean>}
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate OTP secret
   * @returns {Object} OTP secret and QR code
   */
  generateOTPSecret() {
    const secret = speakeasy.generateSecret({
      name: 'SURETY',
      issuer: 'SURETY',
      length: 32
    });
    return secret;
  }

  /**
   * Verify OTP token
   * @param {String} secret
   * @param {String} token
   * @returns {Boolean}
   */
  verifyOTP(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: parseInt(process.env.OTP_WINDOW) || 2
    });
  }

  /**
   * Generate JWT token
   * @param {String} userId
   * @returns {String} JWT token
   */
  generateJWT(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  /**
   * Verify JWT token
   * @param {String} token
   * @returns {Object} Decoded token
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate transaction code
   * @returns {String}
   */
  generateTransactionCode() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `TRX-${date}-${random}`;
  }
}

module.exports = new AuthService();
