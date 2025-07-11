import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { UserSettingsForm } from './UserSettingsForm';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockUser = {
  username: 'testuser',
  email: 'test@example.com',
  bio: 'Test bio for user settings',
  avatarUrl: 'https://example.com/avatar.jpg'
};

describe('UserSettingsForm', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with user data', () => {
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    expect(screen.getByDisplayValue(mockUser.username)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockUser.bio)).toBeInTheDocument();
    expect(screen.getByAltText(mockUser.username)).toHaveAttribute('src', mockUser.avatarUrl);
  });

  it('shows validation errors for invalid inputs', async () => {
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    // Clear username field
    await userEvent.clear(screen.getByLabelText(/username/i));
    
    // Enter invalid email
    await userEvent.clear(screen.getByLabelText(/email address/i));
    await userEvent.type(screen.getByLabelText(/email address/i), 'invalid-email');
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Check for validation errors
    expect(await screen.findByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it('shows password strength indicator', async () => {
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    // Enter current password (required)
    await userEvent.type(screen.getByLabelText(/current password/i), 'currentpass');
    
    // Enter weak new password
    await userEvent.type(screen.getByLabelText(/new password/i), 'weak');
    
    // Check for weak indicator
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
    
    // Enter strong password
    await userEvent.clear(screen.getByLabelText(/new password/i));
    await userEvent.type(screen.getByLabelText(/new password/i), 'StrongP@ssw0rd');
    
    // Check for strong indicator
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    // Enter current password
    await userEvent.type(screen.getByLabelText(/current password/i), 'currentpass');
    
    // Enter new password
    await userEvent.type(screen.getByLabelText(/new password/i), 'NewPassword123');
    
    // Enter different confirmation password
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'DifferentPassword');
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Check for password match error
    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    // Update username
    await userEvent.clear(screen.getByLabelText(/username/i));
    await userEvent.type(screen.getByLabelText(/username/i), 'newusername');
    
    // Enter current password (required)
    await userEvent.type(screen.getByLabelText(/current password/i), 'currentpass');
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Wait for form submission
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        username: 'newusername',
        email: mockUser.email,
        currentPassword: 'currentpass'
      }));
    });
  });

  it('shows success message after saving', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);
    
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    // Enter current password (required)
    await userEvent.type(screen.getByLabelText(/current password/i), 'currentpass');
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Check for success message
    expect(await screen.findByText(/settings saved successfully/i)).toBeInTheDocument();
  });

  it('shows error message when save fails', async () => {
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'));
    
    render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    // Enter current password (required)
    await userEvent.type(screen.getByLabelText(/current password/i), 'currentpass');
    
    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Check for error message
    expect(await screen.findByText(/failed to save settings/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<UserSettingsForm user={mockUser} onSave={mockOnSave} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});