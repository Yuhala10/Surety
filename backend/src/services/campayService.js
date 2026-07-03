const axios = require('axios');

class CampayService {
  constructor() {
    this.baseURL = process.env.CAMPAY_API_URL || 'https://api.campay.net';
    this.apiKey = process.env.CAMPAY_API_KEY;
    this.sandbox = process.env.CAMPAY_SANDBOX === 'true';
  }

  /**
   * Initialize payment with Campay
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Payment response
   */
  async initiatePayment(paymentData) {
    try {
      const {
        phone,
        amount,
        currency = 'XAF',
        description,
        externalId,
        redirectUrl
      } = paymentData;

      const payload = {
        phone,
        amount,
        currency,
        description,
        external_id: externalId,
        redirect_url: redirectUrl
      };

      const response = await axios.post(
        `${this.baseURL}/api/v1/collect/`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data,
        transactionId: response.data.reference
      };
    } catch (error) {
      console.error('Campay payment initiation error:', error.response?.data || error.message);
      throw new Error(`Payment initiation failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get payment status
   * @param {String} reference - Transaction reference
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(reference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/collect/${reference}/`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        status: response.data.status,
        data: response.data
      };
    } catch (error) {
      console.error('Campay status check error:', error.response?.data || error.message);
      throw new Error(`Status check failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {String} signature - Signature from header
   * @returns {Boolean} Signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    // TODO: Implement webhook signature verification
    // This depends on Campay's specific implementation
    return true;
  }

  /**
   * Refund payment
   * @param {String} reference - Original transaction reference
   * @param {Number} amount - Amount to refund
   * @returns {Promise<Object>} Refund response
   */
  async refundPayment(reference, amount) {
    try {
      const payload = {
        reference,
        amount
      };

      const response = await axios.post(
        `${this.baseURL}/api/v1/refund/`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Campay refund error:', error.response?.data || error.message);
      throw new Error(`Refund failed: ${error.response?.data?.detail || error.message}`);
    }
  }
}

module.exports = new CampayService();
