import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// 环境变量配置
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

// 常量配置
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB - OpenAI Whisper limit
const ALLOWED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/wav']
const TRANSCRIBE_TIMEOUT_MS = 30000 // 30秒超时

interface TranscribeRequest {
  audio: string // Base64 encoded audio data
  mimeType: string // MIME type of the audio
}

interface TranscribeResponse {
  text: string
  language?: string
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

    const requestBody: TranscribeRequest = await req.json()

    // 输入验证
    if (!requestBody.audio) {
      return new Response(JSON.stringify({ error: 'Audio data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!requestBody.mimeType || !ALLOWED_FORMATS.includes(requestBody.mimeType)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid audio format. Supported formats: mp3, mp4, m4a, webm, wav' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 将Base64解码为二进制数据
    let audioBuffer: Uint8Array
    try {
      // Remove data URL prefix if present
      const base64Data = requestBody.audio.replace(/^data:audio\/\w+;base64,/, '')
      const binaryString = atob(base64Data)
      audioBuffer = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        audioBuffer[i] = binaryString.charCodeAt(i)
      }
    } catch (error) {
      console.error('Failed to decode audio data:', error)
      return new Response(JSON.stringify({ error: 'Invalid audio data format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 检查文件大小
    if (audioBuffer.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: `Audio file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('Transcribing audio:', {
      size: audioBuffer.length,
      mimeType: requestBody.mimeType,
    })

    // 准备FormData用于Whisper API
    const formData = new FormData()
    
    // 根据MIME类型确定文件扩展名
    const getFileExtension = (mimeType: string) => {
      switch (mimeType) {
        case 'audio/mpeg':
        case 'audio/mp3':
          return 'mp3'
        case 'audio/mp4':
          return 'mp4'
        case 'audio/m4a':
          return 'm4a'
        case 'audio/webm':
          return 'webm'
        case 'audio/wav':
          return 'wav'
        default:
          return 'mp3'
      }
    }

    const fileExtension = getFileExtension(requestBody.mimeType)
    const audioBlob = new Blob([audioBuffer], { type: requestBody.mimeType })
    formData.append('file', audioBlob, `audio.${fileExtension}`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en') // 指定英语以提高准确性
    formData.append('response_format', 'verbose_json') // 获取更多信息

    // 调用OpenAI Whisper API
    const transcribePromise = fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    // 添加超时控制
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Transcription timeout')), TRANSCRIBE_TIMEOUT_MS)
    )

    const response = await Promise.race([transcribePromise, timeoutPromise]) as Response

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI Whisper API error:', response.status, errorData)
      return new Response(JSON.stringify({ error: 'Transcription failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    console.log('Transcription successful:', {
      text: data.text?.substring(0, 100) + '...',
      language: data.language,
      duration: data.duration,
    })

    // 返回转录结果
    const result: TranscribeResponse = {
      text: data.text || '',
      language: data.language,
      duration: data.duration,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Unexpected error in transcribe function:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})