import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

console.log('Test DALL-E Function started')
console.log('OPENAI_API_KEY exists:', !!OPENAI_API_KEY)
console.log('OPENAI_API_KEY length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0)

serve(async (req) => {
  console.log('Request received')
  
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    console.log('Starting DALL-E test...')
    console.log('Using API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 20)}...` : 'MISSING')
    
    const requestBody = {
      model: 'dall-e-3',
      prompt: 'A simple red circle on white background',
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    }
    
    console.log('Request body:', JSON.stringify(requestBody))
    console.log('Making fetch request to OpenAI...')
    
    const startTime = Date.now()
    
    // 使用 AbortController 设置超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log('Aborting request due to timeout (20s)')
      controller.abort()
    }, 20000)
    
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime
      console.log(`Fetch completed in ${elapsed}ms`)
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log('Response body:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse response as JSON')
        data = { error: responseText }
      }
      
      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        elapsed: elapsed,
        data: data
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime
      console.error('Fetch error:', fetchError)
      console.error('Error name:', fetchError.name)
      console.error('Error message:', fetchError.message)
      console.error('Elapsed time:', elapsed)
      
      return new Response(JSON.stringify({
        success: false,
        error: fetchError.message,
        errorName: fetchError.name,
        elapsed: elapsed
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    
  } catch (error) {
    console.error('Outer error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})