import { supabase } from './supabaseClient';
import { User } from '../types';
import { PRICING_TIERS } from './paymentService';

export interface QueryQuota {
  current: number;
  limit: number;
  resetDate: Date;
  percentageUsed: number;
  canQuery: boolean;
}

export const aiQueryService = {
  /**
   * Get current query quota for a user
   */
  async getQueryQuota(user: User): Promise<QueryQuota | null> {
    try {
      const tierConfig = PRICING_TIERS[user.tier as keyof typeof PRICING_TIERS];
      if (!tierConfig) {
        return null;
      }

      const resetDate = new Date(user.queryResetTime);
      const now = new Date();
      
      // Check if we need to reset the counter
      let currentCount = user.queryCount;
      let currentResetTime = user.queryResetTime;

      if (now > new Date(resetDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        // 30 days have passed, reset counter
        currentCount = 0;
        currentResetTime = now.toISOString();
        
        // Update in database
        await supabase
          .from('users')
          .update({
            query_count: currentCount,
            query_reset_time: currentResetTime,
          })
          .eq('username', user.username);
      }

      const limit = tierConfig.aiQueriesPerMonth;
      const percentageUsed = (currentCount / limit) * 100;

      return {
        current: currentCount,
        limit,
        resetDate: new Date(currentResetTime),
        percentageUsed: Math.min(percentageUsed, 100),
        canQuery: currentCount < limit,
      };
    } catch (error) {
      console.error('Error getting query quota:', error);
      return null;
    }
  },

  /**
   * Increment query count for a user
   */
  async incrementQueryCount(username: string): Promise<boolean> {
    try {
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('query_count, query_reset_time, tier')
        .eq('username', username)
        .single();

      if (fetchError || !user) {
        console.error('User not found:', fetchError);
        return false;
      }

      // Check if reset is needed
      const resetDate = new Date(user.query_reset_time);
      const now = new Date();
      let newCount = user.query_count + 1;
      let newResetTime = user.query_reset_time;

      if (now > new Date(resetDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        // Reset counter
        newCount = 1;
        newResetTime = now.toISOString();
      }

      // Check if user has reached their limit
      const tierConfig = PRICING_TIERS[user.tier as keyof typeof PRICING_TIERS];
      if (newCount > tierConfig.aiQueriesPerMonth) {
        console.warn(`Query limit exceeded for user ${username}`);
        return false;
      }

      // Update count
      const { error: updateError } = await supabase
        .from('users')
        .update({
          query_count: newCount,
          query_reset_time: newResetTime,
        })
        .eq('username', username);

      if (updateError) {
        console.error('Error updating query count:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error incrementing query count:', error);
      return false;
    }
  },

  /**
   * Check if user can make a query
   */
  async canMakeQuery(user: User): Promise<boolean> {
    const quota = await this.getQueryQuota(user);
    return quota ? quota.canQuery : false;
  },

  /**
   * Get quota warning message
   */
  getQuotaWarning(quota: QueryQuota): string | null {
    if (quota.percentageUsed >= 90) {
      const remaining = quota.limit - quota.current;
      return `⚠️ You have ${remaining} AI queries remaining this month. Upgrade to Professional or Institutional tier for unlimited queries.`;
    }

    if (quota.percentageUsed >= 75) {
      const remaining = quota.limit - quota.current;
      return `📊 You've used ${quota.percentageUsed.toFixed(1)}% of your monthly queries (${remaining} remaining).`;
    }

    return null;
  },

  /**
   * Get quota status string
   */
  getQuotaStatus(quota: QueryQuota): string {
    if (!quota.canQuery) {
      return `⛔ Quota exhausted. Reset: ${quota.resetDate.toLocaleDateString()}`;
    }

    const remaining = quota.limit - quota.current;
    return `${remaining} / ${quota.limit} queries remaining`;
  },

  /**
   * Format quota bar percentage
   */
  getQuotaPercentage(quota: QueryQuota): string {
    return quota.percentageUsed.toFixed(1);
  },
};
