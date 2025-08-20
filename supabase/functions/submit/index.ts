import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 环境变量配置 - Supabase Edge Functions内置变量
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

// 调试环境变量
console.log('Environment check:')
console.log('- SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING')
console.log('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING') 
console.log('- OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET (length: ' + OPENAI_API_KEY.length + ')' : 'MISSING')
console.log('- All env vars:', Object.keys(Deno.env.toObject()))

// 常量配置
const EVAL_TIMEOUT_MS = 15000  // 增加到15秒
const IMG_TIMEOUT_MS = 120000  // 2分钟
const MIN_WORDS = 3
const RATE_LIMIT_PER_MINUTE = 6

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// 简单的内存频控实现
const rateLimitMap = new Map<string, number[]>()

interface SubmitRequest {
  sceneId: string
  text: string
  installId: string
}

interface EvaluationResult {
  minimalFix: string
  microReason: string
  bestDescription: string
  encouragement: string
}

// 频控检查
function checkRateLimit(installId: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(installId) || []
  
  // 清理超过1分钟的请求记录
  const recentRequests = requests.filter(timestamp => now - timestamp < 60000)
  
  if (recentRequests.length >= RATE_LIMIT_PER_MINUTE) {
    return false
  }
  
  recentRequests.push(now)
  rateLimitMap.set(installId, recentRequests)
  
  return true
}

// 输入验证
function validateInput(request: SubmitRequest): string | null {
  if (!request.sceneId || typeof request.sceneId !== 'string') {
    return 'sceneId is required and must be a string'
  }
  
  if (!request.text || typeof request.text !== 'string') {
    return 'text is required and must be a string'
  }
  
  if (!request.installId || typeof request.installId !== 'string') {
    return 'installId is required and must be a string'
  }
  
  const wordCount = request.text.trim().split(/\s+/).filter(word => word.length > 0).length
  if (wordCount < MIN_WORDS) {
    return `Description must have at least ${MIN_WORDS} words`
  }
  
  return null
}

// OpenAI文本评估
async function evaluateText(text: string, sceneId: string): Promise<EvaluationResult> {
  console.log('Starting text evaluation...')
  console.log('Using OpenAI API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 20)}...` : 'MISSING')
  
  const systemPrompt = `You are an English teacher and motivator.
You will be given:
- An image (ground truth).
- A student's English description of the image.

Your task is to give structured feedback that helps the student both improve accuracy and stay motivated.

Always respond in four sections in this exact order:

1. Minimal Fix
Correct the student's sentence with the smallest possible changes to make it:
- Grammatically correct
- Natural (sounds like how a native speaker would say it)
- Accurate (faithfully describes the given image content)
Keep the original structure when possible.
Highlight changes using bold for added/replaced words and strike-through for removed words.
Output only one corrected sentence here.

2. Micro Reason
Explain what's wrong with the original version or why you made this correct.
Use simple English + Chinese together so Chinese students can learn easily from it.

3. Best Description
Produce a completely new sentence that gives the most natural, fluent, and accurate description of the image, as a native English speaker would write it.
Do not limit yourself to the user's original sentence.
The goal is to model the best possible English description, concise and idiomatic.
Output only one sentence.

4. Encouragement
Give a short and friendly message that makes the student feel good about their work.
- Always point out something specific they did well.
- Keep the tone warm and positive, so they feel encouraged to keep learning.
- Only one sentence.

Respond with valid JSON in this exact format:
{
  "minimalFix": "The corrected sentence with **bold** for changes and ~~strikethrough~~ for removals",
  "microReason": "Explanation in simple English + 中文",
  "bestDescription": "A natural, native-speaker description",
  "encouragement": "A warm, positive message"
}`

  const userPrompt = `Scene ID: ${sceneId}
User description: "${text}"

Please evaluate this description and provide feedback.`

  console.log('Calling OpenAI API...')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })
  })

  console.log('OpenAI API response status:', response.status)
  
  if (!response.ok) {
    const errorBody = await response.text()
    console.error('OpenAI API error body:', errorBody)
    throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content received from OpenAI')
  }

  try {
    const evaluation = JSON.parse(content)
    
    // 验证必需字段
    if (!evaluation.minimalFix || !evaluation.microReason || !evaluation.bestDescription || !evaluation.encouragement) {
      throw new Error('Invalid evaluation format')
    }
    
    return evaluation
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content)
    throw new Error('Failed to parse evaluation result')
  }
}

