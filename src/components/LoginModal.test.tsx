import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginModal } from './LoginModal';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('LoginModal', () => {
  const mockOnClose = jest.fn();
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to signup form when "Sign up" is clicked', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    await userEvent.click(screen.getByText('Sign up'));
    
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates login form inputs', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    // Submit with empty fields
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for validation errors
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
  });

  it('validates signup form inputs', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    // Switch to signup
    await userEvent.click(screen.getByText('Sign up'));
    
    // Submit with empty fields
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check for validation errors
    expect(await screen.findByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows password strength indicator on signup', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    // Switch to signup
    await userEvent.click(screen.getByText('Sign up'));
    
    // Type a weak password
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    
    // Check for strength indicator
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
    
    // Type a stronger password
    await userEvent.clear(screen.getByLabelText(/password/i));
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    
    // Check for updated strength indicator
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click the eye icon to show password
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    await userEvent.click(toggleButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('calls onClose when close button is clicked', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onLoginSuccess after successful login', async () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    
    // Fill in login form
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for the mock login to complete
    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<LoginModal isOpen={true} onClose={mockOnClose} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('is not rendered when isOpen is false', () => {
    render(<LoginModal isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument();
  });
});