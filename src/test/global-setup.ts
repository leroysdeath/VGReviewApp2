// Global test setup - runs once before all tests
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Global MSW server instance
export const server = setupServer(...handlers);

export default async function globalSetup() {
  // Start MSW server once for all tests
  server.listen({
    onUnhandledRequest: 'warn'
  });
  
  console.log('✅ Global MSW server started');
}