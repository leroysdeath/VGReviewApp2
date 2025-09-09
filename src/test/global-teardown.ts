// Global test teardown - runs once after all tests
import { server } from './global-setup';

export default async function globalTeardown() {
  // Stop MSW server
  server.close();
  
  console.log('✅ Global MSW server stopped');
}