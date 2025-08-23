import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// 环境变量配置
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

// 常量配置
const TTS_TIMEOUT_MS = 30000 // 30秒超时
const MAX_TEXT_LENGTH = 4096 // OpenAI TTS 最大字符限制

interface TTSRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
}

interface TTSResponse {
  audioUrl: string
  duration?: number
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

    // 验证OpenAI API密钥
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return new Response(JSON.stringify({ error: 'Service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const requestBody: TTSRequest = await req.json()

    // 输入验证
    if (!requestBody.text || typeof requestBody.text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 清理文本 - 移除markdown格式符号
    let cleanText = requestBody.text
      .replace(/\*\*/g, '') // 移除加粗标记
      .replace(/~~(.+?)~~/g, '$1') // 保留删除线内容但移除标记
      .replace(/\*/g, '') // 移除其他星号
      .trim()

    // 检查文本长度
    if (cleanText.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ 
        error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (cleanText.length === 0) {
      return new Response(JSON.stringify({ error: 'Text cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 设置默认参数
    const voice = requestBody.voice || 'nova' // nova 是比较自然的女声
    const speed = requestBody.speed || 1.0

    console.log('Generating speech:', {
      textLength: cleanText.length,
      voice,
      speed,
    })

    // 调用OpenAI TTS API
    const ttsPromise = fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // 使用标准质量模型，响应更快
        input: cleanText,
        voice: voice,
        speed: speed,
        response_format: 'mp3',
      })
    })

    // 添加超时控制
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TTS generation timeout')), TTS_TIMEOUT_MS)
    )

    const response = await Promise.race([ttsPromise, timeoutPromise]) as Response

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI TTS API error:', response.status, errorData)
      return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 获取音频数据
    const audioData = await response.arrayBuffer()
    
    // 将音频数据转换为base64
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)))
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`

    console.log('TTS generation successful, audio size:', audioData.byteLength)

    // 返回音频数据URL
    const result: TTSResponse = {
      audioUrl: audioDataUrl,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Unexpected error in TTS function:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})