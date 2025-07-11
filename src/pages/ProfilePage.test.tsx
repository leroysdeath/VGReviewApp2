import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ProfilePage } from './ProfilePage';
import { AuthProvider } from '../components/AuthProvider';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Wrapper component for context providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
};

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('shows login prompt when user is not authenticated', async () => {
    renderWithProviders(<ProfilePage />);
    
    // Wait for auth state to be determined
    await waitFor(() => {
      expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/please sign in to view your profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows user dashboard when user is authenticated', async () => {
    // Set user in localStorage
    const mockUser = { 
      id: '1', 
      email: 'user@example.com', 
      username: 'testuser',
      avatarUrl: 'https://example.com/avatar.jpg'
    };
    mockLocalStorage.setItem('gameVaultUser', JSON.stringify(mockUser));
    
    renderWithProviders(<ProfilePage />);
    
    // Wait for auth state to be determined and dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    expect(screen.getByText(/favorite games/i)).toBeInTheDocument();
  });

  it('shows loading state while determining auth state', () => {
    renderWithProviders(<ProfilePage />);
    
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });

  it('opens login modal when sign in button is clicked', async () => {
    renderWithProviders(<ProfilePage />);
    
    // Wait for auth state to be determined
    await waitFor(() => {
      expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    });
    
    // Click sign in button
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check if login modal is opened
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('has no accessibility violations when not authenticated', async () => {
    const { container } = renderWithProviders(<ProfilePage />);
    
    // Wait for auth state to be determined
    await waitFor(() => {
      expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when authenticated', async () => {
    // Set user in localStorage
    const mockUser = { 
      id: '1', 
      email: 'user@example.com', 
      username: 'testuser',
      avatarUrl: 'https://example.com/avatar.jpg'
    };
    mockLocalStorage.setItem('gameVaultUser', JSON.stringify(mockUser));
    
    const { container } = renderWithProviders(<ProfilePage />);
    
    // Wait for auth state to be determined and dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/dashboard overview/i)).toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});