# Trust Score System Documentation

## Overview

The Trust Score System automatically calculates a user's reputation based on:

- **Completion Rate** (40%) - % of completed transactions
- **On-Time Delivery** (30%) - % of on-time deliveries
- **Dispute Resolution** (20%) - % of disputes won
- **User Ratings** (10%) - Average rating from other users

## Trust Tiers

- 🥉 **BRONZE** (0-25): New users, limited transactions
- 🥈 **SILVER** (26-50): Regular users, higher limits
- 🥇 **GOLD** (51-75): Trusted users, premium features
- 💎 **PLATINUM** (76-100): Elite users, unlimited access

## API Endpoints

### Get My Trust Score

**Endpoint**: `GET /api/trust-score/my`

**Headers**:
```
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "trust_score": 85,
  "trust_tier": "GOLD",
  "reputation_score": 4.8,
  "scores": {
    "completion": 35,
    "on_time": 28,
    "disputes": 18,
    "rating": 9
  },
  "breakdown": {
    "completion_rate": 95,
    "on_time_rate": 92,
    "dispute_resolution": 90,
    "avg_rating": "4.8"
  },
  "stats": {
    "total_transactions": 50,
    "completed_transactions": 48,
    "on_time_deliveries": 44,
    "total_disputes": 2,
    "disputes_won": 1,
    "disputes_lost": 1
  }
}
```

### Get Trust Score History

**Endpoint**: `GET /api/trust-score/history?limit=10`

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "previous_score": 83,
      "new_score": 85,
      "score_change": 2,
      "reason": "Automatic calculation",
      "created_at": "2024-01-05T10:00:00Z"
    }
  ]
}
```

## Score Calculation Example

**User Profile**:
- Total transactions: 50
- Completed transactions: 48
- On-time deliveries: 44
- Total disputes: 2
- Disputes won: 1
- Average rating: 4.8/5

**Calculation**:

1. **Completion** (40% weight):
   - Rate: 48/50 = 96%
   - Score: (96/100) × 40 = 38.4

2. **On-Time** (30% weight):
   - Rate: 44/48 = 91.7%
   - Score: (91.7/100) × 30 = 27.5

3. **Disputes** (20% weight):
   - Rate: 1/2 = 50%
   - Score: (50/100) × 20 = 10

4. **Rating** (10% weight):
   - Rate: 4.8/5 = 96%
   - Score: (96/100) × 10 = 9.6

**Total**: 38.4 + 27.5 + 10 + 9.6 = **85.5 → 85** ✅ **GOLD TIER**

## Automatic Updates

Trust score is automatically updated when:

✅ Transaction completed
✅ On-time delivery recorded
✅ Dispute resolved
✅ User rated

## Benefits by Tier

### BRONZE (0-25)
- Basic transactions
- Limited escrow amount
- Manual dispute review

### SILVER (26-50)
- Higher transaction limits
- Faster dispute resolution
- Priority support

### GOLD (51-75)
- Premium features
- Highest transaction limits
- Express dispute resolution
- Featured profile

### PLATINUM (76-100)
- VIP status
- Unlimited transactions
- Priority customer service
- Featured on platform
- Special badges
