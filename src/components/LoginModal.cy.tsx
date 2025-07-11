import React from 'react';
import { LoginModal } from './LoginModal';

describe('LoginModal Component', () => {
  it('renders login form by default', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.contains('Sign in to your account').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.contains('button', 'Sign in').should('be.visible');
  });

  it('switches to signup form', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.contains('Sign up').click();
    cy.contains('Create your account').should('be.visible');
    cy.get('input[id="username"]').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[id="signup-password"]').should('be.visible');
    cy.get('input[id="confirmPassword"]').should('be.visible');
    cy.contains('button', 'Create account').should('be.visible');
  });

  it('validates login form', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.contains('button', 'Sign in').click();
    cy.contains('Please enter a valid email address').should('be.visible');
    cy.contains('Password must be at least 6 characters').should('be.visible');
  });

  it('validates signup form', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.contains('Sign up').click();
    cy.contains('button', 'Create account').click();
    cy.contains('Username must be at least 3 characters').should('be.visible');
    cy.contains('Please enter a valid email address').should('be.visible');
    cy.contains('Password must be at least 8 characters').should('be.visible');
  });

  it('shows password strength indicator', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.contains('Sign up').click();
    cy.get('input[id="signup-password"]').type('weak');
    cy.contains('Weak').should('be.visible');
    cy.get('input[id="signup-password"]').clear().type('Password123!');
    cy.contains('Strong').should('be.visible');
  });

  it('toggles password visibility', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.get('input[type="password"]').should('exist');
    cy.get('button[aria-label="Show password"]').click();
    cy.get('input[type="text"]').should('exist');
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseSpy = cy.spy().as('onCloseSpy');
    cy.mount(<LoginModal isOpen={true} onClose={onCloseSpy} />);
    cy.get('button[aria-label="Close"]').click();
    cy.get('@onCloseSpy').should('have.been.called');
  });

  it('calls onLoginSuccess after successful login', () => {
    const onLoginSuccessSpy = cy.spy().as('onLoginSuccessSpy');
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} onLoginSuccess={onLoginSuccessSpy} />);
    
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.contains('button', 'Sign in').click();
    
    // Wait for the mock login to complete
    cy.get('@onLoginSuccessSpy').should('have.been.called');
  });

  it('is not rendered when isOpen is false', () => {
    cy.mount(<LoginModal isOpen={false} onClose={() => {}} />);
    cy.contains('Sign in to your account').should('not.exist');
  });

  it('passes axe accessibility tests', () => {
    cy.mount(<LoginModal isOpen={true} onClose={() => {}} />);
    cy.checkA11y();
  });
});