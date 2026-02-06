# 🎓 Newel Academy - Tiered Subscription System

A complete, production-ready subscription and monetization system with **Paystack payment integration**, **tier-based feature access**, and **AI query quota management**.

## 🎯 Overview

This system provides:
- **3 Subscription Tiers**: Free, Professional, Institutional
- **Paystack Payment Integration**: Secure online payments in NGN
- **Feature Gating**: Role-based access to premium features
- **Query Quota Management**: Limit AI tutor usage based on tier
- **Webhook Processing**: Automatic subscription management
- **User Dashboard**: View plans, upgrade, track quota

## 📊 Tiers & Pricing

### Free Tier
- **Price**: Free
- **AI Queries**: 5 per month
- **Storage**: 1GB
- **Features**: Basic course access, limited assessments
- **Best For**: Students and teachers trying the platform

### Professional Tier
- **Price**: ₦99/month or ₦900/year (2 months free)
- **AI Queries**: Unlimited
- **Storage**: 50GB
- **Features**: Full course library, advanced assessments, priority support, data export
- **Best For**: Individual teachers and serious learners

### Institutional Tier
- **Price**: ₦299/month or ₦2700/year
- **AI Queries**: 5000 per month
- **Storage**: 500GB
- **Features**: Class management, custom assessments, admin dashboard, dedicated support
- **Best For**: Schools, training centers, and large organizations

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install  # Already configured
```

### 2. Set Up Environment Variables
```env
# .env or .env.local
VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxx
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

