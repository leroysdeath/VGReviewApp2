import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider } from '../context/AuthModalContext';

// Wrapper component that provides all necessary context for testing
export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthModalProvider>
        {children}
      </AuthModalProvider>
    </BrowserRouter>
  );
};

// Custom render function that includes providers
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return {
    ...options,
    wrapper: AllTheProviders,
  };
};