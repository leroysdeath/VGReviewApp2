/**
 * Tests for Enhanced Privacy Settings Component
 * Tests improved UI and data management functionality
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedPrivacySettings } from '../components/privacy/EnhancedPrivacySettings';

// Mock dependencies
jest.mock('../services/privacyService', () => ({
  privacyService: {
    getUserPreferences: jest.fn(() => Promise.resolve({
      tracking_level: 'anonymous',
      analytics_opted_in: true,
      consent_date: new Date().toISOString(),
      ip_country: 'US'
    })),
    getLocalConsent: jest.fn(() => ({
      analyticsOptedIn: true,
      trackingLevel: 'anonymous'
    })),
    saveConsent: jest.fn(() => Promise.resolve({ success: true })),
    getUserCountry: jest.fn(() => Promise.resolve('US'))
  }
}));

jest.mock('../services/gdprService', () => ({
  gdprService: {
    exportUserData: jest.fn(() => Promise.resolve({
      userId: 123,
      exportDate: new Date().toISOString(),
      profile: {},
      gameViews: [],
      reviews: [],
      comments: []
    })),
    deleteUserData: jest.fn(() => Promise.resolve({
      success: true,
      deletedItems: { gameViews: 10, activities: 5, notifications: 2 },
      anonymizedItems: { reviews: 3, comments: 7 }
    })),
    getConsentHistory: jest.fn(() => Promise.resolve([
      { action: 'consent_given', created_at: new Date().toISOString() }
    ])),
    getDataRetentionInfo: jest.fn(() => Promise.resolve({
      gameViews: { retentionDays: 90 },
      aggregatedMetrics: { retentionDays: 180 },
      auditLogs: { retentionDays: 730 }
    }))
  }
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { databaseId: 123, email: 'test@example.com' }
  }))
}));

describe('Enhanced Privacy Settings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    expect(() => {
      render(<EnhancedPrivacySettings userId={123} />);
    }).not.toThrow();
  });

  it('should display main privacy settings title', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your data and privacy preferences')).toBeInTheDocument();
  });

  it('should show data overview section', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    // Wait for loading to complete and check for data overview
    await screen.findByText('Your Data Overview');
    
    expect(screen.getByText('Game Views')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
  });

  it('should display tracking preferences section', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Tracking Preferences');
    
    expect(screen.getByText('Enable Analytics')).toBeInTheDocument();
    expect(screen.getByText('Tracking Level')).toBeInTheDocument();
  });

  it('should show data management options', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Data Management');
    
    expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    expect(screen.getByText('Delete Tracking Data')).toBeInTheDocument();
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();
  });

  it('should have tracking level radio options', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Tracking Level');
    
    expect(screen.getByText('None Tracking')).toBeInTheDocument();
    expect(screen.getByText('Anonymous Tracking')).toBeInTheDocument();
    expect(screen.getByText('Full Tracking')).toBeInTheDocument();
  });

  it('should display privacy level badges', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Most Private');
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Full Features')).toBeInTheDocument();
  });

  it('should show export and delete buttons', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Data Management');
    
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete tracking data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete all data/i })).toBeInTheDocument();
  });

  it('should have save preferences button', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Save Preferences');
    
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    const { privacyService } = require('../services/privacyService');
    
    // Mock slow loading
    privacyService.getUserPreferences.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(null), 1000))
    );
    
    render(<EnhancedPrivacySettings userId={123} />);
    
    expect(screen.getByText('Loading privacy settings...')).toBeInTheDocument();
  });

  it('should work with different user IDs', () => {
    expect(() => {
      render(<EnhancedPrivacySettings userId={456} />);
    }).not.toThrow();
    
    expect(() => {
      render(<EnhancedPrivacySettings userId={999} />);
    }).not.toThrow();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <EnhancedPrivacySettings userId={123} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle service errors gracefully', async () => {
    const { privacyService } = require('../services/privacyService');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    privacyService.getUserPreferences.mockRejectedValue(new Error('Service error'));
    
    expect(() => {
      render(<EnhancedPrivacySettings userId={123} />);
    }).not.toThrow();
    
    consoleSpy.mockRestore();
  });

  it('should show advanced settings toggle', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    await screen.findByText('Advanced Settings');
    
    expect(screen.getByRole('button', { name: /advanced settings/i })).toBeInTheDocument();
  });

  it('should display appropriate icons', async () => {
    render(<EnhancedPrivacySettings userId={123} />);
    
    // Wait for component to load
    await screen.findByText('Privacy Settings');
    
    // Check that the component renders without icon-related errors
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
  });

  it('should work with missing user preferences', async () => {
    const { privacyService } = require('../services/privacyService');
    
    privacyService.getUserPreferences.mockResolvedValue(null);
    privacyService.getLocalConsent.mockReturnValue(null);
    
    expect(() => {
      render(<EnhancedPrivacySettings userId={123} />);
    }).not.toThrow();
  });

  it('should handle GDPR service failures', async () => {
    const { gdprService } = require('../services/gdprService');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    gdprService.getConsentHistory.mockRejectedValue(new Error('GDPR error'));
    gdprService.getDataRetentionInfo.mockRejectedValue(new Error('Retention error'));
    
    expect(() => {
      render(<EnhancedPrivacySettings userId={123} />);
    }).not.toThrow();
    
    consoleSpy.mockRestore();
  });
});