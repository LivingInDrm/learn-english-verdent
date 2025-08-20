import { QueryClient, useMutation } from '@tanstack/react-query'
import { submitDescription, withRetry } from './api'
import { usePracticeStore } from './practiceStore'

// 创建QueryClient实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // API错误不重试
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // 最多重试2次
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 10分钟
    },
    mutations: {
      retry: false, // mutation默认不重试
    },
  },
})

// 查询键工厂
export const queryKeys = {
  attempts: (attemptId: string) => ['attempts', attemptId] as const,
  submissions: () => ['submissions'] as const,
}

// 提交描述的mutation配置
export const useSubmitDescriptionMutation = () => {
  const { 
    startSubmission, 
    handleSubmissionSuccess, 
    handleSubmissionError 
  } = usePracticeStore()

  return useMutation({
    mutationFn: async ({ sceneId, text }: { sceneId: string; text: string }) => {
      return withRetry(() => submitDescription(sceneId, text), {
        maxRetries: 2,
        baseDelay: 1000,
      })
    },
    onMutate: ({ text }) => {
      startSubmission(text)
    },
    onSuccess: (response) => {
      handleSubmissionSuccess(response)
    },
    onError: (error) => {
      handleSubmissionError(error)
    },
  })
}