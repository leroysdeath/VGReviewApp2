import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AuthPage } from './AuthPage';
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

// Mock useNavigate and useLocation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    state: { from: { pathname: '/protected' } }
  })
}));

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

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('renders auth page with welcome message', async () => {
    renderWithProviders(<AuthPage />);
    
    expect(screen.getByText(/welcome to gamevault/i)).toBeInTheDocument();
    expect(screen.getByText(/join our gaming community/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in \/ create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });

  it('shows login modal by default', async () => {
    renderWithProviders(<AuthPage />);
    
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('closes login modal when close button is clicked', async () => {
    renderWithProviders(<AuthPage />);
    
    // Initially modal is open
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    
    // Click close button
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    
    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText(/sign in to your account/i)).not.toBeInTheDocument();
    });
  });

  it('opens login modal when sign in button is clicked', async () => {
    renderWithProviders(<AuthPage />);
    
    // Close modal first
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText(/sign in to your account/i)).not.toBeInTheDocument();
    });
    
    // Click sign in button
    await userEvent.click(screen.getByRole('button', { name: /sign in \/ create account/i }));
    
    // Modal should be open again
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('has terms of service and privacy policy links', async () => {
    renderWithProviders(<AuthPage />);
    
    expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<AuthPage />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});