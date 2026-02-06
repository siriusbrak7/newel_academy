# System Architecture & Diagrams

## 📊 Data Flow Diagram

```
User Login
    ↓
[Get User with tier='free']
    ↓
Dashboard Loads
    ↓
├─→ Display User Tier
├─→ Load Query Quota
└─→ Check Feature Access
    ↓
User Tries Premium Feature
    ↓
[useTierAccess(user).has(feature)]
    ↓
Access Denied?
    ├─→ Yes: Show Upgrade Prompt
    └─→ No: Show Feature
        ↓
    User Clicks "Upgrade"
        ↓
    [SubscriptionManager Opens]
        ↓
    User Selects Tier & Period
        ↓
    [paymentService.initializePayment()]
        ↓
    Redirect to Paystack
        ↓
    User Pays
        ↓
    Paystack Webhook: charge.success
        ↓
    [handlePaystackWebhook()]
        ↓
    Database Updated
        ├─→ tier: 'professional'
        ├─→ subscription_ends_at: set
        └─→ query_count: reset
        ↓
    User Redirected to App
        ↓
    Features Unlocked ✅
```

## 🏗️ System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Components                                            │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ • Dashboard                                            │ │
│  │   └─ SubscriptionManager                              │ │
│  │      ├─ Current Plan Display                          │ │
│  │      ├─ Pricing Cards                                 │ │
│  │      └─ Payment Flow                                  │ │
│  │ • AITutorChat                                         │ │
│  │   └─ Feature Gate (useTierAccess)                     │ │
│  │      └─ Query Quota Check (aiQueryService)           │ │
│  │ • ClassManagement                                     │ │
│  │   └─ Feature Gate (useTierAccess)                     │ │
│  │ • DashboardIntegration (Example)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services (Business Logic)                           │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │  paymentService             aiQueryService            │ │
│  │  ├─ initializePayment()     ├─ getQueryQuota()       │ │
│  │  ├─ verifyPayment()         ├─ canMakeQuery()        │ │
│  │  ├─ cancelSubscription()    ├─ incrementQueryCount() │ │
│  │  └─ PRICING_TIERS           └─ getQuotaStatus()      │ │
│  │                                                        │ │
│  │  accessControl              webhookService            │ │
│  │  ├─ useTierAccess()         ├─ handlePaystackWebhook()
│  │  ├─ getTierFeatures()       ├─ checkSubscriptionExpiry()
│  │  ├─ hasFeatureAccess()      └─ Event Handlers        │ │
│  │  └─ requireTierAccess()                              │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ↓
            ┌───────────────────────────────┐
            │    External APIs              │
            ├───────────────────────────────┤
            │ • Paystack API                │
            │   ├─ Initialize               │
            │   ├─ Verify                   │
            │   └─ Webhooks                 │
            │                               │
            │ • Supabase                    │
            │   ├─ users table              │
            │   └─ payments table           │
            └───────────────────────────────┘
```

## 🔄 Payment Processing Sequence

```
Client                Browser             Paystack            Backend
  │                     │                    │                    │
  ├─ Click Upgrade ────→│                    │                    │
  │                     │                    │                    │
  │                     ├─ paymentService.initializePayment() ─→  │
  │                     │                    │                    │
  │                     │  ← Authorization URL ← ← ← ← ← ← ← ←  │
  │                     │                    │                    │
  │  ← Redirect to ←  ←│                    │                    │
  │    Paystack        │                    │                    │
  │                     │  ← ← ← Checkout Form ← ← ← ← ← ← ← ← │
  │                     │                    │                    │
  ├─ Enter Card ────────────→ Process Payment                      │
  │                     │                    │                    │
  │                     │    Confirm Payment                       │
  │                     │ ← ← ← ← ← ← ← ← ←                      │
  │                     │                    │                    │
  │  ← Redirect Back ← ← ← ← ← ← ← ← ← ←   │                    │
  │                     │                    │                    │
  │                     │                    │ Webhook →          │
  │                     │                    │ charge.success     │
  │                     │                    │    ────→│          │
  │                     │                    │         │          │
  │                     │                    │    handleWebhook()  │
  │                     │                    │    Update tier     │
  │                     │                    │    ←────           │
  │                     │                    │    Webhook OK ←    │
  │                     │                    │                    │
  │  ← Tier Updated ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←  │
  │    Features                              │                    │
  │    Unlocked ✅                           │                    │
