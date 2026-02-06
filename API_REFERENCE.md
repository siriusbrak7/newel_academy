# API Routes Reference

## Backend API Endpoints Required for Subscription System

These are the API endpoints you need to implement in your backend (Node/Express, etc).

## Payment Endpoints

### POST `/api/payments/initialize`
Initialize a payment transaction

**Request:**
```json
{
  "email": "user@example.com",
  "amount": 99,
  "planType": "monthly",
  "tier": "professional",
  "userId": "student_demo"
}
```

**Response:**
```json
{
  "success": true,
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "...",
  "reference": "..."
}
```

### GET `/api/payments/:reference/verify`
Verify a payment transaction

**Response:**
```json
{
  "status": "success",
  "amount": 99900,
  "reference": "ref_123",
  "customer": {
    "customer_code": "CUS_123"
  }
}
```

### GET `/api/payments/user/:username`
Get payment history for a user

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "ref_123",
      "amount": 99,
      "status": "success",
      "createdAt": "2024-01-15T10:30:00Z",
      "planType": "monthly"
    }
  ]
}
```

### POST `/api/payments/webhook/paystack`
Webhook endpoint for Paystack events

**Request (from Paystack):**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "ref_123",
    "status": "success",
    "amount": 99900,
    "customer": {
      "customer_code": "CUS_123"
    },
    "metadata": {
      "userId": "student_demo",
      "username": "student_demo",
      "tier": "professional",
      "planType": "monthly"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## Subscription Endpoints

### POST `/api/subscriptions/:username/upgrade`
Initiate subscription upgrade

**Request:**
```json
{
  "tier": "professional",
  "planType": "yearly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Upgrade initiated",
  "authorizationUrl": "https://checkout.paystack.com/..."
}
```

### POST `/api/subscriptions/:username/downgrade`
Downgrade subscription (admin only)

**Request:**
```json
{
  "reason": "User requested"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription downgraded to free",
  "user": { /* updated user object */ }
}
```

### POST `/api/subscriptions/:username/cancel`
Cancel subscription

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled",
  "effectiveDate": "2024-02-15T00:00:00Z"
}
```

### GET `/api/subscriptions/:username`
Get subscription details

**Response:**
```json
{
  "tier": "professional",
  "subscriptionEndsAt": "2024-02-15T10:30:00Z",
  "paystackCustomerCode": "CUS_123",
  "paystackSubscriptionCode": "SUB_456",
  "status": "active"
}
```

## User Endpoints

### GET `/api/users/:username/subscription`
Get user's current subscription status

**Response:**
```json
{
  "username": "student_demo",
  "tier": "professional",
  "subscriptionEndsAt": "2024-02-15T10:30:00Z",
  "queryCount": 45,
  "queryLimit": 200,
  "queryResetTime": "2024-01-15T10:30:00Z",
  "features": {
    "aiTutor": true,
    "unlimitedQueries": true,
    "classManagement": true,
    /* ... */
  }
}
```

### GET `/api/users/:username/features`
Get available features for user

**Response:**
```json
{
  "aiTutor": true,
  "unlimitedQueries": true,
  "advancedAssessments": true,
  "classManagement": true,
  "customAssessments": true,
  "adminDashboard": false,
  "export": true,
  "prioritySupport": true,
  "maxStorage": 50,
  "maxCourses": 50,
  "maxStudents": 30
}
```

## Query Quota Endpoints

### GET `/api/users/:username/quota`
Get AI query quota information

**Response:**
```json
{
  "current": 45,
  "limit": 200,
  "resetDate": "2024-02-15T10:30:00Z",
  "percentageUsed": 22.5,
  "canQuery": true
}
```

### POST `/api/queries/:username/increment`
Increment query count (called after each AI query)

**Response:**
```json
{
  "success": true,
  "newCount": 46,
  "remaining": 154
}
```

### POST `/api/queries/:username/reset`
Manual quota reset (admin only)

**Response:**
```json
{
  "success": true,
  "message": "Query quota reset",
  "newCount": 0,
  "resetTime": "2024-01-16T10:30:00Z"
}
```

## Admin Endpoints

### GET `/api/admin/subscriptions`
List all subscriptions (admin only)

**Query Params:**
- `status`: active, expired, cancelled
- `tier`: free, professional, institutional
- `sort`: createdAt, expiresAt

**Response:**
```json
{
  "total": 150,
  "count": 50,
  "page": 1,
  "subscriptions": [
    {
      "username": "student_demo",
      "tier": "professional",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2024-02-15T10:30:00Z"
    }
  ]
}
```

### GET `/api/admin/payments`
List all payments (admin only)

**Query Params:**
- `status`: pending, success, failed
- `fromDate`: ISO date
- `toDate`: ISO date
- `tier`: professional, institutional

**Response:**
```json
{
  "total": 250,
  "revenue": 45250,
  "payments": [
    {
      "id": "ref_123",
      "username": "student_demo",
      "amount": 99,
      "status": "success",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST `/api/admin/users/:username/tier`
Update user tier (admin only)

**Request:**
```json
{
  "tier": "professional",
  "reason": "Admin override"
}
```

**Response:**
```json
{
  "success": true,
  "user": { /* updated user */ }
}
```

### GET `/api/admin/analytics`
Get subscription analytics (admin only)

**Response:**
```json
{
  "summary": {
    "totalUsers": 500,
    "freeUsers": 350,
    "paidUsers": 150,
    "totalRevenue": 450000,
    "mrr": 15000,
    "churnRate": 5
  },
  "byTier": {
    "free": { count: 350, percentage: 70 },
    "professional": { count: 100, percentage: 20 },
    "institutional": { count: 50, percentage: 10 }
  },
  "topCountries": [
    { country: "NG", users: 300, revenue: 150000 }
  ]
}
```

## Implementation Example (Express.js)

```javascript
// routes/payments.js
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

// Initialize payment
router.post('/initialize', async (req, res) => {
  try {
    const { email, amount, planType, tier, userId } = req.body;
    
    const result = await paymentService.initializePayment({
      email,
      amount,
      planType,
      metadata: { userId, tier }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify payment
router.get('/:reference/verify', async (req, res) => {
  try {
    const result = await paymentService.verifyPayment(req.params.reference);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook
router.post('/webhook/paystack', async (req, res) => {
  try {
    // Verify signature
    const isValid = verifyPaystackSignature(req);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    
    // Process webhook
    const success = await handlePaystackWebhook(req.body);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Rate Limiting Recommendations

- `/api/payments/initialize`: 10 requests/minute per user
- `/api/payments/*/verify`: 20 requests/minute per user
- `/api/subscriptions/*/cancel`: 5 requests/minute per user
- `/api/admin/*`: 100 requests/minute per admin

## Security Headers

All endpoints should include:
```
- Content-Type: application/json
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
```

## CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://yourapp.com', 'https://www.yourapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Authentication

Include JWT or session token in headers:
```
Authorization: Bearer <token>
```

## Webhook Security

1. Verify Paystack signature on webhook
2. Validate request came from Paystack IP
3. Re-verify payment with Paystack API
4. Log all webhook events
5. Implement idempotency (handle duplicate webhooks)

---

**Note**: These are example endpoints. Implement them in your backend framework of choice (Express, Fastify, Django, etc).
