import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { aiQueryService, QueryQuota } from '../services/aiQueryService';
import { useTierAccess } from '../services/accessControl';
import { SubscriptionManager } from './SubscriptionManager';
import { checkSubscriptionExpiry } from '../services/webhookService';

interface DashboardIntegrationProps {
  user: User;
}

/**
 * Example: Complete integration of subscription system in dashboard
 * This demonstrates how to use all subscription services together
 */
export const DashboardIntegration: React.FC<DashboardIntegrationProps> = ({ user: initialUser }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [quota, setQuota] = useState<QueryQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscription, setShowSubscription] = useState(false);
  
  const tier = useTierAccess(user);

  useEffect(() => {
    initializeDashboard();
  }, [user]);

  /**
   * Initialize dashboard by checking subscription status and loading quota
   */
  const initializeDashboard = async () => {
    setLoading(true);
    try {
      // Check if subscription has expired
      const updatedUser = await checkSubscriptionExpiry(user);
      if (updatedUser !== user) {
        setUser(updatedUser);
      }

      // Load query quota
      const q = await aiQueryService.getQueryQuota(user);
      setQuota(q);
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Example: Make an AI query with quota checking
   */
  const handleAIQuery = async (query: string) => {
    // Check if user has access to AI tutor
    if (!tier.has('aiTutor')) {
      alert(tier.getUpgradeMessage('aiTutor'));
      setShowSubscription(true);
      return;
    }

    // Check if user can make a query
    const canQuery = await aiQueryService.canMakeQuery(user);
    if (!canQuery) {
      alert('You have reached your monthly query limit. Upgrade to continue.');
      setShowSubscription(true);
      return;
    }

    try {
      // Make API call to AI service
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId: user.username,
        }),
      });

      if (!response.ok) throw new Error('Query failed');

      // Increment query count on success
      await aiQueryService.incrementQueryCount(user.username);

      // Refresh quota
      const q = await aiQueryService.getQueryQuota(user);
      setQuota(q);

      // Return response
      return await response.json();
    } catch (error) {
      console.error('Error making query:', error);
      throw error;
    }
  };

  /**
   * Example: Check feature access before rendering component
   */
  const handleExportData = async () => {
    if (!tier.has('export')) {
      alert(tier.getUpgradeMessage('export'));
      setShowSubscription(true);
      return;
    }

    // User has access to export feature
    try {
      const response = await fetch(`/api/export/${user.username}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  /**
   * Example: Check class management access
   */
  const handleCreateClass = async (className: string) => {
    if (!tier.has('classManagement')) {
      alert(tier.getUpgradeMessage('classManagement'));
      setShowSubscription(true);
      return;
    }

    // Create class
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: className,
          userId: user.username,
        }),
      });

      if (!response.ok) throw new Error('Create class failed');

      return await response.json();
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  /**
   * Handle successful upgrade
   */
  const handleUpgradeComplete = async () => {
    setShowSubscription(false);
    // Refresh user data from server
    initializeDashboard();
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-integration">
      {/* User Tier Banner */}
      <div className="tier-banner">
        <div className="tier-info">
          <h2>Plan: {tier.getTierName()}</h2>
          {tier.isPaid() && (
            <p>Your subscription keeps your learning experience unlimited</p>
          )}
          {!tier.isPaid() && (
            <p>
              Upgrade to Professional or Institutional for more features and unlimited AI queries
            </p>
          )}
        </div>
        <button
          className="btn-manage-subscription"
          onClick={() => setShowSubscription(!showSubscription)}
        >
          {showSubscription ? 'Hide' : 'Manage'} Subscription
        </button>
      </div>

      {/* Subscription Manager (when shown) */}
      {showSubscription && (
        <SubscriptionManager user={user} onUpgradeComplete={handleUpgradeComplete} />
      )}

      {/* Query Quota Display */}
      {quota && tier.has('aiTutor') && (
        <div className="quota-card">
          <h3>AI Tutor Quota</h3>
          <div className="quota-display">
            <div className="quota-stats">
              <div className="stat">
                <span className="label">Queries Used</span>
                <span className="value">{quota.current} / {quota.limit}</span>
              </div>
              <div className="stat">
                <span className="label">Usage</span>
                <span className="value">{aiQueryService.getQuotaPercentage(quota)}%</span>
              </div>
              <div className="stat">
                <span className="label">Reset Date</span>
                <span className="value">
                  {quota.resetDate.toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="quota-bar">
              <div
                className="quota-fill"
                style={{ width: `${quota.percentageUsed}%` }}
              ></div>
            </div>

            {aiQueryService.getQuotaWarning(quota) && (
              <div className="quota-warning">
                {aiQueryService.getQuotaWarning(quota)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Examples */}
      <div className="features-section">
        <h3>Available Features</h3>

        {/* AI Tutor Feature */}
        <div className="feature-example">
          <h4>🤖 AI Tutor</h4>
          <p>Ask AI-powered questions and get instant answers</p>
          <button
            className={`btn-feature ${!tier.has('aiTutor') ? 'disabled' : ''}`}
            onClick={() => handleAIQuery('How do I solve quadratic equations?')}
            disabled={!tier.has('aiTutor')}
          >
            {tier.has('aiTutor') ? 'Ask AI Tutor' : 'Upgrade to Use'}
          </button>
        </div>

        {/* Export Feature */}
        <div className="feature-example">
          <h4>📊 Export Data</h4>
          <p>Download your course data and progress</p>
          <button
            className={`btn-feature ${!tier.has('export') ? 'disabled' : ''}`}
            onClick={handleExportData}
            disabled={!tier.has('export')}
          >
            {tier.has('export') ? 'Export Data' : 'Upgrade to Use'}
          </button>
          {!tier.has('export') && (
            <p className="upgrade-hint">{tier.getUpgradeMessage('export')}</p>
          )}
        </div>

        {/* Class Management Feature */}
        <div className="feature-example">
          <h4>👥 Class Management</h4>
          <p>Create and manage student classes</p>
          <button
            className={`btn-feature ${!tier.has('classManagement') ? 'disabled' : ''}`}
            onClick={() => handleCreateClass('Chemistry 101')}
            disabled={!tier.has('classManagement')}
          >
            {tier.has('classManagement') ? 'Create Class' : 'Upgrade to Use'}
          </button>
          {!tier.has('classManagement') && (
            <p className="upgrade-hint">{tier.getUpgradeMessage('classManagement')}</p>
          )}
        </div>

        {/* Admin Dashboard Feature */}
        {user.role === 'teacher' && (
          <div className="feature-example">
            <h4>📈 Admin Dashboard</h4>
            <p>Access advanced analytics and reporting</p>
            <button
              className={`btn-feature ${!tier.has('adminDashboard') ? 'disabled' : ''}`}
              disabled={!tier.has('adminDashboard')}
            >
              {tier.has('adminDashboard') ? 'Open Dashboard' : 'Upgrade to Use'}
            </button>
            {!tier.has('adminDashboard') && (
              <p className="upgrade-hint">{tier.getUpgradeMessage('adminDashboard')}</p>
            )}
          </div>
        )}
      </div>

      {/* Tier Comparison */}
      <div className="tier-comparison">
        <h3>Why Upgrade?</h3>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free</th>
              <th>Professional</th>
              <th>Institutional</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>AI Queries</td>
              <td>5/month</td>
              <td>Unlimited</td>
              <td>Unlimited</td>
            </tr>
            <tr>
              <td>Storage</td>
              <td>1GB</td>
              <td>50GB</td>
              <td>500GB</td>
            </tr>
            <tr>
              <td>Class Management</td>
              <td>❌</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Export Data</td>
              <td>❌</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Priority Support</td>
              <td>❌</td>
              <td>✅</td>
              <td>✅</td>
            </tr>
            <tr>
              <td>Admin Dashboard</td>
              <td>❌</td>
              <td>❌</td>
              <td>✅</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardIntegration;
