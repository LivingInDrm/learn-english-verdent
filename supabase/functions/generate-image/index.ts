import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 环境变量
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface GenerateImageRequest {
  attemptId: string
  text: string
}

// OpenAI 图像生成
async function generateImage(text: string): Promise<string> {
  const imagePrompt = `${text}. Highly realistic, photorealistic style, 16:9 aspect ratio, daytime lighting, ultra-clear focus.`
  
  console.log('Generating image with prompt:', imagePrompt)
  const startTime = Date.now()
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard',
      response_format: 'url'
    })
  })
  
  const elapsed = Date.now() - startTime
  console.log('DALL-E 3 API response received in', elapsed, 'ms')
  console.log('DALL-E 3 API response status:', response.status)

  if (!response.ok) {
    const errorData = await response.json()
    console.error('OpenAI Images API error:', response.status, errorData)
    throw new Error(`OpenAI Images API error: ${response.status}`)
  }

  const data = await response.json()
  const imageUrl = data.data[0]?.url

  if (!imageUrl) {
    throw new Error('No image URL received from OpenAI')
  }

  console.log('Image generated successfully')
  return imageUrl
}

serve(async (req) => {
  // CORS 处理
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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { attemptId, text } = await req.json() as GenerateImageRequest
    
    if (!attemptId || !text) {
      return new Response(JSON.stringify({ error: 'attemptId and text are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    console.log(`[${attemptId}] Starting image generation for attempt`)
    
    // 生成图片
    const imageStartTime = Date.now()
    const imageUrl = await generateImage(text)
    const imageLatency = Date.now() - imageStartTime
    
    console.log(`[${attemptId}] Image generated in ${imageLatency}ms`)
    
    // 更新数据库
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        image_url: imageUrl,
        status: 'ok',
        latency_image_ms: imageLatency,
      })
      .eq('id', attemptId)
    
    if (updateError) {
      console.error(`[${attemptId}] Failed to update database:`, updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to update database',
        details: updateError 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    console.log(`[${attemptId}] Successfully updated with image URL`)
    
    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      attemptId,
      latency: imageLatency
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
    
  } catch (error) {
    console.error('Image generation error:', error)
    
    // 如果有 attemptId，更新状态为 text_only
    const requestBody = await req.clone().json() as GenerateImageRequest
    if (requestBody.attemptId) {
      await supabase
        .from('attempts')
        .update({ status: 'text_only' })
        .eq('id', requestBody.attemptId)
    }
    
    return new Response(JSON.stringify({ 
      error: 'Image generation failed',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})