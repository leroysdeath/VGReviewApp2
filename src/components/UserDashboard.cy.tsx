import React from 'react';
import { UserDashboard } from './UserDashboard';
import { BrowserRouter } from 'react-router-dom';

// Sample data for testing
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

describe('UserDashboard Component', () => {
  it('renders user information correctly', () => {
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={() => {}}
        />
      </BrowserRouter>
    );
    
    cy.contains(mockUser.username).should('be.visible');
    cy.contains(mockUser.bio).should('be.visible');
    cy.contains(`Joined ${mockUser.joinDate}`).should('be.visible');
  });

  it('displays user stats correctly', () => {
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={() => {}}
        />
      </BrowserRouter>
    );
    
    cy.contains(mockStats.gamesPlayed.toString()).should('be.visible');
    cy.contains(mockStats.gamesCompleted.toString()).should('be.visible');
    cy.contains(mockStats.reviewsWritten.toString()).should('be.visible');
    cy.contains(mockStats.averageRating.toFixed(1)).should('be.visible');
  });

  it('shows recent activity', () => {
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={() => {}}
        />
      </BrowserRouter>
    );
    
    cy.contains('Recent Activity').should('be.visible');
    cy.contains(mockActivity[0].gameTitle).should('be.visible');
    cy.contains(mockActivity[1].gameTitle).should('be.visible');
  });

  it('shows favorite games', () => {
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={() => {}}
        />
      </BrowserRouter>
    );
    
    cy.contains('Favorite Games').should('be.visible');
    cy.contains(mockFavoriteGames[0].title).should('be.visible');
    cy.contains(mockFavoriteGames[1].title).should('be.visible');
  });

  it('switches tabs correctly', () => {
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={() => {}}
        />
      </BrowserRouter>
    );
    
    // Default tab should be overview
    cy.contains('Dashboard Overview').should('be.visible');
    
    // Switch to activity tab
    cy.contains('button', 'Activity').click();
    cy.contains('Activity Feed').should('be.visible');
    
    // Switch to games tab
    cy.contains('button', 'Games').click();
    cy.contains('My Games').should('be.visible');
    
    // Switch to reviews tab
    cy.contains('button', 'Reviews').click();
    cy.contains('My Reviews').should('be.visible');
    
    // Switch to settings tab
    cy.contains('button', 'Settings').click();
    cy.contains('Account Settings').should('be.visible');
  });

  it('calls logout function when logout button is clicked', () => {
    const onLogoutSpy = cy.spy().as('onLogoutSpy');
    
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={onLogoutSpy}
        />
      </BrowserRouter>
    );
    
    cy.contains('button', 'Logout').click();
    cy.get('@onLogoutSpy').should('have.been.called');
  });

  it('passes axe accessibility tests', () => {
    cy.mount(
      <BrowserRouter>
        <UserDashboard
          user={mockUser}
          stats={mockStats}
          recentActivity={mockActivity}
          favoriteGames={mockFavoriteGames}
          onLogout={() => {}}
        />
      </BrowserRouter>
    );
    
    cy.checkA11y();
  });
});