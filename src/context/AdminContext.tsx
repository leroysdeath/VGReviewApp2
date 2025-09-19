/**
 * Admin Authentication Context
 * Simple admin system for diagnostic tools
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  adminKey: string;
  login: (key: string) => boolean;
  logout: () => void;
  setAdminKey: (key: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Get admin keys from environment or use defaults
const getValidAdminKeys = () => {
  const envKeys = import.meta.env.VITE_ADMIN_KEYS;
  if (envKeys) {
    return envKeys.split(',').map((key: string) => key.trim());
  }
  
  // Default admin keys
  return [
    'vg-search-admin-2024',
    'debug',
    'diagnostic-tool',
    'tommy-admin',
    'search-diagnostic',
    'vg-admin'
  ];
};

const VALID_ADMIN_KEYS = getValidAdminKeys();

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  useEffect(() => {
    // Check for existing admin session
    const savedAuth = localStorage.getItem('adminAuth');
    if (savedAuth === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const login = (key: string): boolean => {
    if (VALID_ADMIN_KEYS.includes(key)) {
      setIsAdmin(true);
      setAdminKey(key);
      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminKey', key);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    setAdminKey('');
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminKey');
  };

  const value: AdminContextType = {
    isAdmin,
    adminKey,
    login,
    logout,
    setAdminKey
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// Admin guard component
interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  fallback = <div>Access denied</div> 
}) => {
  const { isAdmin } = useAdmin();
  
  return isAdmin ? <>{children}</> : <>{fallback}</>;
};

export default AdminProvider;