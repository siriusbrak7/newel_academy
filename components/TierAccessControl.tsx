// components/TierAccessControl.tsx
import React from 'react';
import { TierFeatures } from '../types'; // Import from types instead
import { hasFeatureAccess } from '../services/accessControl';
import { User } from '../types';

interface TierAccessControlProps {
  user: User;
  children: React.ReactNode;
  feature: keyof TierFeatures;
  fallback?: React.ReactNode;
}

const TierAccessControl: React.FC<TierAccessControlProps> = ({
  user,
  children,
  feature,
  fallback = null
}) => {
  const hasAccess = hasFeatureAccess(user, feature as string);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

export default TierAccessControl;