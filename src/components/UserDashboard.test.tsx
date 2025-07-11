import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { UserDashboard } from './UserDashboard';
import { BrowserRouter } from 'react-router-dom';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockUser = {
  id: '123',
  username: 'testuser',
  avatarUrl: 'https://example.com/avatar.jpg',
  bio: 'Test bio for user dashboard',
  joinDate: 'January 2023'
};

const mockStats = {
  gamesPlayed: 87,
  gamesCompleted: 42,
  reviewsWritten: 36,
  averageRating: 8.4,
  achievements: 156,
  followers: 24,
  following: 36
};

const mockActivity = [
  {
    id: '1',
    type: 'review' as const,
    gameId: '1',
    gameTitle: 'The Witcher 3',
    gameCover: 'https://example.com/witcher3.jpg',
    date: '2 days ago',
    rating: 9.5
  },
  {
    id: '2',
    type: 'completed' as const,
    gameId: '2',
    gameTitle: 'Cyberpunk 2077',
    gameCover: 'https://example.com/cyberpunk.jpg',
    date: '1 week ago'
  }
];

const mockFavoriteGames = [
  {
    id: '1',
    title: 'The Witcher 3',
    coverUrl: 'https://example.com/witcher3.jpg',
    rating: 9.5
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    coverUrl: 'https://example.com/cyberpunk.jpg',
    rating: 7.8
  }
];

// Wrapper component for Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('UserDashboard', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user information correctly', () => {
    renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockUser.bio)).toBeInTheDocument();
    expect(screen.getByText(`Joined ${mockUser.joinDate}`)).toBeInTheDocument();
  });

  it('displays user stats correctly', () => {
    renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    expect(screen.getByText(mockStats.gamesPlayed.toString())).toBeInTheDocument();
    expect(screen.getByText(mockStats.gamesCompleted.toString())).toBeInTheDocument();
    expect(screen.getByText(mockStats.reviewsWritten.toString())).toBeInTheDocument();
    expect(screen.getByText(mockStats.averageRating.toFixed(1))).toBeInTheDocument();
  });

  it('shows recent activity', () => {
    renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText(mockActivity[0].gameTitle)).toBeInTheDocument();
    expect(screen.getByText(mockActivity[1].gameTitle)).toBeInTheDocument();
  });

  it('shows favorite games', () => {
    renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    expect(screen.getByText('Favorite Games')).toBeInTheDocument();
    expect(screen.getByText(mockFavoriteGames[0].title)).toBeInTheDocument();
    expect(screen.getByText(mockFavoriteGames[1].title)).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    // Default tab should be overview
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    
    // Switch to activity tab
    await userEvent.click(screen.getByRole('button', { name: /activity/i }));
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    
    // Switch to games tab
    await userEvent.click(screen.getByRole('button', { name: /games/i }));
    expect(screen.getByText('My Games')).toBeInTheDocument();
    
    // Switch to reviews tab
    await userEvent.click(screen.getByRole('button', { name: /reviews/i }));
    expect(screen.getByText('My Reviews')).toBeInTheDocument();
    
    // Switch to settings tab
    await userEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
  });

  it('calls logout function when logout button is clicked', async () => {
    renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithRouter(
      <UserDashboard
        user={mockUser}
        stats={mockStats}
        recentActivity={mockActivity}
        favoriteGames={mockFavoriteGames}
        onLogout={mockLogout}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});