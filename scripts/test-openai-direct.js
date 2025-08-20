#!/usr/bin/env node

/**
 * 直接测试 OpenAI API 调用
 */

// 从环境变量获取 API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  console.error('❌ 请设置环境变量 OPENAI_API_KEY')
  console.log('例如: export OPENAI_API_KEY=sk-...')
  process.exit(1)
}

console.log(`🔑 OpenAI API Key 长度: ${OPENAI_API_KEY.length}`)
console.log(`🔑 API Key 前缀: ${OPENAI_API_KEY.substring(0, 10)}...`)

async function testTextGeneration() {
  console.log('\n📝 测试文本生成 (GPT-4)...')
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in 5 words' }
        ],
        max_tokens: 20,
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ GPT-4 API 错误:', response.status)
      console.error('错误详情:', data)
      return false
    }

    console.log('✅ GPT-4 响应成功')
    console.log('响应内容:', data.choices[0]?.message?.content)
    return true
  } catch (error) {
    console.error('❌ GPT-4 请求失败:', error.message)
    return false
  }
}

async function testImageGeneration() {
  console.log('\n🖼️  测试图片生成 (DALL-E 3)...')
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: 'A simple red circle on white background',
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ DALL-E 3 API 错误:', response.status)
      console.error('错误详情:', data)
      return false
    }

    console.log('✅ DALL-E 3 响应成功')
    console.log('图片 URL:', data.data[0]?.url)
    return true
  } catch (error) {
    console.error('❌ DALL-E 3 请求失败:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 开始测试 OpenAI API...\n')
  
  // 测试文本生成
  const textSuccess = await testTextGeneration()
  
  // 测试图片生成
  const imageSuccess = await testImageGeneration()
  
  console.log('\n📊 测试结果:')
  console.log(`文本生成 (GPT-4): ${textSuccess ? '✅ 成功' : '❌ 失败'}`)
  console.log(`图片生成 (DALL-E 3): ${imageSuccess ? '✅ 成功' : '❌ 失败'}`)
  
  if (!textSuccess || !imageSuccess) {
    console.log('\n💡 可能的问题:')
    console.log('1. API key 无效或过期')
    console.log('2. API key 没有相应模型的权限')
    console.log('3. OpenAI 账户余额不足')
    console.log('4. API key 格式错误（应该以 sk- 开头）')
  }
}

main().catch(console.error)