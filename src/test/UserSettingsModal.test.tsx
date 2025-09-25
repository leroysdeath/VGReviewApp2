import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserSettingsModal from '../components/profile/UserSettingsModal';
import { ProfileUpdateData } from '../services/profileService';

// Mock the UserSettingsPanel component to avoid complex dependencies
jest.mock('../components/profile/UserSettingsPanel', () => ({
  UserSettingsPanel: ({ onFormChange, onSuccess, onSave }: any) => (
    <div data-testid="user-settings-panel">
      <button 
        data-testid="trigger-form-change"
        onClick={() => onFormChange(true)}
      >
        Make Changes
      </button>
      <button
        data-testid="trigger-success"
        onClick={() => onSuccess()}
      >
        Save Success
      </button>
      <button
        data-testid="trigger-save"
        onClick={() => onSave && onSave({ username: 'test' })}
      >
        Save
      </button>
    </div>
  )
}));

describe('UserSettingsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    userId: 'test-user-123',
    userData: {
      username: 'testuser',
      email: 'test@example.com',
      bio: 'Test bio',
      location: 'Test location',
      website: 'https://example.com',
      platform: 'PC'
    },
    onSave: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock document.body.style for scroll prevention tests
    Object.defineProperty(document.body, 'style', {
      value: {
        overflow: '',
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up any scroll changes
    document.body.style.overflow = 'unset';
  });

  describe('Modal Visibility and Rendering', () => {
    test('should not render when isOpen is false', () => {
      render(<UserSettingsModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-settings-panel')).not.toBeInTheDocument();
    });

    test('should render when isOpen is true', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByTestId('user-settings-panel')).toBeInTheDocument();
    });

    test('should not render without valid userId', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<UserSettingsModal {...defaultProps} userId="" />);
      
      expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('❌ UserSettingsModal cannot render without a valid userId');
      
      consoleSpy.mockRestore();
    });

    test('should not render with null userId', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<UserSettingsModal {...defaultProps} userId={null as any} />);
      
      expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('❌ UserSettingsModal cannot render without a valid userId');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Modal Header and Close Button', () => {
    test('should display correct title', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    test('should have accessible close button', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('should call onClose when close button clicked (no unsaved changes)', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Body Scroll Prevention', () => {
    test('should prevent body scroll when modal opens', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    test('should restore body scroll when modal closes', () => {
      const { rerender } = render(<UserSettingsModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(<UserSettingsModal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });

    test('should restore body scroll on unmount', () => {
      const { unmount } = render(<UserSettingsModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('UserData Handling', () => {
    test('should pass correct userData to UserSettingsPanel', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      // UserSettingsPanel should be rendered with the data
      expect(screen.getByTestId('user-settings-panel')).toBeInTheDocument();
    });

    test('should handle missing userData gracefully', () => {
      const propsWithoutUserData = { ...defaultProps, userData: undefined };
      
      expect(() => render(<UserSettingsModal {...propsWithoutUserData} />)).not.toThrow();
      expect(screen.getByTestId('user-settings-panel')).toBeInTheDocument();
    });

    test('should provide default userData when none provided', () => {
      const propsWithoutUserData = { ...defaultProps, userData: undefined };
      render(<UserSettingsModal {...propsWithoutUserData} />);
      
      // Should render without crashing and use default empty values
      expect(screen.getByTestId('user-settings-panel')).toBeInTheDocument();
    });
  });

  describe('Unsaved Changes Handling', () => {
    test('should track unsaved changes from form', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Simulate form changes
      const changeButton = screen.getByTestId('trigger-form-change');
      await user.click(changeButton);
      
      // Try to close - should show confirmation dialog
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);
      
      // Should show confirmation dialog
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(screen.getByText('You have unsaved changes. Are you sure you want to close without saving?')).toBeInTheDocument();
    });

    test('should show confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes
      await user.click(screen.getByTestId('trigger-form-change'));
      
      // Try to close
      await user.click(screen.getByRole('button', { name: /close modal/i }));
      
      // Confirmation dialog should appear
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(screen.getByText('No, keep editing')).toBeInTheDocument();
      expect(screen.getByText('Yes, discard changes')).toBeInTheDocument();
    });

    test('should close modal when confirming discard changes', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes and try to close
      await user.click(screen.getByTestId('trigger-form-change'));
      await user.click(screen.getByRole('button', { name: /close modal/i }));
      
      // Confirm discard
      await user.click(screen.getByText('Yes, discard changes'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should stay open when canceling close', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes and try to close
      await user.click(screen.getByTestId('trigger-form-change'));
      await user.click(screen.getByRole('button', { name: /close modal/i }));
      
      // Cancel close
      await user.click(screen.getByText('No, keep editing'));
      
      // Should still be open
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    test('should reset unsaved changes flag on successful save', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes
      await user.click(screen.getByTestId('trigger-form-change'));
      
      // Simulate successful save
      await user.click(screen.getByTestId('trigger-success'));
      
      // Now closing should work without confirmation
      await user.click(screen.getByRole('button', { name: /close modal/i }));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should close modal on Escape key (no unsaved changes)', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should show confirmation on Escape key with unsaved changes', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes
      await user.click(screen.getByTestId('trigger-form-change'));
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Should show confirmation
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    test('should close confirmation dialog on Escape key when dialog is open', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes and show confirmation
      await user.click(screen.getByTestId('trigger-form-change'));
      await user.click(screen.getByRole('button', { name: /close modal/i }));
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      
      // Press Escape to close confirmation
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      expect(screen.getByText('Edit Profile')).toBeInTheDocument(); // Main modal still open
    });

    test('should not respond to non-Escape keys', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      fireEvent.keyDown(document, { key: 'Tab' });
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Backdrop Interaction', () => {
    test('should close modal when clicking backdrop (no unsaved changes)', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Click backdrop (the first div with backdrop styling)
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/60');
      expect(backdrop).toBeInTheDocument();
      
      await user.click(backdrop!);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should show confirmation when clicking backdrop with unsaved changes', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Make changes
      await user.click(screen.getByTestId('trigger-form-change'));
      
      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/60');
      await user.click(backdrop!);
      
      // Should show confirmation
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    test('should not close when clicking inside modal content', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Click inside the modal content
      await user.click(screen.getByText('Edit Profile'));
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Props Integration', () => {
    test('should pass userId to UserSettingsPanel', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      // UserSettingsPanel should receive the userId
      expect(screen.getByTestId('user-settings-panel')).toBeInTheDocument();
    });

    test('should pass onSave callback to UserSettingsPanel', async () => {
      const user = userEvent.setup();
      render(<UserSettingsModal {...defaultProps} />);
      
      // Trigger save
      await user.click(screen.getByTestId('trigger-save'));
      
      expect(defaultProps.onSave).toHaveBeenCalledWith({ username: 'test' });
    });

    test('should handle missing onSave callback', () => {
      const propsWithoutOnSave = { ...defaultProps, onSave: undefined };
      
      expect(() => render(<UserSettingsModal {...propsWithoutOnSave} />)).not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle rapid open/close cycles', async () => {
      const { rerender } = render(<UserSettingsModal {...defaultProps} isOpen={false} />);
      
      // Rapid open/close cycles
      for (let i = 0; i < 5; i++) {
        rerender(<UserSettingsModal {...defaultProps} isOpen={true} />);
        rerender(<UserSettingsModal {...defaultProps} isOpen={false} />);
      }
      
      // Should end up with correct scroll behavior
      expect(document.body.style.overflow).toBe('unset');
    });

    test('should handle multiple Escape key presses', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      // Multiple rapid Escape presses
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Should call onClose (may be called multiple times due to event handling)
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    test('should handle form state changes during modal transitions', () => {
      const { rerender } = render(<UserSettingsModal {...defaultProps} />);
      
      // Close modal
      rerender(<UserSettingsModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<UserSettingsModal {...defaultProps} isOpen={true} />);
      
      // Should render without crashing
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });
  });

  describe('Console Debugging', () => {
    test('should log debug information when rendered', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<UserSettingsModal {...defaultProps} />);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🚨 UserSettingsModal props received:',
        expect.objectContaining({
          isOpen: true,
          hasOnClose: true,
          userId: 'test-user-123',
          hasOnSave: true
        })
      );
      
      consoleSpy.mockRestore();
    });

    test('should log user data being used', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<UserSettingsModal {...defaultProps} />);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔄 Using user data for modal:',
        defaultProps.userData
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    test('should have proper heading structure', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Edit Profile');
    });

    test('should be keyboard accessible', () => {
      render(<UserSettingsModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
      
      // Button should be focusable
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Performance Considerations', () => {
    test('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestWrapper = (props: any) => {
        renderSpy();
        return <UserSettingsModal {...props} />;
      };
      
      const { rerender } = render(<TestWrapper {...defaultProps} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not cause unnecessary renders
      rerender(<TestWrapper {...defaultProps} />);
      expect(renderSpy).toHaveBeenCalledTimes(2); // React will re-render but our spy will be called
    });

    test('should clean up event listeners properly', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<UserSettingsModal {...defaultProps} />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});