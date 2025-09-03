// Jest setup file for Node.js globals and polyfills

import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Add fetch to global scope for MSW
global.fetch = fetch;
global.Response = Response;
global.Request = Request;
global.Headers = Headers;

// Add Node.js globals for MSW
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;