// OpenAI图像生成
async function generateImage(text: string): Promise<string> {
  // 构建图像生成prompt：用户描述 + 固定风格后缀
  const imagePrompt = `${text}. Highly realistic, photorealistic style, 16:9 aspect ratio, daytime lighting, ultra-clear focus.`
  
  console.log('Generating image with prompt:', imagePrompt)
  console.log('Using DALL-E 3 with API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 20)}...` : 'MISSING')
  
  const startTime = Date.now()
  console.log('Creating simple fetch request to DALL-E 3...')
  
  // 简化的 fetch 请求，不使用 AbortController
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
      size: '1792x1024', // 16:9 aspect ratio
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

  console.log('Image generated successfully:', imageUrl)
  return imageUrl
}

// 异步更新图像URL
async function updateImageAsync(attemptId: string, text: string) {
  const imageStartTime = Date.now()
  
  console.log(`[${attemptId}] ===== STARTING updateImageAsync =====`)
  console.log(`[${attemptId}] OPENAI_API_KEY available:`, OPENAI_API_KEY ? 'YES' : 'NO')
  console.log(`[${attemptId}] API Key length:`, OPENAI_API_KEY ? OPENAI_API_KEY.length : 0)
  
  try {
    console.log(`[${attemptId}] Starting image generation`)
    console.log(`[${attemptId}] Text: "${text}"`)
    
    // 直接调用，不使用 Promise.race（先简化调试）
    console.log(`[${attemptId}] Calling generateImage directly...`)
    const imageUrl = await generateImage(text)
    const imageLatency = Date.now() - imageStartTime
    
    console.log(`[${attemptId}] Image generation completed, latency: ${imageLatency}ms`)
    console.log(`[${attemptId}] Image URL: ${imageUrl}`)
    
    // 更新数据库：设置image_url和状态为ok
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        image_url: imageUrl,
        status: 'ok',
        latency_image_ms: imageLatency,
      })
      .eq('id', attemptId)
    
    if (updateError) {
      console.error(`[${attemptId}] Failed to update with image URL:`, updateError)
    } else {
      console.log(`[${attemptId}] Successfully updated with image URL`)
    }
    
  } catch (error) {
    const imageLatency = Date.now() - imageStartTime
    console.error(`[${attemptId}] Image generation failed:`, error, `latency: ${imageLatency}ms`)
    console.error(`[${attemptId}] Error details:`, error.message || error)
    console.error(`[${attemptId}] Error stack:`, error.stack || 'No stack')
    
    // 更新状态为text_only
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        status: 'text_only',
        latency_image_ms: imageLatency,
      })
      .eq('id', attemptId)
    
    if (updateError) {
      console.error(`[${attemptId}] Failed to update to text_only:`, updateError)
    } else {
      console.log(`[${attemptId}] Updated to text_only due to image generation failure`)
    }
  }
  
  console.log(`[${attemptId}] ===== FINISHED updateImageAsync =====`)
}

serve(async (req) => {
  try {
    // CORS处理
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

    const requestBody = await req.json()
    
    // 输入验证
    const validationError = validateInput(requestBody)
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { sceneId, text, installId } = requestBody

    // 频控检查
    if (!checkRateLimit(installId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 创建初始attempt记录
    const { data: attemptData, error: insertError } = await supabase
      .from('attempts')
      .insert({
        install_id: installId,
        scene_id: sceneId,
        input_text: text,
        status: 'partial'
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const attemptId = attemptData.id

    // 文本评估（带超时）
    const evalStartTime = Date.now()
    let evaluation: EvaluationResult
    
    try {
      const evalPromise = evaluateText(text, sceneId)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Evaluation timeout')), EVAL_TIMEOUT_MS)
      )
      
      evaluation = await Promise.race([evalPromise, timeoutPromise]) as EvaluationResult
    } catch (error) {
      console.error('Text evaluation failed:', error)
      
      // 更新状态为错误
      await supabase
        .from('attempts')
        .update({ status: 'error' })
        .eq('id', attemptId)
      
      return new Response(JSON.stringify({ error: 'Evaluation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const evalLatency = Date.now() - evalStartTime

    // 更新数据库记录（文本评估结果）
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        detail_score: 3, // 默认评分设为3，因为新的prompt不包含评分
        accuracy_note: evaluation.microReason,
        suggested_revision: evaluation.bestDescription,
        keywords: [], // 新prompt不包含关键词
        latency_eval_ms: evalLatency,
      })
      .eq('id', attemptId)

    if (updateError) {
      console.error('Database update error:', updateError)
    }

    // S5: 异步触发图片生成（不等待完成）
    console.log(`[${attemptId}] Triggering async image generation...`)
    
    // 调用独立的图片生成函数（不等待响应）
    const triggerImageGeneration = async () => {
      try {
        console.log(`[${attemptId}] Calling generate-image function...`)
        const generateImageUrl = `${SUPABASE_URL}/functions/v1/generate-image`
        
        const response = await fetch(generateImageUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            attemptId: attemptId,
            text: text
          })
        })
        
        if (!response.ok) {
          console.error(`[${attemptId}] Image generation trigger failed:`, response.status)
        } else {
          const result = await response.json()
          console.log(`[${attemptId}] Image generation triggered successfully:`, result)
        }
      } catch (error) {
        console.error(`[${attemptId}] Failed to trigger image generation:`, error)
      }
    }
    
    // 异步执行，不等待完成
    triggerImageGeneration().catch(error => {
      console.error(`[${attemptId}] Image generation background task error:`, error)
    })

    // 立即返回文本反馈响应（图像生成在后台进行）
    const response = {
      minimalFix: evaluation.minimalFix,
      microReason: evaluation.microReason,
      bestDescription: evaluation.bestDescription,
      encouragement: evaluation.encouragement,
      imageUrl: null,  // 图像将通过轮询获取
      attemptId: attemptId
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