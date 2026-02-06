# Quick Reference - Subscription System

## 🚀 Quick Start Checklist

- [ ] Set Paystack environment variables
- [ ] Update database schema (see PAYSTACK_SETUP.md)
- [ ] Import `SubscriptionManager` in dashboard
- [ ] Add tier access checks to AI tutor component
- [ ] Test payment flow with test cards
- [ ] Deploy webhook endpoint
- [ ] Update navbar to show user tier

## 📦 Key Imports

```typescript
// Payment Management
import { paymentService, PRICING_TIERS } from './services/paymentService';

// Query Quota
import { aiQueryService } from './services/aiQueryService';

// Feature Access
import { useTierAccess, getTierFeatures, requireTierAccess } from './services/accessControl';

// Webhooks (Backend)
import { handlePaystackWebhook, checkSubscriptionExpiry } from './services/webhookService';

// UI
import { SubscriptionManager } from './components/SubscriptionManager';
```

## 💰 Pricing (Configurable)

| Tier | Monthly | Yearly | Queries/Month | Storage |
|------|---------|--------|---------------|---------|
| **Free** | Free | Free | 5 | 1GB |
| **Professional** | ₦99 | ₦900 | Unlimited | 50GB |
| **Institutional** | ₦299 | ₦2700 | Unlimited | 500GB |

## 🔒 Feature Access Examples

### Check if Feature Available
```tsx
const tier = useTierAccess(user);

// Check single feature
if (tier.has('aiTutor')) {
  // Feature available
}

// Check action
if (tier.canPerform('ai_tutor')) {
  // Can perform
}

// Get upgrade message
console.log(tier.getUpgradeMessage('classManagement'));
// "Upgrade to Professional for class management features"
```

### Conditional Rendering
```tsx
const tier = useTierAccess(user);

return (
  <>
    {tier.has('classManagement') ? (
      <ClassManagement />
    ) : (
      <UpgradePrompt 
        feature="Class Management"
        message={tier.getUpgradeMessage('classManagement')}
      />
    )}
  </>
);
```

## 📊 Query Quota Usage

### Check Quota
```tsx
const quota = await aiQueryService.getQueryQuota(user);

console.log(quota);
// {
//   current: 3,          // Queries used
//   limit: 5,            // Monthly limit
//   resetDate: Date,     // When quota resets
//   percentageUsed: 60,  // % of quota used
//   canQuery: true       // Can make more queries
// }
```

### Before Making AI Query
```tsx
const canQuery = await aiQueryService.canMakeQuery(user);

if (!canQuery) {
  alert('You have reached your monthly limit. Upgrade to continue.');
  return;
}

// Make your AI query...
const response = await aiService.query(question);

// After successful query, increment counter
await aiQueryService.incrementQueryCount(user.username);
```

### Display Quota to User
```tsx
const quota = await aiQueryService.getQueryQuota(user);
const status = aiQueryService.getQuotaStatus(quota);
// "2 / 5 queries remaining"

const warning = aiQueryService.getQuotaWarning(quota);
// Shows warning if >75% used or null if under limit
```

## 💳 Payment Processing

### Initiate Upgrade
```tsx
const result = await paymentService.initializePayment({
  email: 'user@example.com',
  amount: 99, // Amount in NGN
  planType: 'monthly',
  metadata: {
    userId: user.username,
    username: user.username,
    tier: 'professional',
  },
});

if (result.success) {
  // Redirect to payment page
  window.location.href = result.authorizationUrl;
} else {
  console.error(result.error);
}
```

### Verify Payment
```tsx
const verification = await paymentService.verifyPayment(reference);

if (verification?.data?.status === 'success') {
  console.log('Payment successful');
  // User tier should be updated by webhook
}
```

## 🔧 Tier Checking

### Check Current Tier
```tsx
const tier = useTierAccess(user);

console.log(tier.isPaid());      // false for free, true for paid
console.log(tier.isAdmin());     // true for admin_free
console.log(tier.getTierName()); // "Professional"
```

### Get All Features for Tier
```tsx
const tier = useTierAccess(user);
const features = tier.getFeatures();

console.log(features);
// {
//   aiTutor: true,
//   unlimitedQueries: false,
//   advancedAssessments: false,
//   classManagement: false,
//   ...
// }
```

