describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.get('h2').contains('Sign in to your account').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button').contains('Sign in').should('be.visible');
  });

  it('should switch to signup form', () => {
    cy.contains('Sign up').click();
    cy.get('h2').contains('Create your account').should('be.visible');
    cy.get('input[id="username"]').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('input[id="confirmPassword"]').should('be.visible');
    cy.get('button').contains('Create account').should('be.visible');
  });

  it('should validate login form', () => {
    cy.get('button').contains('Sign in').click();
    cy.contains('Please enter a valid email address').should('be.visible');
    cy.contains('Password must be at least 6 characters').should('be.visible');
  });

  it('should validate signup form', () => {
    cy.contains('Sign up').click();
    cy.get('button').contains('Create account').click();
    cy.contains('Username must be at least 3 characters').should('be.visible');
    cy.contains('Please enter a valid email address').should('be.visible');
    cy.contains('Password must be at least 8 characters').should('be.visible');
    cy.contains('You must accept the terms and conditions').should('be.visible');
  });

  it('should show password strength indicator', () => {
    cy.contains('Sign up').click();
    cy.get('input[id="signup-password"]').type('weak');
    cy.contains('Weak').should('be.visible');
    cy.get('input[id="signup-password"]').clear().type('Password123!');
    cy.contains('Strong').should('be.visible');
  });

  it('should toggle password visibility', () => {
    cy.get('input[type="password"]').should('exist');
    cy.get('button[aria-label="Show password"]').click();
    cy.get('input[type="text"]').should('exist');
    cy.get('button[aria-label="Hide password"]').click();
    cy.get('input[type="password"]').should('exist');
  });

  it('should close modal when clicking close button', () => {
    cy.get('button[aria-label="Close"]').click();
    cy.get('h2').contains('Sign in to your account').should('not.exist');
  });

  it('should perform login with valid credentials', () => {
    // Mock successful login
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.jpg'
      }
    }).as('loginRequest');

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button').contains('Sign in').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/profile');
  });

  it('should perform signup with valid data', () => {
    // Mock successful signup
    cy.intercept('POST', '/api/auth/signup', {
      statusCode: 200,
      body: {
        id: '1',
        email: 'new@example.com',
        username: 'newuser',
        avatarUrl: null
      }
    }).as('signupRequest');

    cy.contains('Sign up').click();
    cy.get('input[id="username"]').type('newuser');
    cy.get('input[id="signup-email"]').type('new@example.com');
    cy.get('input[id="signup-password"]').type('Password123!');
    cy.get('input[id="confirmPassword"]').type('Password123!');
    cy.get('input[type="checkbox"]').check();
    cy.get('button').contains('Create account').click();

    cy.wait('@signupRequest');
    cy.url().should('include', '/profile');
  });

  it('should show error message on login failure', () => {
    // Mock failed login
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: {
        error: 'Invalid credentials'
      }
    }).as('loginFailure');

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button').contains('Sign in').click();

    cy.wait('@loginFailure');
    cy.contains('Invalid email or password').should('be.visible');
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