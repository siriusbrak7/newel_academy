import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { PRICING_TIERS, paymentService } from '../services/paymentService';
import { aiQueryService } from '../services/aiQueryService';
import '../styles/subscription.css';

interface SubscriptionProps {
  user: User;
  onUpgradeComplete?: () => void;
}

interface PaymentState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export const SubscriptionManager: React.FC<SubscriptionProps> = ({
  user,
  onUpgradeComplete,
}) => {
  const [quota, setQuota] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<string>(user.tier);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isLoading: false,
    error: null,
    success: false,
  });

  useEffect(() => {
    loadQuota();
  }, [user]);

  const loadQuota = async () => {
    const q = await aiQueryService.getQueryQuota(user);
    setQuota(q);
  };

  const handleUpgrade = async (tier: string) => {
    if (!['professional', 'institutional'].includes(tier)) {
      setPaymentState({
        isLoading: false,
        error: 'Invalid tier selection',
        success: false,
      });
      return;
    }

    if (!paymentService.canUpgradeTier(user.tier, tier)) {
      setPaymentState({
        isLoading: false,
        error: 'You cannot downgrade your subscription',
        success: false,
      });
      return;
    }

    setPaymentState({ isLoading: true, error: null, success: false });

    try {
      const result = await paymentService.initializePayment({
        email: user.username + '@newell.edu', // Adjust based on actual user email
        amount: PRICING_TIERS[tier as keyof typeof PRICING_TIERS][
          selectedInterval === 'monthly' ? 'monthlyPrice' : 'yearlyPrice'
        ],
        planType: selectedInterval,
        metadata: {
          userId: user.username,
          username: user.username,
          tier: tier,
        },
      });

      if (result.success && result.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = result.authorizationUrl;
      } else {
        setPaymentState({
          isLoading: false,
          error: result.error || 'Failed to initialize payment',
          success: false,
        });
      }
    } catch (error) {
      setPaymentState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Payment failed',
        success: false,
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!user.paystackSubscriptionCode) {
      setPaymentState({
        isLoading: false,
        error: 'No active subscription to cancel',
        success: false,
      });
      return;
    }

    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }

    setPaymentState({ isLoading: true, error: null, success: false });

    try {
      const result = await paymentService.cancelSubscription(
        user.paystackSubscriptionCode
      );

      if (result.success) {
        setPaymentState({
          isLoading: false,
          error: null,
          success: true,
        });
        onUpgradeComplete?.();
      } else {
        setPaymentState({
          isLoading: false,
          error: 'Failed to cancel subscription',
          success: false,
        });
      }
    } catch (error) {
      setPaymentState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Cancellation failed',
        success: false,
      });
    }
  };

  return (
    <div className="subscription-manager">
      {/* Current Plan Status */}
      <div className="current-plan-card">
        <h3>Current Plan</h3>
        <div className="plan-badge">
          {PRICING_TIERS[user.tier as keyof typeof PRICING_TIERS]?.name || 'Free'}
        </div>

        {quota && (
          <div className="quota-info">
            <div className="quota-label">AI Query Quota</div>
            <div className="quota-bar">
              <div
                className="quota-filled"
                style={{ width: `${quota.percentageUsed}%` }}
              ></div>
            </div>
            <div className="quota-text">
              {aiQueryService.getQuotaStatus(quota)}
            </div>

            {aiQueryService.getQuotaWarning(quota) && (
              <div className="quota-warning">
                {aiQueryService.getQuotaWarning(quota)}
              </div>
            )}
          </div>
        )}

        {user.subscriptionEndsAt && (
          <div className="subscription-end">
            <p>Renewal Date: {new Date(user.subscriptionEndsAt).toLocaleDateString()}</p>
          </div>
        )}

        {user.paystackSubscriptionCode && user.tier !== 'free' && (
          <button
            className="btn-cancel-subscription"
            onClick={handleCancelSubscription}
            disabled={paymentState.isLoading}
          >
            {paymentState.isLoading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        )}
      </div>

      {/* Pricing Plans */}
      {user.tier === 'free' && (
        <div className="pricing-section">
          <div className="interval-toggle">
            <button
              className={selectedInterval === 'monthly' ? 'active' : ''}
              onClick={() => setSelectedInterval('monthly')}
            >
              Monthly
            </button>
            <button
              className={selectedInterval === 'yearly' ? 'active' : ''}
              onClick={() => setSelectedInterval('yearly')}
            >
              Yearly (Save 25%)
            </button>
          </div>

          <div className="pricing-cards">
            {['professional', 'institutional'].map((tier) => {
              const config = PRICING_TIERS[tier as keyof typeof PRICING_TIERS];
              const price = selectedInterval === 'monthly' ? config.monthlyPrice : config.yearlyPrice;

              return (
                <div key={tier} className="pricing-card">
                  <h4>{config.name}</h4>
                  <div className="price">
                    {paymentService.formatPrice(price)}
                    <span>/{selectedInterval === 'monthly' ? 'month' : 'year'}</span>
                  </div>

                  <div className="features">
                    {config.features.map((feature, idx) => (
                      <div key={idx} className="feature">
                        <span className="checkmark">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn-upgrade"
                    onClick={() => handleUpgrade(tier)}
                    disabled={paymentState.isLoading}
                  >
                    {paymentState.isLoading ? 'Processing...' : 'Upgrade Now'}
                  </button>
                </div>
              );
            })}
          </div>

          {paymentState.error && (
            <div className="error-message">{paymentState.error}</div>
          )}

          {paymentState.success && (
            <div className="success-message">
              Subscription updated successfully! Redirecting...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
