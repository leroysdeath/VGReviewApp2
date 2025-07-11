import React from 'react';
import { UserSettingsForm } from './UserSettingsForm';

describe('UserSettingsForm Component', () => {
  const mockUser = {
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test bio for user settings',
    avatarUrl: 'https://example.com/avatar.jpg'
  };

  it('renders with user data', () => {
    cy.mount(<UserSettingsForm user={mockUser} onSave={() => Promise.resolve()} />);
    
    cy.get('input[id="username"]').should('have.value', mockUser.username);
    cy.get('input[id="email"]').should('have.value', mockUser.email);
    cy.get('textarea[id="bio"]').should('have.value', mockUser.bio);
    cy.get('img[alt="testuser"]').should('have.attr', 'src', mockUser.avatarUrl);
  });

  it('shows validation errors for invalid inputs', () => {
    cy.mount(<UserSettingsForm user={mockUser} onSave={() => Promise.resolve()} />);
    
    // Clear username field
    cy.get('input[id="username"]').clear();
    
    // Enter invalid email
    cy.get('input[id="email"]').clear().type('invalid-email');
    
    // Submit form
    cy.contains('button', 'Save Changes').click();
    
    // Check for validation errors
    cy.contains('Username must be at least 3 characters').should('be.visible');
    cy.contains('Please enter a valid email address').should('be.visible');
  });

  it('shows password strength indicator', () => {
    cy.mount(<UserSettingsForm user={mockUser} onSave={() => Promise.resolve()} />);
    
    // Enter current password (required)
    cy.get('input[id="currentPassword"]').type('currentpass');
    
    // Enter weak new password
    cy.get('input[id="newPassword"]').type('weak');
    
    // Check for weak indicator
    cy.contains('Weak').should('be.visible');
    
    // Enter strong password
    cy.get('input[id="newPassword"]').clear().type('StrongP@ssw0rd');
    
    // Check for strong indicator
    cy.contains('Strong').should('be.visible');
  });

  it('validates password confirmation', () => {
    cy.mount(<UserSettingsForm user={mockUser} onSave={() => Promise.resolve()} />);
    
    // Enter current password
    cy.get('input[id="currentPassword"]').type('currentpass');
    
    // Enter new password
    cy.get('input[id="newPassword"]').type('NewPassword123');
    
    // Enter different confirmation password
    cy.get('input[id="confirmPassword"]').type('DifferentPassword');
    
    // Submit form
    cy.contains('button', 'Save Changes').click();
    
    // Check for password match error
    cy.contains('Passwords don\'t match').should('be.visible');
  });

  it('submits form with valid data', () => {
    const onSaveSpy = cy.spy().as('onSaveSpy');
    
    cy.mount(
      <UserSettingsForm 
        user={mockUser} 
        onSave={(data) => {
          onSaveSpy(data);
          return Promise.resolve();
        }} 
      />
    );
    
    // Update username
    cy.get('input[id="username"]').clear().type('newusername');
    
    // Enter current password (required)
    cy.get('input[id="currentPassword"]').type('currentpass');
    
    // Submit form
    cy.contains('button', 'Save Changes').click();
    
    // Check if onSave was called with correct data
    cy.get('@onSaveSpy').should('have.been.calledWith', 
      Cypress.sinon.match({
        username: 'newusername',
        email: mockUser.email,
        currentPassword: 'currentpass'
      })
    );
  });

  it('shows success message after saving', () => {
    cy.mount(
      <UserSettingsForm 
        user={mockUser} 
        onSave={() => Promise.resolve()} 
      />
    );
    
    // Enter current password (required)
    cy.get('input[id="currentPassword"]').type('currentpass');
    
    // Submit form
    cy.contains('button', 'Save Changes').click();
    
    // Check for success message
    cy.contains('Settings saved successfully').should('be.visible');
  });

  it('shows error message when save fails', () => {
    cy.mount(
      <UserSettingsForm 
        user={mockUser} 
        onSave={() => Promise.reject(new Error('Save failed'))} 
      />
    );
    
    // Enter current password (required)
    cy.get('input[id="currentPassword"]').type('currentpass');
    
    // Submit form
    cy.contains('button', 'Save Changes').click();
    
    // Check for error message
    cy.contains('Failed to save settings').should('be.visible');
  });

  it('passes axe accessibility tests', () => {
    cy.mount(<UserSettingsForm user={mockUser} onSave={() => Promise.resolve()} />);
    cy.checkA11y();
  });
});