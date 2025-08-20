#!/usr/bin/env node

/**
 * S5图像生成功能测试脚本
 * 测试提交描述后图像生成的完整端到端流程
 */

const BASE_URL = 'http://127.0.0.1:54321/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      ...options.headers,
    },
  })

  const data = await response.json()
  console.log(`${options.method || 'GET'} ${endpoint}:`, { status: response.status, data })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
  }

  return data
}

async function testImageGeneration() {
  console.log('🚀 S5图像生成功能测试开始...\n')

  try {
    // 1. 提交描述
    console.log('1️⃣  提交描述...')
    const submitData = await apiRequest('/submit', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene_001',
        text: 'A serene mountain landscape with snow-capped peaks reflecting in a crystal clear lake, surrounded by pine trees and wildflowers on a sunny summer day.',
        installId: 'test-image-gen-' + Date.now()
      })
    })

    const { attemptId } = submitData
    if (!attemptId) {
      throw new Error('No attemptId returned from submit')
    }

    console.log(`✅ 提交成功，attemptId: ${attemptId}`)
    console.log(`📝 文本反馈已获得，imageUrl: ${submitData.imageUrl}`)
    console.log(`🎯 详细度评分: ${submitData.detailScore}/5`)
    console.log(`💡 建议: ${submitData.suggestedRevision}\n`)

    // 2. 开始轮询，重点关注图像生成
    console.log('2️⃣  开始轮询图像生成状态...')
    let pollCount = 0
    const maxPolls = 15 // 最多轮询30秒（每2秒一次）
    
    while (pollCount < maxPolls) {
      pollCount++
      console.log(`🔄 轮询 #${pollCount} (${pollCount * 2}秒)...`)
      
      try {
        const statusData = await apiRequest(`/attempts/${attemptId}`)
        console.log(`📊 状态: ${statusData.status}, imageUrl: ${statusData.imageUrl ? 'YES' : 'NO'}`)

        if (statusData.status === 'ok' && statusData.imageUrl) {
          console.log('✅ 图片生成完成！')
          console.log(`🖼️  图片URL: ${statusData.imageUrl}`)
          return { 
            success: true, 
            finalStatus: 'ok', 
            pollCount, 
            imageUrl: statusData.imageUrl,
            textFeedback: submitData
          }
        } else if (statusData.status === 'text_only') {
          console.log('⚠️  图片生成失败，仅文本反馈')
          return { 
            success: true, 
            finalStatus: 'text_only', 
            pollCount,
            textFeedback: submitData 
          }
        } else if (statusData.status === 'error') {
          console.log('❌ 处理出错')
          return { success: false, finalStatus: 'error', pollCount }
        }

        // 等待2秒后继续轮询
        if (pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`❌ 轮询 #${pollCount} 失败:`, error.message)
      }
    }

    console.log('⏰ 轮询超时（30秒），图像生成可能仍在进行中')
    return { success: true, finalStatus: 'timeout', pollCount }

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return { success: false, error: error.message }
  }
}

async function testMultipleRequests() {
  console.log('\n3️⃣  测试多个并发请求...')
  
  const descriptions = [
    'A peaceful garden with colorful flowers blooming under the warm afternoon sun.',
    'A bustling city street at night with bright neon signs and people walking.',
    'A cozy coffee shop interior with wooden tables and soft lighting.'
  ]

  const requests = descriptions.map((text, i) => 
    apiRequest('/submit', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: `scene_00${i + 1}`,
        text,
        installId: `concurrent-test-${i + 1}`
      })
    }).then(result => ({ index: i, result }))
    .catch(error => ({ index: i, error: error.message }))
  )

  const results = await Promise.all(requests)
  results.forEach(({ index, result, error }) => {
    if (error) {
      console.log(`❌ 请求 ${index + 1} 失败: ${error}`)
    } else {
      console.log(`✅ 请求 ${index + 1} 成功: attemptId ${result.attemptId}`)
    }
  })
}

// 运行测试
async function main() {
  const result = await testImageGeneration()
  console.log('\n📋 S5测试结果:', result)

  if (result.success && result.imageUrl) {
    console.log('\n🎉 图像生成功能测试成功！')
    console.log('🖼️  可以在前端看到生成的图片')
  } else if (result.success && result.finalStatus === 'text_only') {
    console.log('\n⚠️  图像生成超时，但文本反馈正常')
  } else {
    console.log('\n❌ 测试未完全成功，需要检查问题')
  }

  // 测试并发（可选）
  // await testMultipleRequests()

  console.log('\n🎉 S5图像生成功能测试完成！')
}

main().catch(console.error)