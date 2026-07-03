# Authentication & Transaction API Documentation

## Authentication System

### Register User

**Endpoint**: `POST /api/auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "phone_number": "+237123456789",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "otp_secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "otpauth://..."
}
```

### Verify OTP

**Endpoint**: `POST /api/auth/verify-otp`

**Request**:
```json
{
  "user_id": "uuid",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Login

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Refresh Token

**Endpoint**: `POST /api/auth/refresh`

**Headers**:
```
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Transaction System

### Create Transaction

**Endpoint**: `POST /api/transactions`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```json
{
  "seller_id": "uuid",
  "amount": 50000,
  "title": "E-commerce Product Sale",
  "description": "Nike Shoes - Size 42",
  "sector": "e-commerce",
  "delivery_deadline": "2024-01-31T23:59:59Z",
  "delivery_address": "123 Main Street, Douala"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "transaction": {
    "id": "uuid",
    "transaction_code": "TRX-20240101-ABC123",
    "amount": 50000,
    "status": "PENDING",
    "escrow_status": "PENDING",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

**Transaction Statuses**:
- `PENDING` - Waiting for seller acceptance
- `IN_PROGRESS` - Transaction active
- `COMPLETED` - Both parties confirmed
- `DISPUTED` - Dispute filed
- `CANCELLED` - Transaction cancelled
- `REFUNDED` - Funds refunded

### Get Transaction

**Endpoint**: `GET /api/transactions/:id`

**Headers**:
```
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "transaction_code": "TRX-20240101-ABC123",
    "buyer_id": "uuid",
    "seller_id": "uuid",
    "title": "E-commerce Product Sale",
    "description": "Nike Shoes - Size 42",
    "amount": 50000,
    "currency": "XAF",
    "status": "IN_PROGRESS",
    "escrow_status": "HELD",
    "buyer_confirmed": false,
    "seller_confirmed": false,
    "sector": "e-commerce",
    "delivery_deadline": "2024-01-31T23:59:59Z",
    "delivery_address": "123 Main Street, Douala",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### List User Transactions

**Endpoint**: `GET /api/transactions?status=PENDING&limit=10&offset=0`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `status` (optional) - Filter by status
- `limit` (default: 10) - Number of results
- `offset` (default: 0) - Pagination offset

**Response**:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "transaction_code": "TRX-20240101-ABC123",
      "buyer_id": "uuid",
      "seller_id": "uuid",
      "title": "Product",
      "amount": 50000,
      "status": "PENDING",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Confirm Transaction

**Endpoint**: `PUT /api/transactions/:id/confirm`

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "confirmed": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Transaction confirmed",
  "transaction": {
    "id": "uuid",
    "status": "CONFIRMED"
  }
}
```

---

## Error Handling

### Common Errors

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Invalid token"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Transaction not found"
}
```

**409 Conflict**:
```json
{
  "success": false,
  "error": "Email or phone number already registered"
}
```

---

## Testing

### Register Test User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone_number": "+237123456789",
    "password": "TestPass123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Login Test User

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### Create Transaction

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "uuid-of-seller",
    "amount": 50000,
    "title": "Test Transaction",
    "description": "Testing transaction system",
    "sector": "e-commerce",
    "delivery_deadline": "2024-01-31T23:59:59Z",
    "delivery_address": "Douala, CM"
  }'
```
