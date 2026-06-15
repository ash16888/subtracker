import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RefreshRequest = {
  refreshToken?: string
}

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const { refreshToken } = await request.json() as RefreshRequest
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')

    if (!refreshToken || !clientId || !clientSecret) {
      return jsonResponse({ error: 'Google OAuth refresh is not configured' }, 400)
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenResponse.json() as GoogleTokenResponse

    if (!tokenResponse.ok || !tokenData.access_token) {
      return jsonResponse({
        error: tokenData.error_description ?? tokenData.error ?? 'Google token refresh failed',
      }, tokenResponse.status)
    }

    return jsonResponse({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in ?? 3600,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
