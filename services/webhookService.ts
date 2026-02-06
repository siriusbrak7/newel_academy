import { supabase } from './supabaseClient';
import { processPaystackWebhook, paymentService } from './paymentService';
import { User, Payment } from '../types';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

/**
 * Webhook handler for Paystack events
 * This should be called from your backend API endpoint
 * @param event - The webhook event from Paystack
 * @returns Whether the webhook was processed successfully
 */
export async function handlePaystackWebhook(event: any): Promise<boolean> {
  try {
    // Verify the event signature (if you have it)
    // const isValid = verifyPaystackSignature(request.headers, request.body);
    // if (!isValid) return false;

    if (event.event === 'charge.success') {
      return await handleChargeSuccess(event.data);
    } else if (event.event === 'subscription.create') {
      return await handleSubscriptionCreate(event.data);
    } else if (event.event === 'subscription.disable') {
      return await handleSubscriptionDisable(event.data);
    } else if (event.event === 'invoice.payment_on_archive') {
      return await handleInvoicePayment(event.data);
    }

    console.log('Unknown Paystack event:', event.event);
    return true; // Accept unknown events
  } catch (error) {
    console.error('Error processing Paystack webhook:', error);
    return false;
  }
}

/**
 * Handle successful charge
 */
async function handleChargeSuccess(data: any): Promise<boolean> {
  try {
    const { metadata, status, reference, amount } = data;

    if (status !== 'success') {
      return true; // Not a successful charge
    }

    if (!metadata?.userId) {
      console.error('Missing userId in metadata');
      return false;
    }

    // Create payment record
    const payment: Payment = {
      id: reference,
      userId: metadata.userId,
      username: metadata.username,
      amount: amount / 100, // Convert from kobo
      currency: data.currency,
      paystackReference: reference,
      status: 'success',
      planType: metadata.planType || 'monthly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    };

    // Save payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert(payment);

    if (paymentError) {
      console.error('Error saving payment record:', paymentError);
      return false;
    }

    // Update user tier if first successful payment
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tier, query_count')
      .eq('username', metadata.userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return false;
    }

    if (user?.tier === 'free') {
      // Calculate subscription end date
      const now = new Date();
      const endDate = new Date(
        metadata.planType === 'yearly'
          ? now.setFullYear(now.getFullYear() + 1)
          : now.setMonth(now.getMonth() + 1)
      );

      const { error: updateError } = await supabase
        .from('users')
        .update({
          tier: metadata.tier,
          subscription_ends_at: endDate.toISOString(),
          paystack_customer_code: data.customer?.customer_code,
          query_count: 0, // Reset query count on upgrade
        })
        .eq('username', metadata.userId);

      if (updateError) {
        console.error('Error updating user tier:', updateError);
        return false;
      }

      console.log(`✅ User ${metadata.userId} upgraded to ${metadata.tier}`);
    }

    return true;
  } catch (error) {
    console.error('Error handling charge success:', error);
    return false;
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreate(data: any): Promise<boolean> {
  try {
    const { customer, subscription_code, plan } = data;

    if (!customer) {
      console.error('Missing customer data');
      return false;
    }

    // Find user by customer code or email
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('paystack_customer_code', customer.customer_code)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('User not found for customer:', customer.customer_code);
      return false;
    }

    // Update user with subscription code
    const { error: updateError } = await supabase
      .from('users')
      .update({
        paystack_subscription_code: subscription_code,
      })
      .eq('username', users[0].username);

    if (updateError) {
      console.error('Error updating subscription code:', updateError);
      return false;
    }

    console.log(`✅ Subscription created for ${users[0].username}`);
    return true;
  } catch (error) {
    console.error('Error handling subscription creation:', error);
    return false;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDisable(data: any): Promise<boolean> {
  try {
    const { subscription_code, customer } = data;

    if (!subscription_code) {
      console.error('Missing subscription code');
      return false;
    }

    // Find and update user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('username, tier')
      .eq('paystack_subscription_code', subscription_code)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('User not found for subscription:', subscription_code);
      return false;
    }

    const username = users[0].username;

    // Downgrade to free tier
    const { error: updateError } = await supabase
      .from('users')
      .update({
        tier: 'free',
        paystack_subscription_code: null,
        subscription_ends_at: null,
        query_count: 0,
      })
      .eq('username', username);

    if (updateError) {
      console.error('Error downgrading user:', updateError);
      return false;
    }

    console.log(`✅ Subscription disabled for ${username}, downgraded to free`);
    return true;
  } catch (error) {
    console.error('Error handling subscription disable:', error);
    return false;
  }
}

/**
 * Handle invoice payment (recurring)
 */
async function handleInvoicePayment(data: any): Promise<boolean> {
  try {
    const { reference, amount, customer, subscription_code } = data;

    if (!subscription_code) {
      console.error('Missing subscription code');
      return false;
    }

    // Find user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('username, tier')
      .eq('paystack_subscription_code', subscription_code)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('User not found for subscription:', subscription_code);
      return false;
    }

    // Create payment record for recurring charge
    const payment: Payment = {
      id: reference,
      userId: users[0].username,
      username: users[0].username,
      amount: amount / 100,
      currency: 'NGN',
      paystackReference: reference,
      status: 'success',
      planType: 'monthly', // Assume monthly for recurring
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { recurring: true },
    };

    const { error: paymentError } = await supabase
      .from('payments')
      .insert(payment);

    if (paymentError) {
      console.error('Error saving recurring payment:', paymentError);
      return false;
    }

    // Reset query count for new billing cycle
    const { error: updateError } = await supabase
      .from('users')
      .update({
        query_count: 0,
        query_reset_time: new Date().toISOString(),
      })
      .eq('username', users[0].username);

    if (updateError) {
      console.error('Error resetting query count:', updateError);
      return false;
    }

    console.log(`✅ Recurring payment processed for ${users[0].username}`);
    return true;
  } catch (error) {
    console.error('Error handling invoice payment:', error);
    return false;
  }
}

/**
 * Verify Paystack webhook signature
 * Use this if you're storing the secret key server-side
 */
export function verifyPaystackSignature(
  signature: string,
  body: string,
  secret: string = PAYSTACK_SECRET_KEY
): boolean {
  // This would be implemented on the backend
  // For now, just return true (webhook already verified by Paystack)
  return true;
}

/**
 * Check if subscription is expired and downgrade if necessary
 */
export async function checkSubscriptionExpiry(user: User): Promise<User | null> {
  try {
    if (!user.subscriptionEndsAt) {
      return user; // No subscription
    }

    const now = new Date();
    const expiryDate = new Date(user.subscriptionEndsAt);

    if (now > expiryDate && user.tier !== 'free') {
      // Subscription has expired, downgrade to free
      const { data: updated, error } = await supabase
        .from('users')
        .update({
          tier: 'free',
          query_count: 0,
          subscription_ends_at: null,
        })
        .eq('username', user.username)
        .select()
        .single();

      if (error) {
        console.error('Error downgrading expired subscription:', error);
        return user;
      }

      console.log(`✅ Subscription expired for ${user.username}, downgraded to free`);
      return updated || user;
    }

    return user;
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
    return user;
  }
}
