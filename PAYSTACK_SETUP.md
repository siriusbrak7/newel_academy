# Environment Variables Setup for Paystack Integration

Add the following environment variables to your `.env` file (or `.env.local` for development):

## Paystack Configuration

```env
# Paystack API Keys (get from https://dashboard.paystack.com/settings/api)
VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Live secret key
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx  # Live public key

# For development/testing, use test keys:
# VITE_PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
# VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

## Getting Paystack Keys

1. Sign up at [paystack.com](https://paystack.com)
2. Complete KYC verification
3. Go to Settings → API Keys
4. Copy your Secret and Public keys
5. Use **Test keys** for development, **Live keys** for production

## Webhook Configuration

After setting up Paystack:

1. Go to Settings → Webhooks in your Paystack dashboard
2. Add your webhook URL: `https://your-api.com/api/webhooks/paystack`
3. Subscribe to these events:
   - `charge.success` - Successful charge
   - `subscription.create` - New subscription created
   - `subscription.disable` - Subscription cancelled
   - `invoice.payment_on_archive` - Recurring payment

## Backend API Endpoints Required

Create these API endpoints to handle webhooks:

```
POST /api/webhooks/paystack - Handle Paystack webhook events
GET  /api/payments/:reference - Verify payment status
POST /api/subscriptions/upgrade - Initiate subscription upgrade
POST /api/subscriptions/cancel - Cancel user subscription
GET  /api/user/subscription - Get user subscription details
```

## Database Tables Required

Ensure your Supabase database has these tables:

### Users Table (modifications needed)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS query_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS query_reset_time TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_subscription_code VARCHAR(255);
```

### Payments Table (new)
```sql
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  paystack_reference VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (user_id) REFERENCES users(username)
);

CREATE INDEX idx_payments_username ON payments(username);
CREATE INDEX idx_payments_paystack_ref ON payments(paystack_reference);
```

## Testing the Integration

### 1. Test Payment Flow
- Go to subscription page
- Select "Professional" tier
- Click "Upgrade Now"
- You'll be redirected to Paystack payment page
- Use test card: 4084 0343 1234 5678

### 2. Test Webhook
```bash
curl -X POST http://localhost:5173/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref_123",
      "status": "success",
      "amount": 99900,
      "customer": {
        "customer_code": "CUS_xxx"
      },
      "metadata": {
        "userId": "student_demo",
        "username": "student_demo",
        "tier": "professional",
        "planType": "monthly"
      }
    }
  }'
```

### 3. Check User Tier
After successful payment, verify user's tier was updated in database:
```sql
SELECT username, tier, subscription_ends_at FROM users WHERE username = 'student_demo';
```

## Pricing Configuration

Pricing tiers are defined in `services/paymentService.ts`:

```typescript
PRICING_TIERS = {
  free: {
    monthlyPrice: 0,
    yearlyPrice: 0,
    aiQueriesPerMonth: 5,
    // ...
  },
  professional: {
    monthlyPrice: 99,      // NGN 99
    yearlyPrice: 900,      // NGN 900 (2 months free)
    aiQueriesPerMonth: 200,
    // ...
  },
  institutional: {
    monthlyPrice: 299,
    yearlyPrice: 2700,
    aiQueriesPerMonth: 5000,
    // ...
  }
}
```

Adjust prices as needed. All amounts are in Nigerian Naira (NGN).

## Security Best Practices

1. **Never commit secret keys** - Always use environment variables
2. **Validate webhooks** - Implement signature verification for webhooks
3. **Use HTTPS** - All Paystack APIs require HTTPS
4. **Rate limiting** - Implement rate limiting on payment endpoints
5. **Error handling** - Don't expose sensitive errors to users
6. **Payment verification** - Always verify payment status server-side before updating user tier

## Troubleshooting

### Payment Not Processing
1. Check Paystack keys are correct
2. Verify webhook URL is publicly accessible
3. Check browser console for JavaScript errors
4. Review Paystack dashboard for failed transactions

### Webhook Not Triggering
1. Verify webhook URL in Paystack settings
2. Check firewall/CORS settings
3. Review Paystack logs for webhook delivery status
4. Ensure backend is receiving POST requests

### User Tier Not Updating
1. Check database permissions
2. Verify webhook handler is processing events correctly
3. Check `payments` table for failed records
4. Review server logs for errors
