import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Supabase配置 - 在实际部署时需要设置环境变量
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// 数据库类型定义
export interface AttemptRecord {
  id: string
  install_id: string
  user_id: string | null
  scene_id: string
  input_text: string
  detail_score: number | null
  accuracy_note: string | null
  suggested_revision: string | null
  keywords: string[] | null
  image_url: string | null
  status: 'partial' | 'ok' | 'text_only' | 'blocked' | 'error'
  latency_eval_ms: number | null
  latency_image_ms: number | null
  created_at: string
}

// API请求/响应类型
export interface SubmitRequest {
  sceneId: string
  text: string
}

export interface SubmitResponse {
  accuracyNote: string
  detailScore: number
  suggestedRevision: string
  keywords: string[]
  imageUrl: string | null
  attemptId: string
}

export interface AttemptStatusResponse {
  imageUrl: string | null
  status: 'partial' | 'ok' | 'text_only' | 'blocked' | 'error'
}