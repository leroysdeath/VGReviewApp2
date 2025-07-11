import React from 'react';
import { UserProfileCard } from './UserProfileCard';
import { BrowserRouter } from 'react-router-dom';

describe('UserProfileCard Component', () => {
  const mockStats = {
    gamesPlayed: 87,
    gamesCompleted: 42,
    reviewsWritten: 36,
    averageRating: 8.4,
    achievements: 156,
    followers: 24,
    following: 36
  };

  it('renders user information correctly', () => {
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          avatarUrl="https://example.com/avatar.jpg"
          bio="Test bio for user profile"
          joinDate="January 2023"
          stats={mockStats}
        />
      </BrowserRouter>
    );
    
    cy.contains('testuser').should('be.visible');
    cy.contains('Test bio for user profile').should('be.visible');
    cy.contains('Joined January 2023').should('be.visible');
    cy.contains(mockStats.gamesPlayed.toString()).should('be.visible');
    cy.contains(mockStats.reviewsWritten.toString()).should('be.visible');
    cy.contains(mockStats.averageRating.toFixed(1)).should('be.visible');
  });

  it('displays avatar image when avatarUrl is provided', () => {
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          avatarUrl="https://example.com/avatar.jpg"
          joinDate="January 2023"
          stats={mockStats}
        />
      </BrowserRouter>
    );
    
    cy.get('img[alt="testuser"]').should('be.visible');
    cy.get('img[alt="testuser"]').should('have.attr', 'src', 'https://example.com/avatar.jpg');
  });

  it('displays initial avatar when avatarUrl is not provided', () => {
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          joinDate="January 2023"
          stats={mockStats}
        />
      </BrowserRouter>
    );
    
    cy.contains('T').should('be.visible');
  });

  it('shows edit profile button for current user', () => {
    const onEditProfileSpy = cy.spy().as('onEditProfileSpy');
    
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          joinDate="January 2023"
          stats={mockStats}
          isCurrentUser={true}
          onEditProfile={onEditProfileSpy}
        />
      </BrowserRouter>
    );
    
    cy.contains('button', 'Edit Profile').should('be.visible');
    cy.contains('button', 'Edit Profile').click();
    cy.get('@onEditProfileSpy').should('have.been.called');
  });

  it('shows follow button for other users', () => {
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          joinDate="January 2023"
          stats={mockStats}
          isCurrentUser={false}
        />
      </BrowserRouter>
    );
    
    cy.contains('button', 'Follow').should('be.visible');
  });

  it('has correct links to user pages', () => {
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          joinDate="January 2023"
          stats={mockStats}
        />
      </BrowserRouter>
    );
    
    cy.contains(mockStats.followers.toString()).parent().should('have.attr', 'href', '/user/123/followers');
    cy.contains(mockStats.following.toString()).parent().should('have.attr', 'href', '/user/123/following');
  });

  it('passes axe accessibility tests', () => {
    cy.mount(
      <BrowserRouter>
        <UserProfileCard
          userId="123"
          username="testuser"
          avatarUrl="https://example.com/avatar.jpg"
          bio="Test bio for user profile"
          joinDate="January 2023"
          stats={mockStats}
        />
      </BrowserRouter>
    );
    
    cy.checkA11y();
  });
});