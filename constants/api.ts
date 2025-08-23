import { supabase, SubmitRequest, SubmitResponse, AttemptStatusResponse } from './supabase'
import * as Crypto from 'expo-crypto'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 获取或创建设备唯一标识符
export async function getInstallId(): Promise<string> {
  const INSTALL_ID_KEY = 'installId'
  
  try {
    let installId = await AsyncStorage.getItem(INSTALL_ID_KEY)
    
    if (!installId) {
      installId = Crypto.randomUUID()
      await AsyncStorage.setItem(INSTALL_ID_KEY, installId)
    }
    
    return installId
  } catch (error) {
    console.error('Failed to get/create install ID:', error)
    // 如果存储失败，生成临时ID
    return Crypto.randomUUID()
  }
}

// API基础URL配置
const getApiBaseUrl = () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL environment variable is not set')
  }
  return `${supabaseUrl}/functions/v1`
}

// API错误类型
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// API请求通用处理
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.error || `HTTP ${response.status}`,
        response.status,
        data.code
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // 网络错误或其他错误
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    )
  }
}

// 提交用户描述进行评估
export async function submitDescription(
  sceneId: string,
  text: string
): Promise<SubmitResponse> {
  const installId = await getInstallId()
  
  const request: SubmitRequest & { installId: string } = {
    sceneId,
    text,
    installId,
  }

  return apiRequest<SubmitResponse>('/submit', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// 查询attempt状态（为S4阶段准备）
export async function getAttemptStatus(
  attemptId: string
): Promise<AttemptStatusResponse> {
  return apiRequest<AttemptStatusResponse>(`/attempts/${attemptId}`, {
    method: 'GET',
  })
}

// 检查网络连接状态
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

// Audio transcription interface
export interface TranscribeRequest {
  audio: string // Base64 encoded audio data
  mimeType: string // MIME type of the audio
}

export interface TranscribeResponse {
  text: string
  language?: string
  duration?: number
}

// Transcribe audio to text using OpenAI Whisper
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string
): Promise<TranscribeResponse> {
  const request: TranscribeRequest = {
    audio: audioBase64,
    mimeType,
  }

  return apiRequest<TranscribeResponse>('/transcribe', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Text-to-speech interface
export interface TTSRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number
}

export interface TTSResponse {
  audioUrl: string
  duration?: number
}

// Convert text to speech using OpenAI TTS
export async function textToSpeech(
  text: string,
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
  speed?: number
): Promise<TTSResponse> {
  const request: TTSRequest = {
    text,
    voice: voice || 'nova',
    speed: speed || 1.0,
  }

  return apiRequest<TTSResponse>('/tts', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// 重试机制配置
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
}

// 带重试的API调用
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_RETRY_CONFIG, ...config }
  
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // 最后一次尝试失败，抛出错误
      if (attempt === maxRetries) {
        break
      }
      
      // 如果是客户端错误（4xx），不重试
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        break
      }
      
      // 计算延迟时间（指数退避）
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}