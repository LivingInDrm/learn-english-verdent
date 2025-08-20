#!/usr/bin/env node

/**
 * S4轮询功能测试脚本
 * 测试提交描述后轮询attemptId状态的端到端流程
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

async function submitDescription() {
  console.log('🚀 S4轮询功能测试开始...\n')

  try {
    // 1. 提交描述
    console.log('1️⃣  提交描述...')
    const submitData = await apiRequest('/submit', {
      method: 'POST',
      body: JSON.stringify({
        sceneId: 'scene_001',
        text: 'A peaceful park scene with green trees, colorful flowers, and people walking along the paths on a sunny day.',
        installId: 'test-polling-' + Date.now()
      })
    })

    const { attemptId } = submitData
    if (!attemptId) {
      throw new Error('No attemptId returned from submit')
    }

    console.log(`✅ 提交成功，attemptId: ${attemptId}`)
    console.log(`📝 文本反馈已获得，imageUrl: ${submitData.imageUrl}\n`)

    // 2. 开始轮询
    console.log('2️⃣  开始轮询attemptId状态...')
    let pollCount = 0
    const maxPolls = 8 // 最多轮询16秒（每2秒一次）
    
    while (pollCount < maxPolls) {
      pollCount++
      console.log(`🔄 轮询 #${pollCount} (${pollCount * 2}秒)...`)
      
      try {
        const statusData = await apiRequest(`/attempts/${attemptId}`)
        console.log(`📊 状态: ${statusData.status}, imageUrl: ${statusData.imageUrl ? 'YES' : 'NO'}`)

        if (statusData.status === 'ok' && statusData.imageUrl) {
          console.log('✅ 图片生成完成！')
          return { success: true, finalStatus: 'ok', pollCount }
        } else if (statusData.status === 'text_only') {
          console.log('⚠️  图片生成失败，仅文本反馈')
          return { success: true, finalStatus: 'text_only', pollCount }
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

    console.log('⏰ 轮询超时（16秒），测试完成')
    return { success: true, finalStatus: 'timeout', pollCount }

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    return { success: false, error: error.message }
  }
}

async function testMultipleCalls() {
  console.log('\n3️⃣  测试频控机制...')
  
  const requests = []
  for (let i = 0; i < 3; i++) {
    requests.push(
      apiRequest('/submit', {
        method: 'POST',
        body: JSON.stringify({
          sceneId: 'scene_002',
          text: `Test description number ${i + 1} with more than ten words to pass validation.`,
          installId: 'rate-limit-test'
        })
      }).catch(error => ({ error: error.message }))
    )
  }

  const results = await Promise.all(requests)
  console.log('频控测试结果:', results)
}

// 运行测试
async function main() {
  const result = await submitDescription()
  console.log('\n📋 S4测试结果:', result)

  // 测试频控（可选）
  // await testMultipleCalls()

  console.log('\n🎉 S4轮询功能测试完成！')
}

main().catch(console.error)