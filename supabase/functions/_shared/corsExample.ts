// Example of how to use the CORS validation in Supabase edge functions

import { handleCorsRequest, getCorsHeaders } from './cors.ts';

export const serve = async (handler: (req: Request) => Promise<Response>) => {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight and validation
    const corsResponse = handleCorsRequest(req);
    if (corsResponse) {
      return corsResponse;
    }

    try {
      // Call the actual handler
      const response = await handler(req);
      
      // Add CORS headers to the response
      const origin = req.headers.get('origin');
      const corsHeaders = getCorsHeaders(origin);
      
      // Clone response and add CORS headers
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.error('Function error:', error);
      
      const origin = req.headers.get('origin');
      const corsHeaders = getCorsHeaders(origin);
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  };
};

// Example usage in a function:
/*
import { serve } from '../_shared/corsExample.ts';

export default serve(async (req: Request): Promise<Response> => {
  // Your function logic here
  return new Response(JSON.stringify({ message: 'Hello World' }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
*/