# Tiered Subscription System - Implementation Guide

## Overview

This guide explains how the new tiered subscription system works and how to integrate it into your application components.

## System Architecture

### 1. **Payment Service** (`services/paymentService.ts`)
- Handles all Paystack payment operations
- Manages subscription plans and pricing
- Processes payment verification

### 2. **AI Query Service** (`services/aiQueryService.ts`)
- Tracks AI tutor query usage per user
- Enforces query limits based on tier
- Auto-resets quotas monthly

### 3. **Access Control** (`services/accessControl.ts`)
- Defines tier-based feature access
- Provides middleware for feature gating
- Handles upgrade suggestions

### 4. **Webhook Service** (`services/webhookService.ts`)
- Processes Paystack webhook events
- Updates user subscription status
- Handles recurring payments

### 5. **Subscription Manager** (`components/SubscriptionManager.tsx`)
- UI for displaying plans and upgrading
- Manages payment flow
- Shows quota information

## Data Model

### User Fields (in `types.ts`)

```typescript
interface User {
  // ... existing fields ...
  
  // Subscription
  tier: 'free' | 'paid' | 'admin_free';
  subscriptionEndsAt?: string;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  
  // Query Quota
  queryCount: number;
  queryResetTime: string;
}
```

### Payment Record

```typescript
interface Payment {
  id: string;
  userId: string;
  username: string;
  amount: number;
  currency: string;
  paystackReference: string;
  status: 'pending' | 'success' | 'failed' | 'reversed';
  planType: 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}
```

## Integration Steps

### Step 1: Add Subscription Manager to Dashboard

```tsx
import { SubscriptionManager } from './components/SubscriptionManager';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      {/* ... other components ... */}
      <SubscriptionManager user={user} onUpgradeComplete={handleUpgradeComplete} />
    </div>
  );
}
```

### Step 2: Check Feature Access in Components

```tsx
import { useTierAccess } from './services/accessControl';

export function AITutorComponent() {
  const { user } = useAuth();
  const tier = useTierAccess(user);

  if (!tier.has('aiTutor')) {
    return <div>{tier.getUpgradeMessage('aiTutor')}</div>;
  }

  return <AITutor />;
}
```

### Step 3: Enforce Query Limits

```tsx
import { aiQueryService } from './services/aiQueryService';

export async function sendAIQuery(user: User, query: string) {
  // Check quota
  const canQuery = await aiQueryService.canMakeQuery(user);
  if (!canQuery) {
    showError('You have reached your monthly query limit. Upgrade your subscription.');
    return;
  }

  // Make query
  const response = await askAI(query);

  // Increment counter
  await aiQueryService.incrementQueryCount(user.username);

  return response;
}
```

### Step 4: Update Registration Flow

Registration already sets the tier automatically:
- **Free tier** → 5 queries/month
- **Professional tier** → Unlimited queries (paid)
- **Institutional tier** → Unlimited queries + admin features (paid)

```tsx
// In AuthModal.tsx or registration component
const result = await authService.register({
  username,
  password,
  role,
  gradeLevel,
  securityQuestion,
  securityAnswer,
});

// User automatically gets 'free' tier
// Show subscription page to upgrade
```

### Step 5: Display Quota Information

```tsx
import { aiQueryService } from './services/aiQueryService';

export function QuotaDisplay({ user }) {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    aiQueryService.getQueryQuota(user).then(setQuota);
  }, [user]);

  if (!quota) return null;

  return (
    <div className="quota-info">
      <div>Queries: {aiQueryService.getQuotaStatus(quota)}</div>
      <div>Usage: {aiQueryService.getQuotaPercentage(quota)}%</div>
      {aiQueryService.getQuotaWarning(quota) && (
        <div className="warning">
          {aiQueryService.getQuotaWarning(quota)}
        </div>
      )}
    </div>
  );
}
```

## Pricing Tiers

### Free Tier
- **Cost**: Free
- **AI Queries**: 5/month
- **Storage**: 1GB
- **Features**: Basic course access, limited assessments

### Professional Tier
- **Cost**: ₦99/month or ₦900/year
- **AI Queries**: Unlimited
- **Storage**: 50GB
- **Features**: Full course library, advanced assessments, priority support

