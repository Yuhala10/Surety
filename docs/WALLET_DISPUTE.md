# Wallet & Dispute System API Documentation

## Wallet System

### Get Wallet

**Endpoint**: `GET /api/wallet`

**Headers**:
```
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "wallet": {
    "id": "uuid",
    "balance": 100000,
    "escrow_balance": 50000,
    "total_received": 500000,
    "total_sent": 300000,
    "currency": "XAF"
  }
}
```

### Initiate Deposit

**Endpoint**: `POST /api/wallet/deposit/initiate`

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "amount": 50000,
  "phone": "+237123456789"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Deposit initiated",
  "deposit_id": "uuid",
  "reference": "REF-20240101-ABC123",
  "status": "PENDING",
  "amount": 50000,
  "payment_data": {
    "reference": "REF-20240101-ABC123",
    "status": "PENDING",
    "amount": 50000,
    "phone": "+237123456789"
  }
}
```

### Confirm Deposit

**Endpoint**: `POST /api/wallet/deposit/confirm`

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "reference": "REF-20240101-ABC123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Deposit confirmed",
  "amount": 50000,
  "new_balance": 150000
}
```

### Withdraw Funds

**Endpoint**: `POST /api/wallet/withdraw`

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "amount": 30000,
  "phone": "+237987654321"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Withdrawal initiated",
  "withdrawal_id": "uuid",
  "reference": "WTH-20240101-XYZ789",
  "amount": 30000,
  "status": "PENDING"
}
```

---

## Dispute System

### File Dispute

**Endpoint**: `POST /api/disputes`

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "transaction_id": "uuid",
  "other_party_id": "uuid",
  "reason": "NON_DELIVERY",
  "description": "The seller did not deliver the product as agreed. I waited 7 days but still no delivery.",
  "evidence_documents": [
    "https://example.com/evidence1.pdf",
    "https://example.com/evidence2.jpg"
  ]
}
```

**Dispute Reasons**:
- `NON_DELIVERY` - Product/service not delivered
- `POOR_QUALITY` - Quality below agreement
- `WRONG_ITEM` - Received wrong item
- `INCOMPLETE` - Incomplete delivery
- `DAMAGED` - Product arrived damaged
- `NOT_AS_DESCRIBED` - Item doesn't match description
- `OTHER` - Other issues

**Response** (201):
```json
{
  "success": true,
  "message": "Dispute filed successfully",
  "dispute": {
    "id": "uuid",
    "dispute_code": "DSP-20240101-ABC123",
    "status": "OPEN",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### Get Dispute Details

**Endpoint**: `GET /api/disputes/:id`

**Headers**:
```
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "dispute": {
    "id": "uuid",
    "dispute_code": "DSP-20240101-ABC123",
    "transaction_id": "uuid",
    "initiated_by_user_id": "uuid",
    "other_party_id": "uuid",
    "initiator_name": "John Doe",
    "respondent_name": "Jane Smith",
    "reason": "NON_DELIVERY",
    "description": "The seller did not deliver the product as agreed...",
    "status": "IN_REVIEW",
    "resolution_status": null,
    "arbitrator_notes": null,
    "evidence_documents": "[\"url1\", \"url2\"]",
    "created_at": "2024-01-01T10:00:00Z",
    "resolved_by_date": "2024-01-08T10:00:00Z",
    "transaction_title": "Product Purchase",
    "transaction_amount": 50000
  }
}
```

### Resolve Dispute (Admin)

**Endpoint**: `POST /api/disputes/:id/resolve`

**Headers**:
```
Authorization: Bearer {admin-token}
```

**Request**:
```json
{
  "resolution_status": "REFUND_BUYER",
  "arbitrator_notes": "Evidence clearly shows non-delivery. Full refund granted to buyer.",
  "resolution_amount": null
}
```

**Resolution Statuses**:
- `REFUND_BUYER` - Full refund to buyer + commissions
- `RELEASE_SELLER` - Funds released to seller minus commission
- `PARTIAL_REFUND` - Split between buyer and seller

**Response**:
```json
{
  "success": true,
  "message": "Dispute resolved",
  "resolution_status": "REFUND_BUYER",
  "resolved_at": "2024-01-05T15:30:00Z"
}
```

### Appeal Dispute

**Endpoint**: `POST /api/disputes/:id/appeal`

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "appeal_reason": "The decision is unjust. I have evidence that the buyer received the product and signed for it. The delivery agent has a receipt proving delivery."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Appeal submitted",
  "status": "APPEALED"
}
```

---

## Dispute Resolution Flow

```
1. Buyer files dispute
   ↓
2. Funds held in escrow (transaction status: DISPUTED)
   ↓
3. Admin reviews evidence
   ↓
4. Admin resolves:
   - REFUND_BUYER → Buyer gets full refund + commission
   - RELEASE_SELLER → Seller gets payment minus commission
   - PARTIAL_REFUND → Split payment
   ↓
5. Optional: Appeal decision
   ↓
6. Final resolution
```

---

## Error Handling

**Insufficient Balance**:
```json
{
  "success": false,
  "error": "Insufficient balance"
}
```

**Dispute Already Exists**:
```json
{
  "success": false,
  "error": "Dispute already exists for this transaction"
}
```

**Invalid Reason**:
```json
{
  "success": false,
  "errors": [
    {
      "value": "INVALID_REASON",
      "msg": "Invalid value",
      "param": "reason"
    }
  ]
}
```

---

## Testing

### Test Deposit

```bash
# Initiate deposit
curl -X POST http://localhost:5000/api/wallet/deposit/initiate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "phone": "+237123456789"
  }'

# Confirm deposit (after payment successful)
curl -X POST http://localhost:5000/api/wallet/deposit/confirm \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "REF-20240101-ABC123"
  }'
```

### Test Dispute

```bash
# File dispute
curl -X POST http://localhost:5000/api/disputes \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "uuid",
    "other_party_id": "uuid",
    "reason": "NON_DELIVERY",
    "description": "The seller did not deliver the product as agreed. I have waited for 7 days."
  }'

# Get dispute
curl -X GET http://localhost:5000/api/disputes/{dispute_id} \
  -H "Authorization: Bearer {token}"

# Resolve dispute (admin)
curl -X POST http://localhost:5000/api/disputes/{dispute_id}/resolve \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_status": "REFUND_BUYER",
    "arbitrator_notes": "Full refund granted"
  }'
```
