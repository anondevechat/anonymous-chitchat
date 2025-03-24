import React from 'react';
import { Navigate } from "react-router-dom";
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

// Protected route component
const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  const { user, loading } = useFirebaseAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 border-4 border-t-primary border-r-primary border-b-primary/30 border-l-primary/30 rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? <>{element}</> : <Navigate to="/" />;
};

export default ProtectedRoute;