```

## 🗄️ Database Schema Diagram

```
┌─────────────────────────────────────────┐
│ USERS TABLE                             │
├─────────────────────────────────────────┤
│ • id (PK)                               │
│ • username (UNIQUE)                     │
│ • password_hash                         │
│ • role (admin | teacher | student)      │
│ • approved (boolean)                    │
│ • grade_level (optional)                │
│ • security_question                     │
│ • security_answer                       │
├─────────────────────────────────────────┤
│ SUBSCRIPTION FIELDS (NEW)                │
├─────────────────────────────────────────┤
│ • tier (free|professional|institutional)│
│ • query_count (integer)                 │
│ • query_reset_time (timestamp)          │
│ • subscription_ends_at (timestamp)      │
│ • paystack_customer_code (varchar)      │
│ • paystack_subscription_code (varchar)  │
│ • created_at                            │
│ • updated_at                            │
└─────────────────────────────────────────┘
         │         1
         │
         │ N
         └──────────────┬─────────────────┐
                        │                 │
                        ↓                 │
     ┌─────────────────────────────────┐  │
     │ PAYMENTS TABLE                  │  │
     ├─────────────────────────────────┤  │
     │ • id (PK)                       │  │
     │ • username (FK → users)         │  │
     │ • user_id (varchar)             │  │
     │ • amount (decimal)              │  │
     │ • currency (varchar)            │  │
     │ • paystack_reference (UNIQUE)   │  │
     │ • status (varchar)              │  │
     │ • plan_type (monthly|yearly)    │  │
     │ • metadata (jsonb)              │  │
     │ • created_at                    │  │
     │ • updated_at                    │  │
     └─────────────────────────────────┘  │
```

## 🎯 Feature Access Matrix

```
┌──────────────────────┬────────┬───────────────┬─────────────────┐
│      FEATURE         │ FREE   │ PROFESSIONAL  │ INSTITUTIONAL   │
├──────────────────────┼────────┼───────────────┼─────────────────┤
│ AI Tutor             │ ✓ 5/mo │ ✓ Unlimited   │ ✓ Unlimited     │
│ Courses              │ ✓ 5    │ ✓ 50          │ ✓ 500           │
│ Basic Assessments    │ ✓      │ ✓             │ ✓               │
│ Advanced Assessments │ ✗      │ ✓             │ ✓               │
│ Custom Assessments   │ ✗      │ ✗             │ ✓               │
│ Class Management     │ ✗      │ ✓             │ ✓               │
│ Student Management   │ ✗ (0)  │ ✓ (30)        │ ✓ (500)         │
│ Export Data          │ ✗      │ ✓             │ ✓               │
│ Admin Dashboard      │ ✗      │ ✗             │ ✓               │
│ Priority Support     │ ✗      │ ✓             │ ✓               │
│ Storage              │ ✓ 1GB  │ ✓ 50GB        │ ✓ 500GB         │
│ Price/Month          │ Free   │ ₦99           │ ₦299            │
│ Price/Year           │ Free   │ ₦900          │ ₦2700           │
└──────────────────────┴────────┴───────────────┴─────────────────┘
```

## 🔐 Access Control Flow

```
[User Component Wants Feature]
            │
            ↓
  useTierAccess(user)
            │
            ↓
  tier.has('aiTutor')
            │
            ├─→ true: Return feature component
            │
            └─→ false: Return upgrade prompt
                       │
                       ↓
            tier.getUpgradeMessage('aiTutor')
                       │
                       ↓
            "Upgrade to Professional..."
                       │
                       ↓
            [Show SubscriptionManager]
```

## 🔄 Query Quota Flow

```
[User Makes AI Query]
            │
            ↓
