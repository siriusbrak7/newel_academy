import { Payment, User } from '../types';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const API_BASE_URL = 'https://api.paystack.co';

// Pricing tiers configuration
export const PRICING_TIERS = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    aiQueriesPerMonth: 5,
    storageGB: 1,
    features: [
      '5 AI tutor queries per month',
      '1GB storage',
      'Basic course access',
      'Limited assessments'
    ]
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 99,
    yearlyPrice: 900, // 2 months free
    aiQueriesPerMonth: 200,
    storageGB: 50,
    features: [
      'Unlimited AI tutor queries',
      '50GB storage',
      'Full course library',
      'Advanced assessments',
      'Priority support'
    ]
  },
  institutional: {
    name: 'Institutional',
    monthlyPrice: 299,
    yearlyPrice: 2700,
    aiQueriesPerMonth: 5000,
    storageGB: 500,
    features: [
      'Unlimited AI queries',
      '500GB storage',
      'Class management',
      'Custom assessments',
      'Admin dashboard',
      'Dedicated support'
    ]
  }
};

interface PaystackInitializePaymentRequest {
  email: string;
  amount: number;
  planType: 'monthly' | 'yearly';
  metadata: {
    userId: string;
    username: string;
    tier: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    status: string;
    amount: number;
    paid_at: string;
    customer: {
      id: number;
      customer_code: string;
    };
  };
}

export const paymentService = {
  /**
   * Initialize a payment with Paystack
   */
  async initializePayment(request: PaystackInitializePaymentRequest) {
    try {
      const tierConfig = PRICING_TIERS[request.metadata.tier as keyof typeof PRICING_TIERS];
      if (!tierConfig) {
        throw new Error('Invalid tier selected');
      }

      const amount = request.planType === 'monthly' ? 
        tierConfig.monthlyPrice * 100 : // Convert to kobo
        tierConfig.yearlyPrice * 100;

      const response = await fetch(`${API_BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.email,
          amount,
          plan: getPlanCode(request.metadata.tier, request.planType),
          metadata: request.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Paystack error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
      };
    } catch (error) {
      console.error('Payment initialization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed',
      };
    }
  },

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Payment verification error:', error);
      return null;
    }
  },

  /**
   * Create a subscription plan on Paystack
   */
  async createSubscriptionPlan(
    name: string,
    amount: number,
    interval: 'monthly' | 'yearly'
  ) {
    try {
      const response = await fetch(`${API_BASE_URL}/plan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          amount: amount * 100,
          interval: interval === 'yearly' ? 'yearly' : 'monthly',
          description: `${name} subscription`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Plan creation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, plan: data.data };
    } catch (error) {
      console.error('Plan creation error:', error);
      return { success: false, error };
    }
  },

  /**
   * Authorize a customer for recurring payments
   */
  async authorizeCustomer(email: string, authorizationCode: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/transaction/charge_authorization`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          authorization_code: authorizationCode,
          amount: 0, // Just authorize, don't charge
        }),
      });

      if (!response.ok) {
        throw new Error(`Authorization failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Authorization error:', error);
      return { success: false, error };
    }
  },

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionCode: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscription/${subscriptionCode}/disable`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cancellation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Cancellation error:', error);
      return { success: false, error };
    }
  },

  /**
   * Get payment history
   */
  async getPaymentHistory(customerId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/customer/${customerId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, transactions: data.data };
    } catch (error) {
      console.error('History fetch error:', error);
      return { success: false, error };
    }
  },

  /**
   * Get client-side Paystack public key
   */
  getPublicKey(): string {
    return PAYSTACK_PUBLIC_KEY;
  },

  /**
   * Format currency for display
   */
  formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  },

  /**
   * Check if tier upgrade is available
   */
  canUpgradeTier(currentTier: string, newTier: string): boolean {
    const tierHierarchy = ['free', 'professional', 'institutional'];
    const currentIndex = tierHierarchy.indexOf(currentTier);
    const newIndex = tierHierarchy.indexOf(newTier);
    return newIndex > currentIndex;
  },
};

/**
 * Helper function to get Paystack plan code
 */
function getPlanCode(tier: string, interval: 'monthly' | 'yearly'): string {
  const codes: Record<string, Record<string, string>> = {
    professional: {
      monthly: 'PLN_prof_monthly',
      yearly: 'PLN_prof_yearly',
    },
    institutional: {
      monthly: 'PLN_inst_monthly',
      yearly: 'PLN_inst_yearly',
    },
  };

  return codes[tier]?.[interval] || '';
}

/**
 * Process webhook event from Paystack
 */
export function processPaystackWebhook(event: any): Payment | null {
  if (event.event === 'charge.success') {
    const data = event.data;
    return {
      id: data.reference,
      userId: data.metadata?.userId || '',
      username: data.metadata?.username || '',
      amount: data.amount / 100, // Convert from kobo
      currency: data.currency,
      paystackReference: data.reference,
      status: 'success',
      planType: data.metadata?.planType || 'monthly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: data.metadata,
    };
  }

  return null;
}
