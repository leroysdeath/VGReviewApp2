/**
 * UserSettingsPanel Avatar Upload Integration Tests
 * Tests the complete avatar upload flow in the UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSettingsPanel } from '../UserSettingsPanel';
import { userService } from '../../../services/userService';
import { avatarModerationService } from '../../../services/avatarModerationService';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
jest.mock('../../../services/userService');
jest.mock('../../../services/avatarModerationService');
jest.mock('../../../hooks/useAuth');

// Mock NSFW.js to avoid loading the model in tests
jest.mock('nsfwjs', () => ({
  load: jest.fn().mockResolvedValue({
    classify: jest.fn()
  })
}));

describe('UserSettingsPanel - Avatar Upload', () => {
  const mockUser = {
    id: 123,
    username: 'testuser',
    bio: 'Test bio',
    avatar_url: null,
    email: 'test@example.com',
    email_verified: true,
    privacy_settings: {
      profile_visibility: 'public' as const,
      show_reviews: true,
      show_ratings: true,
      show_wishlist: false,
      show_currently_playing: true
    }
  };

  const mockOnUpdate = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123' }
    });

    // Mock successful user fetch
    (userService.getUserById as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser
    });

    // Mock successful update
    (userService.updateProfile as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser
    });
  });

  it('should show avatar upload input when email is verified', async () => {
    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Choose file/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/jpg,image/png,image/gif,image/webp');
  });

  it('should show email verification message when not verified', async () => {
    const unverifiedUser = { ...mockUser, email_verified: false };

    (userService.getUserById as jest.Mock).mockResolvedValue({
      success: true,
      data: unverifiedUser
    });

    render(
      <UserSettingsPanel
        user={unverifiedUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Email verification required/i)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText(/Choose file/i)).not.toBeInTheDocument();
  });

  it('should handle successful avatar upload', async () => {
    // Mock successful moderation
    (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
      approved: true,
      confidence: 0.95,
      stage: 'client',
      violations: [],
      message: 'Image approved.',
      cost: 0
    });

    // Mock successful upload
    (userService.uploadAvatar as jest.Mock).mockResolvedValue({
      success: true,
      data: { avatar_url: 'https://storage.example.com/avatar.jpg' }
    });

    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    // Select file
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, file);

    // Should show preview
    await waitFor(() => {
      expect(screen.getByText('avatar.jpg')).toBeInTheDocument();
    });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show checking message
    await waitFor(() => {
      expect(screen.getByText(/Checking avatar.../i)).toBeInTheDocument();
    });

    // Verify moderation was called
    await waitFor(() => {
      expect(avatarModerationService.moderateAvatar).toHaveBeenCalledWith(file, 123);
    });

    // Verify upload was called
    await waitFor(() => {
      expect(userService.uploadAvatar).toHaveBeenCalledWith(123, file);
    });

    // Verify success callback
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should handle moderation failure', async () => {
    // Mock failed moderation
    (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
      approved: false,
      confidence: 0.85,
      stage: 'client',
      violations: ['pornographic'],
      message: 'This image cannot be used as an avatar.',
      cost: 0
    });

    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    // Select file
    const file = new File(['test'], 'inappropriate.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, file);

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('This image cannot be used as an avatar.')).toBeInTheDocument();
    });

    // Should not call upload
    expect(userService.uploadAvatar).not.toHaveBeenCalled();

    // Should not call update callback
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should validate file size (max 5MB)', async () => {
    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    // Create large file (6MB)
    const largeFile = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      'large.jpg',
      { type: 'image/jpeg' }
    );

    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, largeFile);

    // Should show error immediately
    await waitFor(() => {
      expect(screen.getByText('File size must be less than 5MB')).toBeInTheDocument();
    });

    // Should not show preview
    expect(screen.queryByText('large.jpg')).not.toBeInTheDocument();
  });

  it('should validate file type', async () => {
    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    // Try invalid file type
    const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, invalidFile);

    // Should show error immediately
    await waitFor(() => {
      expect(screen.getByText('Please select a valid image file (JPG, PNG, GIF, or WebP)')).toBeInTheDocument();
    });

    // Should not show preview
    expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
  });

  it('should handle rate limiting errors', async () => {
    // Mock rate limit error
    (userService.uploadAvatar as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Upload limit reached. Try again in an hour.'
    });

    // Mock successful moderation (to get past that check)
    (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
      approved: true,
      confidence: 0.95,
      stage: 'client',
      violations: [],
      message: 'Image approved.',
      cost: 0
    });

    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    // Select file
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, file);

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show rate limit error
    await waitFor(() => {
      expect(screen.getByText('Upload limit reached. Try again in an hour.')).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should clear avatar error when new file is selected', async () => {
    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Avatar')).toBeInTheDocument();
    });

    // First upload with invalid file
    const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, invalidFile);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText('Please select a valid image file (JPG, PNG, GIF, or WebP)')).toBeInTheDocument();
    });

    // Upload valid file
    const validFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, validFile);

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Please select a valid image file')).not.toBeInTheDocument();
    });

    // Should show preview
    expect(screen.getByText('avatar.jpg')).toBeInTheDocument();
  });

  it('should preserve other form data when avatar upload fails', async () => {
    // Mock failed moderation
    (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
      approved: false,
      confidence: 0.85,
      stage: 'client',
      violations: ['pornographic'],
      message: 'This image cannot be used as an avatar.',
      cost: 0
    });

    render(
      <UserSettingsPanel
        user={mockUser}
        onUpdate={mockOnUpdate}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    // Change username
    const usernameInput = screen.getByLabelText('Username');
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, 'newusername');

    // Select file that will fail moderation
    const file = new File(['test'], 'inappropriate.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/Choose file/i);
    await userEvent.upload(fileInput, file);

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText('This image cannot be used as an avatar.')).toBeInTheDocument();
    });

    // Username change should be preserved
    expect(usernameInput).toHaveValue('newusername');

    // Should not update anything
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });
});

describe('UserSettingsPanel - Rate Limiting', () => {
  const mockUser = {
    id: 123,
    username: 'testuser',
    bio: 'Test bio',
    avatar_url: null,
    email: 'test@example.com',
    email_verified: true,
    privacy_settings: {
      profile_visibility: 'public' as const,
      show_reviews: true,
      show_ratings: true,
      show_wishlist: false,
      show_currently_playing: true
    }
  };

  const mockOnUpdate = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123' }
    });

    (userService.getUserById as jest.Mock).mockResolvedValue({
      success: true,
      data: mockUser
    });
  });

  const rateLimitScenarios = [
    {
      name: 'hourly limit (5 uploads)',
      error: 'Upload limit reached. Try again in an hour.',
      expectedMessage: 'Upload limit reached. Try again in an hour.'
    },
    {
      name: 'daily limit (10 uploads)',
      error: 'Daily upload limit reached. Try again tomorrow.',
      expectedMessage: 'Daily upload limit reached. Try again tomorrow.'
    },
    {
      name: 'failed attempts limit (5 failures)',
      error: 'Too many failed upload attempts. Try again tomorrow.',
      expectedMessage: 'Too many failed upload attempts. Try again tomorrow.'
    }
  ];

  it.each(rateLimitScenarios)(
    'should handle $name',
    async ({ error, expectedMessage }) => {
      // Mock rate limit error
      (userService.uploadAvatar as jest.Mock).mockResolvedValue({
        success: false,
        error: error
      });

      // Mock successful moderation (to test rate limit handling)
      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: true,
        confidence: 0.95,
        stage: 'client',
        violations: [],
        message: 'Image approved.',
        cost: 0
      });

      render(
        <UserSettingsPanel
          user={mockUser}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Avatar')).toBeInTheDocument();
      });

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByLabelText(/Choose file/i);
      await userEvent.upload(fileInput, file);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      });
    }
  );
});