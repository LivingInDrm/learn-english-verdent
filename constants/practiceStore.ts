import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { SubmitResponse, AttemptStatusResponse } from './supabase'

// 反馈状态枚举
export type FeedbackStatus = 'idle' | 'submitting' | 'text_ready' | 'completed' | 'error'

// 反馈数据接口
export interface FeedbackData {
  accuracyNote: string
  detailScore: number
  suggestedRevision: string
  keywords: string[]
  imageUrl?: string | null
  attemptId?: string
}

// 错误信息接口
export interface ErrorInfo {
  message: string
  type: 'network' | 'validation' | 'server' | 'unknown'
  code?: string
}

// Store状态接口
interface PracticeState {
  // 反馈相关状态
  feedbackStatus: FeedbackStatus
  feedbackData: FeedbackData | null
  error: ErrorInfo | null
  
  // 提交相关状态
  isSubmitting: boolean
  lastSubmittedText: string
  
  // 轮询相关状态（为S4准备）
  pollingAttemptId: string | null
  pollingTimer: NodeJS.Timeout | null
  
  // Actions
  setFeedbackStatus: (status: FeedbackStatus) => void
  setFeedbackData: (data: FeedbackData | null) => void
  setError: (error: ErrorInfo | null) => void
  setSubmitting: (isSubmitting: boolean) => void
  setLastSubmittedText: (text: string) => void
  
  // 高级actions
  startSubmission: (text: string) => void
  handleSubmissionSuccess: (response: SubmitResponse) => void
  handleSubmissionError: (error: any) => void
  resetFeedback: () => void
  
  // 轮询相关actions（为S4准备）
  startPolling: (attemptId: string) => void
  stopPolling: () => void
  updatePollingResult: (result: AttemptStatusResponse) => void
}

export const usePracticeStore = create<PracticeState>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    feedbackStatus: 'idle',
    feedbackData: null,
    error: null,
    isSubmitting: false,
    lastSubmittedText: '',
    pollingAttemptId: null,
    pollingTimer: null,

    // 基础setters
    setFeedbackStatus: (status) => set({ feedbackStatus: status }),
    setFeedbackData: (data) => set({ feedbackData: data }),
    setError: (error) => set({ error }),
    setSubmitting: (isSubmitting) => set({ isSubmitting }),
    setLastSubmittedText: (text) => set({ lastSubmittedText: text }),

    // 开始提交流程
    startSubmission: (text) => {
      set({
        feedbackStatus: 'submitting',
        isSubmitting: true,
        lastSubmittedText: text,
        error: null,
        feedbackData: null,
      })
    },

    // 处理提交成功
    handleSubmissionSuccess: (response) => {
      set({
        feedbackStatus: 'text_ready',
        isSubmitting: false,
        feedbackData: {
          accuracyNote: response.accuracyNote,
          detailScore: response.detailScore,
          suggestedRevision: response.suggestedRevision,
          keywords: response.keywords,
          imageUrl: response.imageUrl,
          attemptId: response.attemptId,
        },
        error: null,
      })
      
      // 如果有attemptId且imageUrl为null，开始轮询（为S4准备）
      if (response.attemptId && !response.imageUrl) {
        get().startPolling(response.attemptId)
      } else if (response.imageUrl) {
        // 如果已有图片，直接标记为完成
        set({ feedbackStatus: 'completed' })
      }
    },

    // 处理提交错误
    handleSubmissionError: (error) => {
      let errorInfo: ErrorInfo
      
      if (error?.status) {
        // API错误
        switch (error.status) {
          case 429:
            errorInfo = {
              message: '请求过于频繁，请稍后再试',
              type: 'server',
              code: 'RATE_LIMIT'
            }
            break
          case 400:
            errorInfo = {
              message: error.message || '输入内容有误，请检查后重试',
              type: 'validation'
            }
            break
          case 500:
            errorInfo = {
              message: '服务器繁忙，请稍后再试',
              type: 'server'
            }
            break
          default:
            errorInfo = {
              message: error.message || '发生未知错误',
              type: 'server'
            }
        }
      } else if (error?.message?.includes('Network')) {
        // 网络错误
        errorInfo = {
          message: '网络连接失败，请检查网络后重试',
          type: 'network'
        }
      } else {
        // 其他错误
        errorInfo = {
          message: error?.message || '发生未知错误',
          type: 'unknown'
        }
      }
      
      set({
        feedbackStatus: 'error',
        isSubmitting: false,
        error: errorInfo,
      })
    },

    // 重置反馈状态
    resetFeedback: () => {
      get().stopPolling()
      set({
        feedbackStatus: 'idle',
        feedbackData: null,
        error: null,
        isSubmitting: false,
      })
    },

    // 开始轮询（S4实现）
    startPolling: (attemptId) => {
      // 停止现有轮询
      get().stopPolling()
      
      set({ pollingAttemptId: attemptId })
      
      console.log('Polling started for attempt:', attemptId)
      
      // 启动轮询定时器，每2秒查询一次
      const timer = setInterval(async () => {
        try {
          const { getAttemptStatus } = await import('./api')
          const result = await getAttemptStatus(attemptId)
          
          console.log('Polling result:', result)
          get().updatePollingResult(result)
          
        } catch (error) {
          console.error('Polling error:', error)
          // 轮询错误不影响主流程，继续轮询
        }
      }, 2000)
      
      set({ pollingTimer: timer })
      
      // 2分钟后自动停止轮询并设置为text_only状态
      setTimeout(() => {
        const { pollingAttemptId: currentAttemptId } = get()
        if (currentAttemptId === attemptId) {
          console.log('Polling timeout after 2 minutes - setting to text_only')
          get().updatePollingResult({ status: 'text_only', imageUrl: null })
        }
      }, 120000)
    },

    // 停止轮询
    stopPolling: () => {
      const { pollingTimer } = get()
      if (pollingTimer) {
        clearInterval(pollingTimer)
      }
      set({
        pollingAttemptId: null,
        pollingTimer: null,
      })
    },

    // 更新轮询结果（为S4准备）
    updatePollingResult: (result) => {
      const currentData = get().feedbackData
      if (!currentData) return
      
      if (result.status === 'ok' && result.imageUrl) {
        set({
          feedbackStatus: 'completed',
          feedbackData: {
            ...currentData,
            imageUrl: result.imageUrl,
          },
        })
        get().stopPolling()
      } else if (result.status === 'text_only') {
        set({
          feedbackStatus: 'completed',
          feedbackData: {
            ...currentData,
            imageUrl: null,
          },
        })
        get().stopPolling()
      }
      // 如果status仍为partial，继续轮询
    },
  }))
)

// 选择器工具函数
export const selectFeedbackState = (state: PracticeState) => ({
  status: state.feedbackStatus,
  data: state.feedbackData,
  error: state.error,
  isSubmitting: state.isSubmitting,
})

export const selectSubmissionState = (state: PracticeState) => ({
  isSubmitting: state.isSubmitting,
  lastSubmittedText: state.lastSubmittedText,
})

// 计算属性
export const getCanRetry = (state: PracticeState): boolean => {
  return state.feedbackStatus === 'error' && !state.isSubmitting
}

export const getCanSubmit = (state: PracticeState, wordCount: number): boolean => {
  return !state.isSubmitting && wordCount >= 10
}