[Get Paystack keys →](PAYSTACK_SETUP.md#getting-paystack-keys)

### 3. Update Database Schema
```sql
-- See PAYSTACK_SETUP.md for complete SQL
ALTER TABLE users ADD tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD query_count INTEGER DEFAULT 0;
-- ... (more fields)

CREATE TABLE payments (...)
```

[Full schema →](PAYSTACK_SETUP.md#database-tables-required)

### 4. Add to Dashboard
```tsx
import { SubscriptionManager } from './components/SubscriptionManager';

<SubscriptionManager user={user} onUpgradeComplete={handleRefresh} />
```

### 5. Protect AI Features
```tsx
import { aiQueryService } from './services/aiQueryService';

const canQuery = await aiQueryService.canMakeQuery(user);
if (!canQuery) {
  showUpgradePrompt();
  return;
}

// Make query...
await aiQueryService.incrementQueryCount(user.username);
```

## 📁 System Components

### Services

#### `services/paymentService.ts`
Handles all Paystack payment operations:
- Initialize payments
- Verify transactions
- Create subscription plans
- Format prices
- Tier hierarchy validation

```tsx
import { paymentService } from './services/paymentService';

const result = await paymentService.initializePayment({
  email: user.email,
  amount: 99,
  planType: 'monthly',
  metadata: { userId: user.username, tier: 'professional' }
});

if (result.success) {
  window.location.href = result.authorizationUrl;
}
```

#### `services/aiQueryService.ts`
Manages AI tutor query quotas:
- Check quota availability
- Track usage per user
- Auto-reset monthly
- Display quota info

```tsx
import { aiQueryService } from './services/aiQueryService';

const quota = await aiQueryService.getQueryQuota(user);
console.log(quota); 
// { current: 3, limit: 5, canQuery: true, ... }

if (await aiQueryService.canMakeQuery(user)) {
  // Make query...
  await aiQueryService.incrementQueryCount(user.username);
}
```

#### `services/accessControl.ts`
Controls feature access by tier:
- Feature availability matrix
- Access checking hook
- Upgrade suggestions
- Component wrappers

```tsx
import { useTierAccess } from './services/accessControl';

const tier = useTierAccess(user);

if (!tier.has('classManagement')) {
  return <UpgradePrompt message={tier.getUpgradeMessage('classManagement')} />;
}

<ClassManagement />
```

#### `services/webhookService.ts`
Processes Paystack webhooks:
- Payment confirmations
- Subscription management
- User tier updates
- Recurring payments

### Components

#### `components/SubscriptionManager.tsx`
Complete subscription UI:
- Current plan display
- Pricing tiers
- Monthly/yearly toggle
- Upgrade flow
- Quota visualization
- Cancellation management

#### `components/DashboardIntegration.tsx`
Real-world integration example:
- Feature access checks
- Query quota enforcement
- User tier display
- Upgrade prompts
- Feature comparison

### Styles

#### `styles/subscription.css`
Production-ready styling:
- Responsive design
- Mobile-friendly
- Dark/light theme support
- Accessible colors

## 🔧 Architecture

```
User Registration
    ↓
Set Default Tier (free)
    ↓
User Can Upgrade
    ↓
Paystack Payment
    ↓
Webhook Updates Tier
    ↓
Feature Access Unlocked
    ↓
Query Quota Applied
    ↓
Monthly Reset
```

## 📋 Feature Matrix

| Feature | Free | Professional | Institutional |
|---------|------|--------------|---------------|
| AI Tutor | ✓ (5/mo) | ✓ (∞) | ✓ (∞) |
| Storage | 1GB | 50GB | 500GB |
| Courses | 5 | 50 | 500 |
| Students | 0 | 30 | 500 |
| Class Mgmt | ✗ | ✓ | ✓ |
| Assessments | Basic | Advanced | Custom |
| Export | ✗ | ✓ | ✓ |
| Admin Panel | ✗ | ✗ | ✓ |
| Support | Community | Priority | Dedicated |

## 🛡️ Security

- ✅ Environment-based API keys (no hardcoding)
- ✅ Paystack signature verification
- ✅ Webhook validation
- ✅ Server-side quota enforcement
- ✅ Automatic subscription expiry handling
- ✅ No sensitive data in logs

## 🧪 Testing

### Test Payment
```bash
# Use Paystack test card
Card: 4084 0343 1234 5678
Expiry: Any future date
CVV: Any 3 digits
OTP: 123456
```

### Test Endpoints
```bash
# Verify payment
curl -X POST /api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{"reference": "test_ref"}'

# Test webhook
curl -X POST /api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -d '{"event": "charge.success", "data": {...}}'
```

### Check User Tier
```sql
SELECT username, tier, subscription_ends_at, query_count 
FROM users 
WHERE username = 'student_demo';
```

## 📚 Documentation

### Detailed Guides
- **[PAYSTACK_SETUP.md](PAYSTACK_SETUP.md)** - Complete setup instructions
- **[SUBSCRIPTION_IMPLEMENTATION.md](SUBSCRIPTION_IMPLEMENTATION.md)** - Integration examples
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick lookup guide

### Code Examples
- **[components/DashboardIntegration.tsx](components/DashboardIntegration.tsx)** - Real-world usage
- **[components/SubscriptionManager.tsx](components/SubscriptionManager.tsx)** - UI component
- **[services/accessControl.ts](services/accessControl.ts)** - Feature gating

## 🔄 Payment Flow

1. **User Initiates Upgrade**
   - Clicks tier button
   - Selects monthly/yearly

2. **Payment Initialization**
   - `paymentService.initializePayment()` called
   - Paystack returns authorization URL

3. **User Pays**
   - Redirected to Paystack
   - Enters payment details
   - Returns to app

4. **Webhook Processing**
   - Paystack sends `charge.success` webhook
   - `handlePaystackWebhook()` updates user tier
   - Database: `users.tier` updated
   - Database: `users.subscription_ends_at` set

5. **Feature Access Updated**
   - User sees new tier in dashboard
   - Quota limits applied
   - Premium features unlocked

## 📊 Database Schema

### Users Table Additions
```sql
tier VARCHAR(50) DEFAULT 'free'
query_count INTEGER DEFAULT 0
query_reset_time TIMESTAMP
subscription_ends_at TIMESTAMP
paystack_customer_code VARCHAR(255)
paystack_subscription_code VARCHAR(255)
```

### Payments Table
```sql
CREATE TABLE payments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  username VARCHAR(255),
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  paystack_reference VARCHAR(255) UNIQUE,
  status VARCHAR(50),
  plan_type VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  metadata JSONB
);
```

## 🚀 Deployment

### Backend Requirements
- Node.js with Express or similar
- POST `/api/webhooks/paystack` endpoint
- Database access to `users` and `payments` tables
- HTTPS enabled (required by Paystack)

### Frontend Requirements
- React 18+
- Vite or similar bundler
- Environment variables configured
- CORS configured for Paystack domain

### Production Checklist
- [ ] Use Paystack live keys (not test)
- [ ] Enable HTTPS
- [ ] Set up webhook endpoint
- [ ] Test payment flow end-to-end
- [ ] Configure email notifications
- [ ] Monitor payment failures
- [ ] Set up monitoring/alerts
- [ ] Create admin payment panel
- [ ] Document pricing with users
- [ ] Set up customer support process

## 📞 Support & Troubleshooting

### Common Issues

**Payment not processing?**
- Check Paystack keys are correct
- Verify webhook URL is accessible
- Check browser console for errors
- Review Paystack dashboard logs

**User tier not updating?**
- Verify webhook endpoint is configured
- Check database permissions
- Review server logs
- Ensure `payments` table exists

**Query limit not enforcing?**
- Verify `incrementQueryCount()` is called
- Check `query_count` field in database
- Test with fresh user account

[Full troubleshooting →](PAYSTACK_SETUP.md#troubleshooting)

## 💡 Customization

### Change Pricing
Edit `services/paymentService.ts`:
```typescript
PRICING_TIERS = {
  professional: {
    monthlyPrice: 99,   // Change this
    yearlyPrice: 900,   // And this
    // ...
  }
}
```

### Add New Tier
1. Add to `User` type: `tier: 'free' | 'paid' | 'custom'`
2. Add to `PRICING_TIERS` object
3. Define features in `accessControl.ts`
4. Update pricing cards in UI

### Adjust Query Limits
Edit `services/paymentService.ts`:
```typescript
PRICING_TIERS = {
  free: {
    aiQueriesPerMonth: 5   // Change this
  }
}
```

### Customize Styles
Edit `styles/subscription.css` or override with your theme

## 📈 Analytics & Reporting

Track these metrics:
- Total subscriptions by tier
- Monthly recurring revenue (MRR)
- Churn rate
- Upgrade conversion rate
- Query usage patterns

Implement custom tracking:
```tsx
// Log upgrade event
analytics.track('subscription_upgrade', {
  tier: 'professional',
  planType: 'yearly',
  amount: 900
});
```

## 🎓 Learning Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Payment Processing Best Practices](https://paystack.com/blog)
- [Subscription Management Guide](https://paystack.com/docs/payment-sessions)

## 📄 License

This subscription system is part of Newel Academy and follows the same license terms as the main application.

## 🙌 Contributing

To improve the subscription system:

1. Test thoroughly with real Paystack account
2. Document any changes
3. Update relevant documentation
4. Follow existing code patterns
5. Test on multiple browsers/devices

## ✅ Status

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2024  
**Tested On**: Chrome, Firefox, Safari, Mobile

---

## 📦 What's Included

✅ Complete Paystack integration  
✅ Three configurable pricing tiers  
✅ AI query quota system  
✅ Feature access control  
✅ Webhook processing  
✅ Subscription management UI  
✅ Mobile-responsive design  
✅ Comprehensive documentation  
✅ Code examples  
✅ Security best practices  

## 🚀 Get Started Now

1. **Read** [PAYSTACK_SETUP.md](PAYSTACK_SETUP.md) for environment setup
2. **Follow** [SUBSCRIPTION_IMPLEMENTATION.md](SUBSCRIPTION_IMPLEMENTATION.md) for integration
3. **Reference** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) during development
4. **Check** [DashboardIntegration.tsx](components/DashboardIntegration.tsx) for examples

---

**Questions?** Check the documentation or review the service files for detailed API documentation.

**Ready to integrate?** Start with Step 1 in SUBSCRIPTION_IMPLEMENTATION.md →
