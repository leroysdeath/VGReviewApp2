import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Environment variables for web push
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Generate VAPID keys endpoint
    if (path === 'generate-keys') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // This would generate new VAPID keys - in production you'd want to store these securely
      // For demo purposes, we'll just return the existing keys
      return new Response(
        JSON.stringify({ 
          publicKey: VAPID_PUBLIC_KEY || 'demo-public-key',
          privateKey: 'REDACTED' // Never expose the private key
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save subscription endpoint
    if (path === 'save-subscription') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { subscription, userId } = await req.json()

      // In a real implementation, you would save this subscription to your database
      console.log('Saving subscription for user:', userId)
      console.log('Subscription:', subscription)

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription saved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send notification endpoint
    if (path === 'send') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { subscription, payload } = await req.json()

      // Validate input
      if (!subscription || !payload) {
        return new Response(
          JSON.stringify({ error: 'Missing subscription or payload' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // In a real implementation, you would use web-push to send the notification
      // For demo purposes, we'll just log the notification
      console.log('Sending notification to:', subscription.endpoint)
      console.log('Notification payload:', payload)

      // Simulate sending a push notification
      // In production, you would use:
      // await webPush.sendNotification(subscription, JSON.stringify(payload), { vapidDetails })

      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send to user endpoint
    if (path === 'send-to-user') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { userId, notification } = await req.json()

      // Validate input
      if (!userId || !notification) {
        return new Response(
          JSON.stringify({ error: 'Missing userId or notification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // In a real implementation, you would:
      // 1. Look up all push subscriptions for this user
      // 2. Send the notification to each subscription
      console.log('Sending notification to user:', userId)
      console.log('Notification:', notification)

      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent to user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default response for unknown endpoints
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})