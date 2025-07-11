import React from 'react';
import { AuthProvider, useAuth } from './AuthProvider';

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="auth-state">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthProvider Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('provides initial authentication state', () => {
    cy.mount(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially loading
    cy.get('[data-testid="loading-state"]').should('contain', 'Loading');
    
    // After initialization, not authenticated
    cy.get('[data-testid="loading-state"]').should('contain', 'Not Loading');
    cy.get('[data-testid="auth-state"]').should('contain', 'Not Authenticated');
  });

  it('loads user from localStorage on mount', () => {
    // Set user in localStorage
    const mockUser = { id: '1', email: 'stored@example.com', username: 'storeduser' };
    localStorage.setItem('gameVaultUser', JSON.stringify(mockUser));
    
    cy.mount(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should load user from localStorage
    cy.get('[data-testid="auth-state"]').should('contain', 'Authenticated');
    cy.get('[data-testid="user-email"]').should('contain', 'stored@example.com');
  });

  it('handles login correctly', () => {
    cy.mount(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially not authenticated
    cy.get('[data-testid="auth-state"]').should('contain', 'Not Authenticated');
    
    // Perform login
    cy.contains('Login').click();
    
    // Should be authenticated after login
    cy.get('[data-testid="auth-state"]').should('contain', 'Authenticated');
    cy.get('[data-testid="user-email"]').should('contain', 'test@example.com');
    
    // Should store user in localStorage
    cy.window().then((win) => {
      const storedUser = JSON.parse(win.localStorage.getItem('gameVaultUser') || '{}');
      expect(storedUser.email).to.equal('test@example.com');
    });
  });

  it('handles logout correctly', () => {
    // Set user in localStorage
    const mockUser = { id: '1', email: 'stored@example.com', username: 'storeduser' };
    localStorage.setItem('gameVaultUser', JSON.stringify(mockUser));
    
    cy.mount(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially authenticated
    cy.get('[data-testid="auth-state"]').should('contain', 'Authenticated');
    
    // Perform logout
    cy.contains('Logout').click();
    
    // Should be not authenticated after logout
    cy.get('[data-testid="auth-state"]').should('contain', 'Not Authenticated');
    
    // Should remove user from localStorage
    cy.window().then((win) => {
      expect(win.localStorage.getItem('gameVaultUser')).to.be.null;
    });
  });
});