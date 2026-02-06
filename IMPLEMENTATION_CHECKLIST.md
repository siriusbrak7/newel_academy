# 🎯 Implementation Checklist - Tiered Subscription System

## Phase 1: Setup & Configuration ✅

### Environment
- [ ] Create Paystack account at [paystack.com](https://paystack.com)
- [ ] Complete KYC verification with Paystack
- [ ] Get Paystack API keys (Secret & Public)
- [ ] Add to `.env` file:
  ```env
  VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxx
  VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
  ```
- [ ] Test Paystack keys are working
- [ ] Set up separate test/live environments

### Database
- [ ] Backup current `users` table
- [ ] Run migration to add tier fields:
  ```sql
  ALTER TABLE users ADD COLUMN tier VARCHAR(50) DEFAULT 'free';
  ALTER TABLE users ADD COLUMN query_count INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN query_reset_time TIMESTAMP DEFAULT NOW();
  ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP;
  ALTER TABLE users ADD COLUMN paystack_customer_code VARCHAR(255);
  ALTER TABLE users ADD COLUMN paystack_subscription_code VARCHAR(255);
  ```
- [ ] Create `payments` table with correct schema
- [ ] Add indexes for performance:
  ```sql
  CREATE INDEX idx_users_tier ON users(tier);
  CREATE INDEX idx_payments_username ON payments(username);
  CREATE INDEX idx_payments_reference ON payments(paystack_reference);
  ```
- [ ] Verify existing users have `tier='free'` set

## Phase 2: Frontend Integration ✅

### Components
- [ ] Import `SubscriptionManager` in dashboard/profile page
- [ ] Display user's current tier
- [ ] Add quota indicator (if AI tutor available)
- [ ] Add upgrade prompt to main navigation

### Pages/Routes
- [ ] Create `/subscription` or `/billing` page
- [ ] Add `SubscriptionManager` component to dashboard
- [ ] Add tier badge to user profile
- [ ] Add quota display to AI tutor page
- [ ] Create success/failure pages for payment callbacks

### Feature Gating
- [ ] Wrap AI Tutor with tier check:
  ```tsx
  const tier = useTierAccess(user);
  if (!tier.has('aiTutor')) return <UpgradePrompt />;
  ```
- [ ] Wrap Class Management with tier check
- [ ] Wrap Export feature with tier check
- [ ] Wrap Custom Assessments with tier check
- [ ] Add export feature if not exists

### Styling
- [ ] Import `styles/subscription.css` in main CSS
- [ ] Test responsive design on mobile
- [ ] Verify dark/light theme compatibility
- [ ] Test all button states (hover, disabled, loading)

## Phase 3: Backend Integration

### API Endpoints
- [ ] Create `/api/payments/initialize` endpoint
- [ ] Create `/api/payments/:reference/verify` endpoint
- [ ] Create `/api/payments/webhook/paystack` endpoint
- [ ] Create `/api/subscriptions/:username/upgrade` endpoint
- [ ] Create `/api/subscriptions/:username/cancel` endpoint
- [ ] Create `/api/users/:username/quota` endpoint
- [ ] Create `/api/users/:username/features` endpoint

### Webhook Handling
- [ ] Implement webhook signature verification
- [ ] Handle `charge.success` event
- [ ] Handle `subscription.create` event
- [ ] Handle `subscription.disable` event
- [ ] Handle `invoice.payment_on_archive` event
- [ ] Log all webhook events for debugging
- [ ] Implement idempotency handling
- [ ] Set up webhook retry mechanism

### Error Handling
- [ ] Validate all inputs
- [ ] Return proper HTTP status codes
- [ ] Log errors with context
- [ ] Don't expose sensitive info to users
- [ ] Implement fallback/retry logic

## Phase 4: Testing

### Unit Tests
- [ ] Test `paymentService` functions
- [ ] Test `aiQueryService` functions
- [ ] Test `accessControl` functions
- [ ] Test quota reset logic
- [ ] Test tier hierarchy validation

### Integration Tests
- [ ] Test payment flow end-to-end
- [ ] Test webhook processing
- [ ] Test user tier update
- [ ] Test quota enforcement
- [ ] Test feature access

### Payment Tests (Sandbox)
- [ ] Use test Paystack keys
- [ ] Test successful payment with test card: 4084 0343 1234 5678
- [ ] Test failed payment
- [ ] Test pending payment
- [ ] Test payment verification
- [ ] Verify webhook fires and user tier updates
- [ ] Test subscription creation and cancellation

### Feature Tests
- [ ] Free tier users can't exceed quota
- [ ] Professional users have unlimited queries
- [ ] Institutional users have access to admin
- [ ] Upgrade functionality works
- [ ] Downgrade/cancellation works
- [ ] Tier correctly shows in database

### Edge Cases
- [ ] Test with expired subscriptions
- [ ] Test with duplicate webhook events
- [ ] Test with network failures
- [ ] Test with invalid payment data
- [ ] Test concurrent upgrade attempts
- [ ] Test with very large query counts

## Phase 5: Optimization & Monitoring

### Performance
- [ ] Optimize database queries
- [ ] Add caching for tier features
- [ ] Minimize API calls
- [ ] Lazy load subscription component
- [ ] Test with 10k+ users

### Monitoring & Logging
- [ ] Set up error tracking (Sentry, etc)
- [ ] Log all payment events
- [ ] Monitor webhook failures
- [ ] Track subscription metrics
- [ ] Set up alerts for failures

### Analytics
- [ ] Track upgrade conversions
- [ ] Monitor churn rate
- [ ] Track revenue by tier
- [ ] Monitor query usage patterns
- [ ] Track feature usage

## Phase 6: Production Deployment

### Pre-Launch
- [ ] Switch to Paystack live keys
- [ ] Enable HTTPS everywhere
- [ ] Set up backup/disaster recovery
- [ ] Create admin panel for managing subscriptions
- [ ] Set up customer support process
- [ ] Create FAQ for users

### Paystack Dashboard
- [ ] Configure webhook URL
- [ ] Subscribe to all required events:
  - [ ] `charge.success`
  - [ ] `subscription.create`
  - [ ] `subscription.disable`
  - [ ] `invoice.payment_on_archive`
- [ ] Set up email notifications
- [ ] Enable transaction verification
- [ ] Configure settlement account

### Documentation
- [ ] Document pricing and features
- [ ] Create user guides for subscription
- [ ] Create admin guide for managing subscriptions
- [ ] Document API endpoints for internal use
- [ ] Create troubleshooting guide

### User Communication
- [ ] Announce subscription system
- [ ] Create help articles
- [ ] Send in-app notifications
- [ ] Email existing free users about options
- [ ] Create pricing page
- [ ] Create FAQ section

## Phase 7: Post-Launch

### Monitoring
- [ ] Monitor payment success rate (target: >95%)
- [ ] Monitor webhook delivery (target: 99.9%)
- [ ] Track user satisfaction
- [ ] Monitor for fraud/chargebacks
- [ ] Check for broken features

### Maintenance
- [ ] Regular database backups
- [ ] Monitor payment failures
- [ ] Handle failed payments
- [ ] Manage subscription cancellations
- [ ] Update pricing if needed

### Improvements
- [ ] Collect user feedback
- [ ] Improve conversion rate
- [ ] Add more tiers if needed
- [ ] Implement coupons/discounts
- [ ] Add team billing
- [ ] Implement usage-based pricing

## Pricing Configuration

### Current Tiers
```
Free:           ₦0/month  (5 queries/month)
Professional:   ₦99/month (unlimited queries)
Institutional:  ₦299/month (5000 queries/month)
```

- [ ] Confirm pricing with business team
- [ ] Get approval to launch
- [ ] Document pricing rationale

## Files Created/Modified

### New Files ✅
- [x] `services/paymentService.ts` - Paystack integration
- [x] `services/aiQueryService.ts` - Query quota management
- [x] `services/accessControl.ts` - Feature gating
- [x] `services/webhookService.ts` - Webhook processing
- [x] `components/SubscriptionManager.tsx` - Subscription UI
- [x] `components/DashboardIntegration.tsx` - Integration example
- [x] `styles/subscription.css` - Styling
- [x] `PAYSTACK_SETUP.md` - Setup guide
- [x] `SUBSCRIPTION_IMPLEMENTATION.md` - Integration guide
- [x] `QUICK_REFERENCE.md` - Quick lookup
- [x] `SUBSCRIPTION_SYSTEM.md` - System overview
- [x] `API_REFERENCE.md` - API documentation
- [x] `IMPLEMENTATION_SUMMARY.md` - Summary

### Modified Files ✅
- [x] `types.ts` - Added tier fields
- [x] `constants.ts` - Updated demo users
- [x] `services/supabaseService.ts` - Added tier in registration

## Sign-Off

- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance tested
- [ ] Security audit passed
- [ ] Paystack approved
- [ ] Business approval
- [ ] Ready for production

## Timeline Estimate

| Phase | Estimate | Status |
|-------|----------|--------|
| Setup & Config | 1-2 days | ✅ |
| Frontend Integration | 2-3 days | ⏳ |
| Backend Integration | 3-4 days | ⏳ |
| Testing | 2-3 days | ⏳ |
| Optimization | 1-2 days | ⏳ |
| Deployment | 1 day | ⏳ |
| **Total** | **10-15 days** | ⏳ |

## Resources & References

- **Paystack Docs**: https://paystack.com/docs
- **Setup Guide**: [PAYSTACK_SETUP.md](PAYSTACK_SETUP.md)
- **Implementation Guide**: [SUBSCRIPTION_IMPLEMENTATION.md](SUBSCRIPTION_IMPLEMENTATION.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Example Code**: [DashboardIntegration.tsx](components/DashboardIntegration.tsx)

## Notes

- Start with Phase 1 (Setup) immediately
- Don't go live until all phases complete
- Use test keys during development/testing
- Switch to live keys only when ready for production
- Have customer support ready before launch
- Monitor closely after launch

---

**Questions?** Refer to documentation or contact the development team.

**Current Status**: ✅ All services and components created. Ready for frontend/backend integration.
