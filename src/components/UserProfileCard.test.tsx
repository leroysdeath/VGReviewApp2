import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { UserProfileCard } from './UserProfileCard';
import { BrowserRouter } from 'react-router-dom';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock data for testing
const mockUserData = {
  userId: '123',
  username: 'testuser',
  avatarUrl: 'https://example.com/avatar.jpg',
  bio: 'Test bio for user profile',
  joinDate: 'January 2023',
  stats: {
    gamesPlayed: 42,
    gamesCompleted: 24,
    reviewsWritten: 18,
    averageRating: 8.5,
    achievements: 15,
    followers: 120,
    following: 85
  }
};

// Wrapper component for Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('UserProfileCard', () => {
  it('renders user information correctly', () => {
    renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        avatarUrl={mockUserData.avatarUrl}
        bio={mockUserData.bio}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
      />
    );
    
    expect(screen.getByText(mockUserData.username)).toBeInTheDocument();
    expect(screen.getByText(mockUserData.bio)).toBeInTheDocument();
    expect(screen.getByText(`Joined ${mockUserData.joinDate}`)).toBeInTheDocument();
    expect(screen.getByText(mockUserData.stats.gamesPlayed.toString())).toBeInTheDocument();
    expect(screen.getByText(mockUserData.stats.reviewsWritten.toString())).toBeInTheDocument();
    expect(screen.getByText(mockUserData.stats.averageRating.toFixed(1))).toBeInTheDocument();
  });

  it('displays avatar image when avatarUrl is provided', () => {
    renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        avatarUrl={mockUserData.avatarUrl}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
      />
    );
    
    const avatar = screen.getByAltText(mockUserData.username);
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', mockUserData.avatarUrl);
  });

  it('displays initial avatar when avatarUrl is not provided', () => {
    renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
      />
    );
    
    // Should show the first letter of username as avatar
    const initialAvatar = screen.getByText('T');
    expect(initialAvatar).toBeInTheDocument();
  });

  it('shows edit profile button for current user', async () => {
    const mockEditProfile = jest.fn();
    
    renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
        isCurrentUser={true}
        onEditProfile={mockEditProfile}
      />
    );
    
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    expect(editButton).toBeInTheDocument();
    
    await userEvent.click(editButton);
    expect(mockEditProfile).toHaveBeenCalledTimes(1);
  });

  it('shows follow button for other users', () => {
    renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
        isCurrentUser={false}
      />
    );
    
    const followButton = screen.getByRole('button', { name: /follow/i });
    expect(followButton).toBeInTheDocument();
  });

  it('has correct links to user pages', () => {
    renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
      />
    );
    
    const followersLink = screen.getByText(`${mockUserData.stats.followers}`).closest('a');
    const followingLink = screen.getByText(`${mockUserData.stats.following}`).closest('a');
    
    expect(followersLink).toHaveAttribute('href', `/user/${mockUserData.userId}/followers`);
    expect(followingLink).toHaveAttribute('href', `/user/${mockUserData.userId}/following`);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithRouter(
      <UserProfileCard 
        userId={mockUserData.userId}
        username={mockUserData.username}
        avatarUrl={mockUserData.avatarUrl}
        bio={mockUserData.bio}
        joinDate={mockUserData.joinDate}
        stats={mockUserData.stats}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});