## 🛡️ Subscription Management

### Check Expiry
```tsx
import { checkSubscriptionExpiry } from './services/webhookService';

const updatedUser = await checkSubscriptionExpiry(user);

if (updatedUser.tier === 'free' && user.tier !== 'free') {
  // Subscription expired, user downgraded
}
```

### Cancel Subscription
```tsx
const result = await paymentService.cancelSubscription(
  user.paystackSubscriptionCode
);

if (result.success) {
  console.log('Subscription cancelled');
  // User should be downgraded to free by webhook
}
```

## 📱 UI Components

### Add Subscription Manager
```tsx
import { SubscriptionManager } from './components/SubscriptionManager';

<SubscriptionManager 
  user={user}
  onUpgradeComplete={() => refreshUserData()}
/>
```

### Display User Tier
```tsx
<div className="user-tier">
  <span>{useTierAccess(user).getTierName()} Plan</span>
</div>
```

### Show Quota Bar
```tsx
const quota = await aiQueryService.getQueryQuota(user);

<div className="quota-bar">
  <div style={{ width: `${quota.percentageUsed}%` }} />
</div>
<p>{aiQueryService.getQuotaStatus(quota)}</p>
```

## ⚙️ Environment Setup

### .env Variables
```env
# Paystack Keys (get from https://dashboard.paystack.com/settings/api)
VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxx
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

### Database Tables
```sql
-- Add to users table
ALTER TABLE users ADD tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD query_count INTEGER DEFAULT 0;
ALTER TABLE users ADD query_reset_time TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD subscription_ends_at TIMESTAMP;
ALTER TABLE users ADD paystack_customer_code VARCHAR(255);
ALTER TABLE users ADD paystack_subscription_code VARCHAR(255);

-- Create payments table
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
  metadata JSONB
);
```

## 🧪 Test Scenarios

### Test Free Tier User
```tsx
const freeUser: User = {
  username: 'student',
  role: 'student',
  tier: 'free',
  queryCount: 3,
  queryResetTime: new Date().toISOString(),
  // ... other fields
};

const tier = useTierAccess(freeUser);
console.log(tier.has('aiTutor'));          // true
console.log(tier.has('classManagement'));  // false
```

### Test Query Limit
```tsx
// First 5 queries succeed
for (let i = 0; i < 5; i++) {
  const success = await aiQueryService.incrementQueryCount('student');
  console.log(success); // true
}

// 6th query fails
const success = await aiQueryService.incrementQueryCount('student');
console.log(success); // false
```

### Test Payment Flow
1. User clicks "Upgrade to Professional"
2. Redirected to Paystack
3. Use test card: 4084 0343 1234 5678
4. Enter OTP: 123456
5. Payment completes
6. Webhook fires `charge.success`
7. User tier updated to 'professional'
8. User redirected back to app

## 📞 Common Issues

### "Paystack keys not found"
→ Check `.env` file has `VITE_PAYSTACK_*` variables

### "User tier not updating after payment"
→ Check webhook endpoint is deployed and Paystack webhook is configured

### "Query limit not enforcing"
→ Ensure `incrementQueryCount()` is called after every query

### "Feature access always false"
→ Check user object has `tier` field from database

## 🔗 Related Files

- **Setup**: [PAYSTACK_SETUP.md](PAYSTACK_SETUP.md)
- **Integration**: [SUBSCRIPTION_IMPLEMENTATION.md](SUBSCRIPTION_IMPLEMENTATION.md)
- **Summary**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Examples**: [components/DashboardIntegration.tsx](components/DashboardIntegration.tsx)

## 💡 Pro Tips

1. **Always check quota before AI queries** to give users clear feedback
2. **Show upgrade prompts at feature gates** to drive conversions
3. **Display tier on navbar** so users know their current plan
4. **Check subscription expiry on login** to handle expired subscriptions
5. **Use tier hierarchy** to prevent downgrades
6. **Cache tier features** to avoid repeated checks
7. **Test webhooks locally** with Paystack CLI before deploying

---

**Last Updated**: 2024
**Status**: ✅ Production Ready
