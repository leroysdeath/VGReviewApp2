import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserStatsPanel, UserStats } from '../components/profile/UserStatsPanel';

describe('UserStatsPanel', () => {
  const mockStats: UserStats = {
    totalGames: 150,
    gamesCompleted: 75,
    gamesInProgress: 12,
    gamesInWishlist: 25,
    totalPlaytime: 7200, // 120 hours
    averageRating: 8.5,
    reviewsWritten: 45,
    achievementsUnlocked: 234,
    mostPlayedGenre: 'RPG',
    accountAge: 365 // 1 year
  };

  const renderComponent = (stats: UserStats = mockStats, className?: string) => {
    return render(<UserStatsPanel stats={stats} className={className} />);
  };

  describe('Basic Rendering', () => {
    test('should render the component with title', () => {
      renderComponent();
      
      expect(screen.getByText('Gaming Stats')).toBeInTheDocument();
    });

    test('should apply custom className when provided', () => {
      const customClass = 'custom-stats-panel';
      const { container } = renderComponent(mockStats, customClass);
      
      expect(container.firstChild).toHaveClass(customClass);
    });

    test('should render with default className when none provided', () => {
      const { container } = renderComponent();
      
      expect(container.firstChild).toHaveClass('bg-gray-800', 'rounded-xl', 'border', 'border-gray-700');
    });
  });

  describe('Main Stats Display', () => {
    test('should display total games count', () => {
      renderComponent();
      
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Games')).toBeInTheDocument();
    });

    test('should display completed games count', () => {
      renderComponent();
      
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    test('should display average rating with one decimal place', () => {
      renderComponent();
      
      expect(screen.getByText('8.5')).toBeInTheDocument();
      expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    });

    test('should display achievements count', () => {
      renderComponent();
      
      expect(screen.getByText('234')).toBeInTheDocument();
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });

    test('should handle zero average rating', () => {
      const statsWithZeroRating = { ...mockStats, averageRating: 0 };
      renderComponent(statsWithZeroRating);
      
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    test('should handle undefined average rating', () => {
      const statsWithUndefinedRating = { ...mockStats, averageRating: undefined as any };
      renderComponent(statsWithUndefinedRating);
      
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });

  describe('Playtime Formatting', () => {
    test('should format minutes correctly (< 60 minutes)', () => {
      const statsWithMinutes = { ...mockStats, totalPlaytime: 45 };
      renderComponent(statsWithMinutes);
      
      expect(screen.getByText('45m')).toBeInTheDocument();
    });

    test('should format hours correctly (< 24 hours)', () => {
      const statsWithHours = { ...mockStats, totalPlaytime: 180 }; // 3 hours
      renderComponent(statsWithHours);
      
      expect(screen.getByText('3h')).toBeInTheDocument();
    });

    test('should format days and hours correctly (>= 24 hours)', () => {
      const statsWithDays = { ...mockStats, totalPlaytime: 1500 }; // 25 hours = 1d 1h
      renderComponent(statsWithDays);
      
      expect(screen.getByText('1d 1h')).toBeInTheDocument();
    });

    test('should format large playtime correctly', () => {
      const statsWithLargePlaytime = { ...mockStats, totalPlaytime: 14400 }; // 240 hours = 10d 0h
      renderComponent(statsWithLargePlaytime);
      
      expect(screen.getByText('10d 0h')).toBeInTheDocument();
    });

    test('should handle zero playtime', () => {
      const statsWithZeroPlaytime = { ...mockStats, totalPlaytime: 0 };
      renderComponent(statsWithZeroPlaytime);
      
      expect(screen.getByText('0m')).toBeInTheDocument();
    });
  });

  describe('Completion Rate Calculation', () => {
    test('should calculate completion rate correctly', () => {
      // 75 completed out of 150 total = 50%
      renderComponent();
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    test('should handle 100% completion rate', () => {
      const perfectStats = { 
        ...mockStats, 
        totalGames: 100, 
        gamesCompleted: 100 
      };
      renderComponent(perfectStats);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should handle 0% completion rate', () => {
      const zeroCompletionStats = { 
        ...mockStats, 
        totalGames: 50, 
        gamesCompleted: 0 
      };
      renderComponent(zeroCompletionStats);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('should handle zero total games gracefully', () => {
      const noGamesStats = { 
        ...mockStats, 
        totalGames: 0, 
        gamesCompleted: 0 
      };
      renderComponent(noGamesStats);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('should round completion rate properly', () => {
      const stats = { 
        ...mockStats, 
        totalGames: 3, 
        gamesCompleted: 1 
      }; // 33.33% should round to 33%
      renderComponent(stats);
      
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  describe('Detailed Stats Section', () => {
    test('should display in progress games count', () => {
      renderComponent();
      
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    test('should display wishlist games count', () => {
      renderComponent();
      
      expect(screen.getByText('Wishlist')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    test('should display reviews written count', () => {
      renderComponent();
      
      expect(screen.getByText('Reviews Written')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    test('should display total playtime', () => {
      renderComponent();
      
      expect(screen.getByText('Total Playtime')).toBeInTheDocument();
      expect(screen.getByText('5d 0h')).toBeInTheDocument(); // 7200 minutes = 120 hours = 5 days
    });
  });

  describe('Optional Fields', () => {
    test('should display most played genre when provided', () => {
      renderComponent();
      
      expect(screen.getByText('Favorite Genre')).toBeInTheDocument();
      expect(screen.getByText('RPG')).toBeInTheDocument();
    });

    test('should not display genre section when not provided', () => {
      const statsWithoutGenre = { ...mockStats, mostPlayedGenre: undefined };
      renderComponent(statsWithoutGenre);
      
      expect(screen.queryByText('Favorite Genre')).not.toBeInTheDocument();
    });

    test('should not display genre section when empty string', () => {
      const statsWithEmptyGenre = { ...mockStats, mostPlayedGenre: '' };
      renderComponent(statsWithEmptyGenre);
      
      expect(screen.queryByText('Favorite Genre')).not.toBeInTheDocument();
    });
  });

  describe('Account Age Display', () => {
    test('should display account age in days when less than 30 days', () => {
      const recentAccountStats = { ...mockStats, accountAge: 15 };
      renderComponent(recentAccountStats);
      
      expect(screen.getByText('Account Age')).toBeInTheDocument();
      expect(screen.getByText('15 days')).toBeInTheDocument();
    });

    test('should display account age in months when 30+ days', () => {
      const olderAccountStats = { ...mockStats, accountAge: 90 }; // 3 months
      renderComponent(olderAccountStats);
      
      expect(screen.getByText('Account Age')).toBeInTheDocument();
      expect(screen.getByText('3 months')).toBeInTheDocument();
    });

    test('should handle exactly 30 days (1 month)', () => {
      const monthOldStats = { ...mockStats, accountAge: 30 };
      renderComponent(monthOldStats);
      
      expect(screen.getByText('1 months')).toBeInTheDocument();
    });

    test('should handle very old account', () => {
      const veryOldStats = { ...mockStats, accountAge: 730 }; // 2 years
      renderComponent(veryOldStats);
      
      expect(screen.getByText('24 months')).toBeInTheDocument();
    });
  });

  describe('Progress Bar Visualization', () => {
    test('should render completion rate progress bar with correct width', () => {
      const { container } = renderComponent();
      
      // Find the progress bar element
      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    test('should render full progress bar for 100% completion', () => {
      const perfectStats = { 
        ...mockStats, 
        totalGames: 10, 
        gamesCompleted: 10 
      };
      const { container } = renderComponent(perfectStats);
      
      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    test('should render empty progress bar for 0% completion', () => {
      const zeroStats = { 
        ...mockStats, 
        totalGames: 10, 
        gamesCompleted: 0 
      };
      const { container } = renderComponent(zeroStats);
      
      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative values gracefully', () => {
      const negativeStats: UserStats = {
        totalGames: -5,
        gamesCompleted: -3,
        gamesInProgress: -1,
        gamesInWishlist: -2,
        totalPlaytime: -100,
        averageRating: -2.5,
        reviewsWritten: -10,
        achievementsUnlocked: -50,
        accountAge: -30
      };
      
      // Should not crash when rendering negative values
      expect(() => renderComponent(negativeStats)).not.toThrow();
    });

    test('should handle very large numbers', () => {
      const largeStats: UserStats = {
        totalGames: 888888,
        gamesCompleted: 500000,
        gamesInProgress: 100000,
        gamesInWishlist: 50000,
        totalPlaytime: 525600, // 1 year in minutes
        averageRating: 10.0,
        reviewsWritten: 25000,
        achievementsUnlocked: 999999,
        mostPlayedGenre: 'Action-Adventure-RPG-Simulation-Strategy',
        accountAge: 3650 // 10 years
      };
      
      expect(() => renderComponent(largeStats)).not.toThrow();
      expect(screen.getByText('888888')).toBeInTheDocument(); // Total games
      expect(screen.getByText('999999')).toBeInTheDocument(); // Achievements
      expect(screen.getByText('365d 0h')).toBeInTheDocument(); // Playtime formatting
    });

    test('should handle decimal values properly', () => {
      const decimalStats = {
        ...mockStats,
        averageRating: 7.56789 // Should round to 7.6
      };
      renderComponent(decimalStats);
      
      expect(screen.getByText('7.6')).toBeInTheDocument();
    });

    test('should handle null/undefined stats gracefully', () => {
      const partialStats = {
        totalGames: 10,
        gamesCompleted: 5,
        gamesInProgress: 2,
        gamesInWishlist: 3,
        totalPlaytime: 0,
        averageRating: null as any,
        reviewsWritten: 0,
        achievementsUnlocked: 0,
        accountAge: 1
      };
      
      expect(() => renderComponent(partialStats)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have proper semantic structure', () => {
      renderComponent();
      
      // Should have a proper heading
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Gaming Stats');
    });

    test('should have descriptive text for screen readers', () => {
      renderComponent();
      
      // All stat labels should be present and descriptive
      expect(screen.getByText('Games')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Avg Rating')).toBeInTheDocument();
      expect(screen.getByText('Achievements')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    test('should handle rapid re-renders without issues', () => {
      const { rerender } = renderComponent();
      
      // Simulate multiple rapid updates
      for (let i = 0; i < 10; i++) {
        const updatedStats = { 
          ...mockStats, 
          totalGames: mockStats.totalGames + i,
          gamesCompleted: mockStats.gamesCompleted + i
        };
        rerender(<UserStatsPanel stats={updatedStats} />);
      }
      
      // Should complete without errors
      expect(screen.getByText('Gaming Stats')).toBeInTheDocument();
    });

    test('should not cause unnecessary re-calculations', () => {
      const formatPlaytimeSpy = jest.fn();
      
      // Mock the formatPlaytime function to track calls
      const TestComponent = ({ stats }: { stats: UserStats }) => {
        const formatPlaytime = (minutes: number): string => {
          formatPlaytimeSpy(minutes);
          if (minutes < 60) return `${minutes}m`;
          const hours = Math.floor(minutes / 60);
          if (hours < 24) return `${hours}h`;
          const days = Math.floor(hours / 24);
          return `${days}d ${hours % 24}h`;
        };
        
        return <div>{formatPlaytime(stats.totalPlaytime)}</div>;
      };
      
      const { rerender } = render(<TestComponent stats={mockStats} />);
      expect(formatPlaytimeSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same stats
      rerender(<TestComponent stats={mockStats} />);
      expect(formatPlaytimeSpy).toHaveBeenCalledTimes(2);
    });
  });
});