import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // CORS处理
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 从URL路径提取attemptId
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    const attemptId = pathSegments[pathSegments.length - 1]

    if (!attemptId || attemptId.length < 10) {
      return new Response(JSON.stringify({ error: 'Invalid attempt ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 查询attempt记录
    const { data: attempt, error } = await supabase
      .from('attempts')
      .select('image_url, status')
      .eq('id', attemptId)
      .single()

    if (error || !attempt) {
      return new Response(JSON.stringify({ error: 'Attempt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const response = {
      imageUrl: attempt.image_url,
      status: attempt.status
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})