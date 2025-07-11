/// <reference types="cypress" />
import '@testing-library/cypress/add-commands';
import { lighthouse, prepareAudit } from '@cypress-audit/lighthouse';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Custom command to run lighthouse audit
       * @example cy.lighthouse()
       */
      lighthouse(thresholds?: Record<string, number>, opts?: any, config?: any): Chainable<any>;
      
      /**
       * Custom command to login programmatically
       * @example cy.login('test@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
    }
  }
}

// Custom command to select by data-cy attribute
Cypress.Commands.add('dataCy', (value) => {
  return cy.get(`[data-cy=${value}]`);
});

// Add lighthouse command
Cypress.Commands.add('lighthouse', (thresholds, opts, config) => {
  return cy.task('lighthouse', {
    thresholds,
    opts,
    config,
  });
});

// Custom login command
Cypress.Commands.add('login', (email, password) => {
  // Set user in localStorage to simulate login
  const user = {
    id: '1',
    email,
    username: email.split('@')[0],
    avatarUrl: 'https://example.com/avatar.jpg'
  };
  
  localStorage.setItem('gameVaultUser', JSON.stringify(user));
  
  // Visit profile page to verify login
  cy.visit('/profile');
});

export {};