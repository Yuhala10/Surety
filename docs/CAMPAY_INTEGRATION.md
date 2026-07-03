# Campay Payment Integration Guide

## Overview

SURETY integrates with **Campay**, the mobile money aggregator for Cameroon, to enable secure payments for:
- Wallet deposits
- Escrow fund transfers
- Commission payments
- Refunds

## Setup

### 1. Get Campay API Key

1. Go to [Campay Dashboard](https://campay.net)
2. Sign up or login
3. Navigate to **API Settings** or **Integrations**
4. Generate API Key
5. Copy the key

### 2. Configure Environment Variables

Add to `backend/.env`:

```bash
# Campay Configuration
CAMPAY_API_KEY=your_api_key_here
CAMPAY_API_URL=https://api.campay.net
CAMPAY_SANDBOX=true  # Set to false for production
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### 1. Initiate Payment

**Endpoint**: `POST /api/payments/initiate`

**Request**:
```json
{
  "phone": "+237123456789",
  "amount": 10000,
  "description": "Wallet deposit for e-commerce transaction",
  "externalId": "TRX-20240101-001",
  "transactionType": "DEPOSIT"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "transactionId": "REF-12345678",
  "data": {
    "reference": "REF-12345678",
    "status": "PENDING",
    "amount": 10000,
    "phone": "+237123456789"
  }
}
```

**Transaction Types**:
- `DEPOSIT` - Add funds to wallet
- `ESCROW` - Hold funds in escrow
- `WITHDRAWAL` - Withdraw from wallet

### 2. Check Payment Status

**Endpoint**: `GET /api/payments/status/:reference`

**Example**: `GET /api/payments/status/REF-12345678`

**Response**:
```json
{
  "success": true,
  "data": {
    "reference": "REF-12345678",
    "status": "SUCCESSFUL",
    "amount": 10000,
    "phone": "+237123456789",
    "timestamp": "2024-01-01T10:30:00Z"
  }
}
```

**Possible Statuses**:
- `PENDING` - Payment awaiting confirmation
- `SUCCESSFUL` - Payment completed
- `FAILED` - Payment failed
- `CANCELLED` - Payment cancelled

### 3. Webhook Notification

**Endpoint**: `POST /api/payments/webhook`

Campay sends payment updates to this endpoint.

**Payload** (example):
```json
{
  "reference": "REF-12345678",
  "external_id": "TRX-20240101-001",
  "status": "SUCCESSFUL",
  "amount": 10000,
  "phone": "+237123456789",
  "timestamp": "2024-01-01T10:30:00Z"
}
```

### 4. Refund Payment

**Endpoint**: `POST /api/payments/refund`

**Request**:
```json
{
  "reference": "REF-12345678",
  "amount": 10000
}
```

**Response**:
```json
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "refund_reference": "REFUND-87654321",
    "status": "PROCESSING"
  }
}
```

## Payment Flow

### Deposit Flow
```
1. User initiates deposit → POST /payments/initiate
2. Campay sends USSD prompt to user's phone
3. User confirms payment on phone
4. Campay sends webhook → POST /payments/webhook
5. SURETY updates wallet balance
6. User sees confirmation
```

### Escrow Flow
```
1. Buyer creates transaction → POST /transactions
2. Campay payment initiated → POST /payments/initiate
3. Funds held in escrow after confirmation
4. Seller delivers service/product
5. Both parties confirm → PUT /transactions/:id/confirm
6. Funds released to seller → Campay transfer
```

### Dispute Refund Flow
```
1. Dispute filed → POST /disputes
2. Platform staff resolves → POST /disputes/:id/resolve
3. Refund initiated → POST /payments/refund
4. Funds returned to buyer's account
```

## Testing

### Sandbox Mode

Enable sandbox for testing:

```bash
# In .env
CAMPAY_SANDBOX=true
```

### Test Numbers

Use Campay's test numbers (check Campay documentation):
- `+237650000000` - Successful payment
- `+237650000001` - Failed payment
- `+237650000002` - Cancelled payment

### cURL Examples

**Initiate Payment**:
```bash
curl -X POST http://localhost:5000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+237123456789",
    "amount": 10000,
    "description": "Test deposit",
    "externalId": "TEST-001",
    "transactionType": "DEPOSIT"
  }'
```

**Check Status**:
```bash
curl http://localhost:5000/api/payments/status/REF-12345678
```

## Security

### API Key Protection
- Never commit `.env` file
- Use environment variables in production
- Rotate keys regularly
- Use HTTPS only

### Webhook Verification
- Verify webhook signature (to be implemented)
- Use HTTPS for callbacks
- Idempotent webhook handling

### PCI Compliance
- No sensitive card data stored
- Campay handles all payment data
- Encrypted communication
- Regular security audits

## Error Handling

### Common Errors

```json
{
  "success": false,
  "error": "Invalid phone number format"
}
```

### Error Codes
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid signature/auth)
- `404` - Not found (transaction reference)
- `500` - Server error

## Production Deployment

1. **Update Environment**:
   ```bash
   CAMPAY_SANDBOX=false
   CAMPAY_API_KEY=your_production_key
   ```

2. **Configure Webhook URL**:
   - Update in Campay dashboard to production URL
   - Example: `https://yourdomain.com/api/payments/webhook`

3. **Enable Signature Verification**:
   - Implement signature verification in webhook handler

4. **Monitor Transactions**:
   - Log all payment activities
   - Set up alerts for failed payments
   - Regular reconciliation

## Support

- **Campay Docs**: https://campay.net/docs
- **Campay Support**: support@campay.net
- **SURETY Support**: support@surety.cm