canMakeQuery(user)
            │
            ├─→ quota.current >= quota.limit
            │        │
            │        ├─→ true: Deny query
            │        │         Show upgrade prompt
            │        │
            │        └─→ false: Allow query
            │                   │
            │                   ↓
            │            Make AI query
            │            (Call API)
            │                   │
            │                   ↓
            │        incrementQueryCount()
            │                   │
            │                   ├─→ Update DB
            │                   │
            │                   └─→ Check reset needed
            │                       (30 days passed?)
            │
            └─→ Return result
```

## 🌐 Integration Points

```
Newel Academy
│
├─ Frontend Components
│  ├─ Dashboard
│  │  └─ SubscriptionManager
│  ├─ AI Tutor
│  │  └─ Feature Gate + Quota Check
│  └─ Classes
│     └─ Feature Gate
│
├─ Services Layer
│  ├─ paymentService
│  ├─ aiQueryService
│  ├─ accessControl
│  ├─ webhookService
│  └─ supabaseService (updated)
│
├─ Database
│  ├─ users (tier fields added)
│  └─ payments (new table)
│
├─ External APIs
│  └─ Paystack
│     ├─ Payment initialization
│     ├─ Transaction verification
│     └─ Webhook events
│
└─ Backend API (to implement)
   ├─ /api/payments/*
   ├─ /api/subscriptions/*
   ├─ /api/webhooks/paystack
   └─ /api/users/*/features
```

## 📊 Tier Progression

```
Free User                Professional              Institutional
     │                       │                          │
     ├─ 5 queries/mo         ├─ Unlimited queries       ├─ Unlimited queries
     ├─ 1GB storage          ├─ 50GB storage            ├─ 500GB storage
     ├─ 5 courses            ├─ 50 courses              ├─ 500 courses
     ├─ 0 students           ├─ 30 students             ├─ 500 students
     └─ Basic features       ├─ Advanced features       ├─ Advanced features
                             ├─ Class management        ├─ Class management
                             └─ Priority support        ├─ Admin dashboard
                                                        └─ Dedicated support
```

## 🔌 API Integration Points

```
Frontend                Backend              Paystack
   │                       │                    │
   ├─ Initialize Payment ──→│                    │
   │                       ├─ Call Paystack ───→│
   │                       │                    │
   │  ← Auth URL ← ← ← ← ←│  ← ← ← ← ← ← ← ← │
   │                       │                    │
   ├─ Redirect to Paystack ────────────────────→│
   │                       │                    │
   │  ← Return to App ← ← ← ← ← ← ← ← ← ← ← ← │
   │                       │                    │
   │                       ← Webhook Event ←   │
   │                       (charge.success)    │
   │                       │                    │
   │                       ├─ Update Database  │
   │                       │                    │
   │  ← Update Tier ← ← ← ←│                    │
```

## 🔄 Webhook Event Processing

```
Paystack Server
        │
        └─ charge.success
           ├─ subscription.create
           ├─ subscription.disable
           └─ invoice.payment_on_archive
           │
           ↓
    Webhook Endpoint
           │
           ├─→ handleChargeSuccess()
           │   ├─ Create payment record
           │   ├─ Update user tier
           │   └─ Send confirmation
           │
           ├─→ handleSubscriptionCreate()
           │   └─ Store subscription code
           │
           ├─→ handleSubscriptionDisable()
           │   └─ Downgrade to free
           │
           └─→ handleInvoicePayment()
               └─ Process recurring payment
```

## 📈 Quota Reset Cycle

```
Day 1: User Makes First Query
       queryResetTime = 2024-01-15
       queryCount = 1
            │
            ↓
Day 15: 15 days later
        queryCount = 5 (at limit for free tier)
            │
            ↓
Day 45: 30 days passed (RESET TRIGGERS)
        queryResetTime = 2024-02-14
        queryCount = 0
            │
            ↓
User can make queries again
```

---

## 📝 Legend

```
→  Data flow
├─ Component/Sub-component
│  Continuation
├─→ Decision (true)
└─→ Decision (false)
✓  Available/Enabled
✗  Not available/Disabled
PK Primary Key
FK Foreign Key
```

---

*These diagrams provide visual reference for understanding the subscription system architecture and data flows.*
