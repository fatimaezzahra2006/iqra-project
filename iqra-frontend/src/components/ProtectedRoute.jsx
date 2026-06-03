import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const ProtectedRoute = ({ children, requireVerified = true }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span>Chargement...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Bloquer /dashboard et modules si email non vérifié
  if (requireVerified && !user?.is_email_verified) {
    return <Navigate to="/verify-email" state={{ email: user?.email }} replace />;
  }

  return children;
};

export default ProtectedRoute;
