describe('User Profile', () => {
  beforeEach(() => {
    // Mock authenticated user
    localStorage.setItem('gameVaultUser', JSON.stringify({
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      avatarUrl: 'https://example.com/avatar.jpg'
    }));
    
    cy.visit('/profile');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should display user dashboard with profile information', () => {
    cy.get('h1').contains('testuser').should('be.visible');
    cy.contains('Dashboard Overview').should('be.visible');
    cy.contains('Recent Activity').should('be.visible');
    cy.contains('Favorite Games').should('be.visible');
  });

  it('should switch between dashboard tabs', () => {
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

  it('should display user stats correctly', () => {
    cy.contains('Games Played').should('be.visible');
    cy.contains('Completed').should('be.visible');
    cy.contains('Reviews').should('be.visible');
    cy.contains('Avg. Rating').should('be.visible');
  });

  it('should show settings form in settings tab', () => {
    cy.contains('button', 'Settings').click();
    cy.contains('Profile Information').should('be.visible');
    cy.get('input[id="username"]').should('be.visible');
    cy.get('input[id="email"]').should('be.visible');
    cy.get('textarea[id="bio"]').should('be.visible');
  });

  it('should validate settings form', () => {
    cy.contains('button', 'Settings').click();
    
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

  it('should logout when logout button is clicked', () => {
    cy.contains('button', 'Logout').click();
    
    // Should redirect to login page
    cy.contains('Sign In Required').should('be.visible');
    
    // LocalStorage should be cleared
    cy.window().then((win) => {
      expect(win.localStorage.getItem('gameVaultUser')).to.be.null;
    });
  });

  it('should run a lighthouse audit', () => {
    cy.lighthouse({
      performance: 90,
      accessibility: 90,
      'best-practices': 90,
      seo: 90,
    });
  });
});