### Institutional Tier
- **Cost**: ₦299/month or ₦2700/year
- **AI Queries**: 5000/month
- **Storage**: 500GB
- **Features**: Class management, custom assessments, admin dashboard

## Feature Access Matrix

| Feature | Free | Professional | Institutional | Admin |
|---------|------|--------------|---------------|-------|
| AI Tutor | ✓ (5/mo) | ✓ | ✓ | ✓ |
| Courses | 5 max | 50 | 500 | 1000 |
| Students | 0 | 30 | 500 | 10000 |
| Assessments | Basic | Advanced | Custom | Custom |
| Class Management | ✗ | ✓ | ✓ | ✓ |
| Export | ✗ | ✓ | ✓ | ✓ |
| Admin Dashboard | ✗ | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✓ | ✓ | ✓ |

## Query Quota Management

### Monthly Reset
- Queries reset automatically 30 days after the first query
- Manual reset available for admins
- Can be customized in `aiQueryService.ts`

### Checking Quota

```tsx
// Get full quota information
const quota = await aiQueryService.getQueryQuota(user);
console.log(quota);
// {
//   current: 3,
//   limit: 5,
//   resetDate: Date,
//   percentageUsed: 60,
//   canQuery: true
// }

// Check if user can query
const canQuery = await aiQueryService.canMakeQuery(user);

// Get formatted status
const status = aiQueryService.getQuotaStatus(quota);
// "2 / 5 queries remaining"

// Get warning if close to limit
const warning = aiQueryService.getQuotaWarning(quota);
```

## Payment Flow

### User Upgrade Flow

1. User clicks "Upgrade Now" on a tier
2. Paystack payment page opens
3. User enters payment details
4. Payment processes
5. Webhook triggers `handlePaystackWebhook()`
6. User tier updates in database
7. User is redirected back to app
8. Subscription active

### Webhook Processing

Handled automatically by `webhookService.ts`:

1. **charge.success** → Update user tier and subscription end date
2. **subscription.create** → Store subscription code
3. **subscription.disable** → Downgrade user to free tier
4. **invoice.payment_on_archive** → Process recurring payments

## Error Handling

### Common Errors and Solutions

#### "Query limit exceeded"
```tsx
// User has reached their monthly limit
// Solution: Show upgrade CTA
showUpgradeDialog('Upgrade to Professional for unlimited queries');
```

#### "Payment initialization failed"
```tsx
// Check Paystack keys in environment variables
// Verify internet connection
// Check Paystack status page
```

#### "Subscription downgrade failed"
```tsx
// Check database permissions
// Verify webhook is processing correctly
// Manual fix: Update user tier directly
```

## Testing

### Test Endpoints

```bash
# Test payment verification
curl -X POST http://localhost:5173/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{"reference": "test_ref_123"}'

# Test webhook
curl -X POST http://localhost:5173/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -d '{...webhook_event...}'

# Test access control
curl http://localhost:5173/api/user/features
```

### Test Cards (Paystack)

```
Successful: 4084 0343 1234 5678
Failed: 4084 0343 1234 5679
International: 5511 1111 1111 1118
```

## Database Schema

### Updated Users Table

```sql
-- Add subscription columns
ALTER TABLE users ADD COLUMN tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN query_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN query_reset_time TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN paystack_customer_code VARCHAR(255);
ALTER TABLE users ADD COLUMN paystack_subscription_code VARCHAR(255);
```

### Payments Table

```sql
CREATE TABLE payments (
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
```

## Environment Variables

```env
VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxx
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

## Next Steps

1. ✅ Set up Paystack account
2. ✅ Add environment variables
3. ✅ Update database schema
4. ✅ Import SubscriptionManager in dashboard
5. ✅ Add access control checks to components
6. ✅ Test payment flow
7. ✅ Set up webhook endpoint
8. ✅ Monitor payments in Paystack dashboard

## Support

For issues or questions, refer to:
- `PAYSTACK_SETUP.md` - Configuration guide
- `services/paymentService.ts` - Payment API documentation
- `services/aiQueryService.ts` - Query quota management
- `services/accessControl.ts` - Feature access control
