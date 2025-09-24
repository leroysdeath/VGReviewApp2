/**
 * Tests for PrivacyConsentBanner Component
 * Tests privacy consent UI and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PrivacyConsentBanner } from '../components/privacy/PrivacyConsentBanner';
import { privacyService } from '../services/privacyService';

// Mock dependencies
jest.mock('../services/privacyService', () => ({
  privacyService: {
    shouldShowConsentBanner: jest.fn(),
    syncConsentWithDatabase: jest.fn(),
    saveConsent: jest.fn(),
    markConsentBannerShown: jest.fn(),
    getUserCountry: jest.fn()
  }
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { databaseId: 123, email: 'test@example.com' }
  }))
}));

// Wrapper component for Router
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('PrivacyConsentBanner Component', () => {
  const mockPrivacyService = privacyService as jest.Mocked<typeof privacyService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    mockPrivacyService.saveConsent.mockResolvedValue(undefined);
    mockPrivacyService.getUserCountry.mockResolvedValue('US');
    mockPrivacyService.markConsentBannerShown.mockReturnValue(undefined);
    mockPrivacyService.syncConsentWithDatabase.mockResolvedValue(undefined);
  });

  describe('Visibility', () => {
    it('should show banner when shouldShowConsentBanner returns true', async () => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Your Privacy Matters')).toBeInTheDocument();
      });
    });

    it('should not show banner when shouldShowConsentBanner returns false', () => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(false);

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      expect(screen.queryByText('Your Privacy Matters')).not.toBeInTheDocument();
    });
  });

  describe('Basic UI Elements', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should display main privacy message', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Your Privacy Matters')).toBeInTheDocument();
        expect(screen.getByText(/We use minimal analytics to improve your experience/)).toBeInTheDocument();
      });
    });

    it('should display action buttons', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Accept All')).toBeInTheDocument();
        expect(screen.getByText('Accept Essential')).toBeInTheDocument();
        expect(screen.getByLabelText('Decline all')).toBeInTheDocument();
      });
    });

    it('should show Privacy Policy link', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const privacyLink = screen.getByText('Privacy Policy');
        expect(privacyLink).toBeInTheDocument();
        expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
      });
    });
  });

  describe('Accept All Functionality', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should save full consent when Accept All is clicked', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const acceptAllButton = screen.getByText('Accept All');
        fireEvent.click(acceptAllButton);
      });

      await waitFor(() => {
        expect(mockPrivacyService.saveConsent).toHaveBeenCalledWith(
          {
            analyticsOptedIn: true,
            trackingLevel: 'full',
            ipCountry: 'US'
          },
          123
        );
      });

      expect(mockPrivacyService.markConsentBannerShown).toHaveBeenCalled();
    });

    it('should show success message after Accept All', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const acceptAllButton = screen.getByText('Accept All');
        fireEvent.click(acceptAllButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Privacy preferences saved successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('Accept Essential Functionality', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should save anonymous consent when Accept Essential is clicked', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const acceptEssentialButton = screen.getByText('Accept Essential');
        fireEvent.click(acceptEssentialButton);
      });

      await waitFor(() => {
        expect(mockPrivacyService.saveConsent).toHaveBeenCalledWith(
          {
            analyticsOptedIn: true,
            trackingLevel: 'anonymous',
            ipCountry: 'US'
          },
          123
        );
      });
    });
  });

  describe('Decline Functionality', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should save no consent when decline button is clicked', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const declineButton = screen.getByLabelText('Decline all');
        fireEvent.click(declineButton);
      });

      await waitFor(() => {
        expect(mockPrivacyService.saveConsent).toHaveBeenCalledWith(
          {
            analyticsOptedIn: false,
            trackingLevel: 'none'
          },
          123
        );
      });
    });
  });

  describe('Customize Options', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should show customize options when clicked', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const customizeButton = screen.getByText('Customize');
        fireEvent.click(customizeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose your privacy level:')).toBeInTheDocument();
        expect(screen.getByText('No Tracking')).toBeInTheDocument();
        expect(screen.getByText('Anonymous Analytics')).toBeInTheDocument();
        expect(screen.getByText('Personalized Experience')).toBeInTheDocument();
      });
    });

    it('should allow selecting different tracking levels', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const customizeButton = screen.getByText('Customize');
        fireEvent.click(customizeButton);
      });

      await waitFor(() => {
        const noneRadio = screen.getByDisplayValue('none');
        fireEvent.click(noneRadio);
        expect(noneRadio).toBeChecked();
      });

      await waitFor(() => {
        const fullRadio = screen.getByDisplayValue('full');
        fireEvent.click(fullRadio);
        expect(fullRadio).toBeChecked();
      });
    });

    it('should save custom preferences', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const customizeButton = screen.getByText('Customize');
        fireEvent.click(customizeButton);
      });

      await waitFor(() => {
        const fullRadio = screen.getByDisplayValue('full');
        fireEvent.click(fullRadio);
      });

      await waitFor(() => {
        const saveButton = screen.getByText('Save Preferences');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockPrivacyService.saveConsent).toHaveBeenCalledWith(
          {
            analyticsOptedIn: true,
            trackingLevel: 'full',
            ipCountry: 'US'
          },
          123
        );
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should handle save consent errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPrivacyService.saveConsent.mockRejectedValue(new Error('Save failed'));

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const acceptAllButton = screen.getByText('Accept All');
        fireEvent.click(acceptAllButton);
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error saving consent:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle country detection errors gracefully', async () => {
      mockPrivacyService.getUserCountry.mockRejectedValue(new Error('Country detection failed'));

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const acceptAllButton = screen.getByText('Accept All');
        fireEvent.click(acceptAllButton);
      });

      // Should still save consent without country
      await waitFor(() => {
        expect(mockPrivacyService.saveConsent).toHaveBeenCalledWith(
          {
            analyticsOptedIn: true,
            trackingLevel: 'full',
            ipCountry: undefined
          },
          123
        );
      });
    });
  });

  describe('Information Display', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should display tracking information when expanded', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const customizeButton = screen.getByText('Customize');
        fireEvent.click(customizeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('What we track:')).toBeInTheDocument();
        expect(screen.getByText(/Game pages you view/)).toBeInTheDocument();
        expect(screen.getByText(/Source of navigation/)).toBeInTheDocument();
        expect(screen.getByText(/Session identifier/)).toBeInTheDocument();
        expect(screen.getByText(/Country/)).toBeInTheDocument();
      });
    });

    it('should show appropriate privacy level badges', async () => {
      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const customizeButton = screen.getByText('Customize');
        fireEvent.click(customizeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Most Private')).toBeInTheDocument();
        expect(screen.getByText('Recommended')).toBeInTheDocument();
        expect(screen.getByText('Full Features')).toBeInTheDocument();
      });
    });
  });

  describe('User Authentication', () => {
    it('should work with unauthenticated users', async () => {
      // Mock unauthenticated user
      jest.mocked(require('../hooks/useAuth').useAuth).mockReturnValue({
        user: null
      });

      render(
        <TestWrapper>
          <PrivacyConsentBanner />
        </TestWrapper>
      );

      await waitFor(() => {
        const acceptAllButton = screen.getByText('Accept All');
        fireEvent.click(acceptAllButton);
      });

      await waitFor(() => {
        expect(mockPrivacyService.saveConsent).toHaveBeenCalledWith(
          {
            analyticsOptedIn: true,
            trackingLevel: 'full',
            ipCountry: 'US'
          },
          undefined // No user ID for unauthenticated users
        );
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockPrivacyService.shouldShowConsentBanner.mockReturnValue(true);
    });

    it('should render without throwing on different screen sizes', () => {
      // Test rendering - actual responsive behavior would need more complex testing
      expect(() => {
        render(
          <TestWrapper>
            <PrivacyConsentBanner />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});