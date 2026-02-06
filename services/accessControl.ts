// services/accessControl.ts
import { User, TierFeatures } from '../types';

export const hasFeatureAccess = (user: User, feature: string): boolean => {
  if (!user) return false;
  return user.tier !== 'free';
};

// Enhanced hook that matches your component expectations
export const useTierAccess = (user: User | null) => {
  const tier = user?.tier || 'free';
  
  return {
    // Existing method
    hasAccess: (feature: string) => {
      if (!user) return false;
      return hasFeatureAccess(user, feature);
    },
    
    // New methods your components expect
    has: (feature: string) => {
      if (!user) return false;
      return hasFeatureAccess(user, feature);
    },
    
    isPaid: () => {
      return tier === 'paid' || tier === 'admin_free';
    },
    
    getTierName: () => {
      switch (tier) {
        case 'free': return 'Free';
        case 'paid': return 'Premium';
        case 'admin_free': return 'Admin';
        default: return 'Free';
      }
    },
    
    getUpgradeMessage: (feature: string) => {
      return `Upgrade to Premium to access ${feature} feature`;
    },
    
    // Keep tier property
    tier
  };
};

// Export the type
export type { TierFeatures };

// Define tierFeatures here (remove the duplicate export line)
export const tierFeatures: Record<string, TierFeatures> = {
  free: {
    aiTutor: true,
    unlimitedQueries: false,
    advancedAssessments: false,
    classManagement: false,
    customAssessments: false,
    adminDashboard: false,
    export: false,
    prioritySupport: false,
    maxStorage: 100,
    maxCourses: 3,
    maxStudents: 10,
    maxQueries: 50,
    resetHours: 24,
    unlimitedTopics: false
  },
  paid: {
    aiTutor: true,
    unlimitedQueries: true,
    advancedAssessments: true,
    classManagement: true,
    customAssessments: true,
    adminDashboard: true,
    export: true,
    prioritySupport: true,
    maxStorage: 1000,
    maxCourses: 50,
    maxStudents: 100,
    maxQueries: 1000,
    resetHours: 24,
    unlimitedTopics: true
  },
  admin_free: {
    aiTutor: true,
    unlimitedQueries: true,
    advancedAssessments: true,
    classManagement: true,
    customAssessments: true,
    adminDashboard: true,
    export: true,
    prioritySupport: true,
    maxStorage: 5000,
    maxCourses: 100,
    maxStudents: 500,
    maxQueries: 5000,
    resetHours: 24,
    unlimitedTopics: true
  }
};