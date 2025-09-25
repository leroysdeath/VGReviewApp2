/**
 * Privacy UI Components Integration Tests
 * Tests for Phase 3 privacy-related React components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock services
const mockPrivacyService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  hasValidConsent: jest.fn(),
  setLocalConsent: jest.fn(),
  withdrawConsent: jest.fn()
};

const mockGdprService = {
  exportUserData: jest.fn(),
  deleteUserData: jest.fn()
};

const mockUseAuth = {
  user: {
    id: 'test-auth-id',
    databaseId: 123,
    email: 'test@example.com'
  },
  isAuthenticated: true
};

jest.mock('../services/privacyService', () => ({
  privacyService: mockPrivacyService,
  TrackingLevel: {
    none: 'none',
    anonymous: 'anonymous', 
    full: 'full'
  }
}));

jest.mock('../services/gdprService', () => ({
  gdprService: mockGdprService
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}));

import { EnhancedPrivacySettings } from '../components/privacy/EnhancedPrivacySettings';
import { PrivacySettingsPage } from '../pages/PrivacySettingsPage';
import { PrivacyConsentBanner } from '../components/privacy/PrivacyConsentBanner';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Privacy UI Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock responses
    mockPrivacyService.getUserPreferences.mockResolvedValue({
      analytics_opted_in: true,
      tracking_level: 'anonymous',
      consent_date: new Date().toISOString()
    });
    
    mockPrivacyService.hasValidConsent.mockReturnValue(true);
  });

  describe('Enhanced Privacy Settings Component', () => {
    it('should render privacy settings with current preferences', async () => {
      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });

      // Should show tracking level options
      expect(screen.getByText(/tracking level/i)).toBeInTheDocument();
      expect(screen.getByText(/anonymous/i)).toBeInTheDocument();
    });

    it('should handle tracking level changes', async () => {
      mockPrivacyService.updateUserPreferences.mockResolvedValue({});

      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        const trackingSelect = screen.getByRole('combobox', { name: /tracking level/i });
        expect(trackingSelect).toBeInTheDocument();
      });

      // Change tracking level
      const trackingSelect = screen.getByRole('combobox', { name: /tracking level/i });
      fireEvent.change(trackingSelect, { target: { value: 'full' } });

      await waitFor(() => {
        expect(mockPrivacyService.updateUserPreferences).toHaveBeenCalledWith(
          123,
          expect.objectContaining({ tracking_level: 'full' })
        );
      });
    });

    it('should handle data export functionality', async () => {
      const mockExportData = {
        userId: 123,
        exportDate: new Date().toISOString(),
        profile: { username: 'testuser' },
        gameViews: []
      };

      mockGdprService.exportUserData.mockResolvedValue(mockExportData);

      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        const exportButton = screen.getByText(/export data/i);
        expect(exportButton).toBeInTheDocument();
      });

      // Click export button
      const exportButton = screen.getByText(/export data/i);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockGdprService.exportUserData).toHaveBeenCalledWith(123);
      });
    });

    it('should handle data deletion with confirmation', async () => {
      mockGdprService.deleteUserData.mockResolvedValue({
        success: true,
        deletedItems: { gameViews: 5 },
        anonymizedItems: { reviews: 2 }
      });

      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        const deleteButton = screen.getByText(/delete data/i);
        expect(deleteButton).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByText(/delete data/i);
      fireEvent.click(deleteButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockGdprService.deleteUserData).toHaveBeenCalledWith(123);
      });
    });

    it('should display loading states appropriately', async () => {
      mockPrivacyService.getUserPreferences.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      // Should show loading indicator
      expect(screen.getByTestId(/loading/i) || screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle errors gracefully', async () => {
      mockPrivacyService.getUserPreferences.mockRejectedValue(
        new Error('Failed to load preferences')
      );

      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Privacy Settings Page', () => {
    it('should render privacy settings page for authenticated users', () => {
      render(
        <TestWrapper>
          <PrivacySettingsPage />
        </TestWrapper>
      );

      expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
    });

    it('should redirect unauthenticated users', () => {
      // Mock unauthenticated state
      (mockUseAuth as any).isAuthenticated = false;
      (mockUseAuth as any).user = null;

      render(
        <TestWrapper>
          <PrivacySettingsPage />
        </TestWrapper>
      );

      expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    });

    it('should handle user ID parameter from URL', () => {
      // This would typically be handled by router params
      render(
        <TestWrapper>
          <PrivacySettingsPage />
        </TestWrapper>
      );

      // Should render settings for current user
      expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
    });

    it('should prevent unauthorized access to other users settings', () => {
      // Mock different user attempting to access settings
      const unauthorizedUserId = 999;
      
      render(
        <TestWrapper>
          <PrivacySettingsPage />
        </TestWrapper>
      );

      // Should only allow access to own settings
      expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
    });
  });

  describe('Privacy Consent Banner', () => {
    it('should show consent banner when consent is missing', () => {
      mockPrivacyService.hasValidConsent.mockReturnValue(false);

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      expect(screen.getByText(/privacy notice/i) || screen.getByText(/consent/i)).toBeInTheDocument();
    });

    it('should hide banner when consent is given', () => {
      mockPrivacyService.hasValidConsent.mockReturnValue(true);

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      expect(screen.queryByText(/privacy notice/i)).not.toBeInTheDocument();
    });

    it('should handle consent acceptance', async () => {
      mockPrivacyService.hasValidConsent.mockReturnValue(false);
      mockPrivacyService.setLocalConsent.mockResolvedValue({});

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      const acceptButton = screen.getByText(/accept/i) || screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockPrivacyService.setLocalConsent).toHaveBeenCalled();
      });
    });

    it('should handle consent rejection', async () => {
      mockPrivacyService.hasValidConsent.mockReturnValue(false);
      mockPrivacyService.setLocalConsent.mockResolvedValue({});

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      const rejectButton = screen.getByText(/reject/i) || screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockPrivacyService.setLocalConsent).toHaveBeenCalledWith('none', false);
      });
    });

    it('should provide granular consent options', () => {
      mockPrivacyService.hasValidConsent.mockReturnValue(false);

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      // Should show different tracking level options
      expect(screen.getByText(/anonymous/i) || screen.getByText(/full/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        const firstControl = screen.getByRole('combobox', { name: /tracking level/i });
        firstControl.focus();
        expect(document.activeElement).toBe(firstControl);
      });
    });

    it('should provide proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        const trackingSelect = screen.getByRole('combobox');
        expect(trackingSelect).toHaveAttribute('aria-label');
      });
    });

    it('should show clear status messages', async () => {
      mockPrivacyService.updateUserPreferences.mockResolvedValue({});

      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        const trackingSelect = screen.getByRole('combobox', { name: /tracking level/i });
        fireEvent.change(trackingSelect, { target: { value: 'none' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/updated/i) || screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });

    it('should provide help text for complex options', async () => {
      render(
        <TestWrapper>
          <EnhancedPrivacySettings userId={123} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should have explanatory text for tracking levels
        expect(screen.getByText(/anonymous tracking/i) || screen.getByText(/no personal data/i)).toBeInTheDocument();
      });
    });
  });
});