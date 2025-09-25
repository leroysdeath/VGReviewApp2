/**
 * Updated Privacy Dashboard Tests
 * Unit tests for Phase 3 Privacy Dashboard enhancements
 * Tests new Phase 3 tab and functionality while respecting API/DB limits
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock services to avoid API/DB calls during testing
const mockPrivacyService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  hasValidConsent: jest.fn(),
  getPrivacyMetrics: jest.fn()
};

const mockGdprService = {
  exportUserData: jest.fn(),
  deleteUserData: jest.fn(),
  getGdprMetrics: jest.fn()
};

const mockTrackingService = {
  getTrackingStats: jest.fn(),
  getSystemHealth: jest.fn()
};

// Mock all privacy services to prevent real API calls
jest.mock('../services/privacyService', () => ({
  privacyService: mockPrivacyService
}));

jest.mock('../services/gdprService', () => ({
  gdprService: mockGdprService
}));

jest.mock('../services/trackingService', () => ({
  trackingService: mockTrackingService
}));

// Mock auth to simulate admin access
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-user', databaseId: 1 },
    isAuthenticated: true
  })
}));

// Import after mocking to ensure mocks are applied
import { PrivacyDashboard } from '../components/admin/PrivacyDashboard';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Privacy Dashboard Phase 3 Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses to avoid API calls
    mockPrivacyService.getPrivacyMetrics.mockResolvedValue({
      totalUsers: 100,
      consentedUsers: 85,
      trackingLevels: { none: 15, anonymous: 50, full: 35 }
    });
    
    mockGdprService.getGdprMetrics.mockResolvedValue({
      exportRequests: 5,
      deletionRequests: 2,
      pendingRequests: 1
    });
    
    mockTrackingService.getSystemHealth.mockResolvedValue({
      privacyService: 'healthy',
      gdprService: 'healthy',
      trackingService: 'healthy'
    });
  });

  describe('Phase 3 Tab Navigation', () => {
    it('should render Phase 3 tab in navigation', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      // Should show the Phase 3 tab
      expect(screen.getByText(/Phase 3 Controls/i)).toBeInTheDocument();
    });

    it('should switch to Phase 3 tab when clicked', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        expect(screen.getByText(/Privacy Settings Implementation/i)).toBeInTheDocument();
      });
    });
  });

  describe('Phase 3 Status Cards', () => {
    it('should display implementation status cards', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      // Navigate to Phase 3 tab
      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should show all three implementation cards
        expect(screen.getByText(/Privacy Settings Page/i)).toBeInTheDocument();
        expect(screen.getByText(/GDPR Rights/i)).toBeInTheDocument();
        expect(screen.getByText(/Privacy Policy Page/i)).toBeInTheDocument();
      });
    });

    it('should show implementation status as deployed', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should show deployed status
        const statusElements = screen.getAllByText(/Deployed/i);
        expect(statusElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Privacy Metrics Display', () => {
    it('should load and display privacy metrics', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should call privacy service for metrics
        expect(mockPrivacyService.getPrivacyMetrics).toHaveBeenCalled();
      });
    });

    it('should display GDPR request metrics', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should call GDPR service for metrics
        expect(mockGdprService.getGdprMetrics).toHaveBeenCalled();
      });
    });

    it('should show system health status', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should call tracking service for health check
        expect(mockTrackingService.getSystemHealth).toHaveBeenCalled();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should render quick action buttons', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should show quick action buttons
        expect(screen.getByText(/Open Privacy Settings/i)).toBeInTheDocument();
        expect(screen.getByText(/View Privacy Policy/i)).toBeInTheDocument();
      });
    });

    it('should handle quick action clicks without navigation errors', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        const privacySettingsButton = screen.getByText(/Open Privacy Settings/i);
        
        // Should handle click without throwing errors
        expect(() => fireEvent.click(privacySettingsButton)).not.toThrow();
      });
    });
  });

  describe('Error Handling and Performance', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API failure
      mockPrivacyService.getPrivacyMetrics.mockRejectedValue(
        new Error('API Rate Limited')
      );

      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      // Should not crash on API error
      await waitFor(() => {
        expect(screen.getByText(/Phase 3 Controls/i)).toBeInTheDocument();
      });
    });

    it('should respect API limits by not making redundant calls', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      
      // Click multiple times rapidly
      fireEvent.click(phase3Tab);
      fireEvent.click(phase3Tab);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should only make one call per service despite multiple clicks
        expect(mockPrivacyService.getPrivacyMetrics).toHaveBeenCalledTimes(1);
        expect(mockGdprService.getGdprMetrics).toHaveBeenCalledTimes(1);
        expect(mockTrackingService.getSystemHealth).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading states to prevent multiple API calls', async () => {
      // Mock slow API response
      mockPrivacyService.getPrivacyMetrics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      // Should show loading state
      expect(screen.getByText(/Loading/i) || screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Database Limits Compliance', () => {
    it('should not trigger excessive database queries', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      // Navigate to Phase 3 tab
      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should make minimal API calls (one per service maximum)
        const totalCalls = 
          mockPrivacyService.getPrivacyMetrics.mock.calls.length +
          mockGdprService.getGdprMetrics.mock.calls.length +
          mockTrackingService.getSystemHealth.mock.calls.length;
        
        expect(totalCalls).toBeLessThanOrEqual(3); // One per service
      });
    });

    it('should cache results to prevent repeated database hits', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      
      // Switch away and back to Phase 3 tab
      const overviewTab = screen.getByText(/Overview/i);
      fireEvent.click(overviewTab);
      fireEvent.click(phase3Tab);

      // Switch again
      fireEvent.click(overviewTab);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should still only make initial calls, not repeat them
        expect(mockPrivacyService.getPrivacyMetrics).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      
      // Should be focusable
      phase3Tab.focus();
      expect(document.activeElement).toBe(phase3Tab);
    });

    it('should provide proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <PrivacyDashboard />
        </TestWrapper>
      );

      const phase3Tab = screen.getByText(/Phase 3 Controls/i);
      fireEvent.click(phase3Tab);

      await waitFor(() => {
        // Should have accessible button elements
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('aria-label');
        });
      });
    });
  });
});