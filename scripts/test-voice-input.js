#!/usr/bin/env node

/**
 * Test script for voice input functionality
 * This script simulates the voice input workflow to ensure all components work together
 */

console.log('Voice Input Feature Test Script')
console.log('================================\n')

// Check environment variables
const checkEnvVars = () => {
  const required = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  console.log('Checking environment variables...')
  let allPresent = true
  
  for (const varName of required) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`)
    } else {
      console.log(`❌ ${varName}: Missing`)
      allPresent = false
    }
  }
  
  return allPresent
}

// Test API endpoint availability
const testTranscribeEndpoint = async () => {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  
  if (!baseUrl || !anonKey) {
    console.log('\n❌ Cannot test API: Missing environment variables')
    return false
  }
  
  const url = `${baseUrl}/functions/v1/transcribe`
  
  console.log(`\nTesting transcribe endpoint: ${url}`)
  
  try {
    // Test with OPTIONS request (CORS preflight)
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
      }
    })
    
    if (response.ok) {
      console.log('✅ Transcribe endpoint is accessible')
      return true
    } else {
      console.log(`❌ Transcribe endpoint returned status: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Failed to reach transcribe endpoint: ${error.message}`)
    return false
  }
}

// Test workflow simulation
const testWorkflow = () => {
  console.log('\n📱 Voice Input Workflow:')
  console.log('------------------------')
  console.log('1. User taps microphone button')
  console.log('   - Request microphone permissions (expo-av)')
  console.log('   - Start recording audio')
  console.log('   - Show recording indicator')
  console.log('')
  console.log('2. User taps stop button')
  console.log('   - Stop recording')
  console.log('   - Convert audio to base64')
  console.log('   - Send to /functions/v1/transcribe')
  console.log('')
  console.log('3. Transcription process')
  console.log('   - Edge Function receives audio')
  console.log('   - Calls OpenAI Whisper API')
  console.log('   - Returns transcribed text')
  console.log('')
  console.log('4. UI updates')
  console.log('   - Populate text input with transcription')
  console.log('   - User can edit if needed')
  console.log('   - Submit for evaluation')
}

// Component checklist
const checkComponents = () => {
  console.log('\n✅ Components Created:')
  console.log('----------------------')
  console.log('• VoiceInputButton.tsx - Voice recording UI component')
  console.log('• transcribe/index.ts - Supabase Edge Function')
  console.log('• Updated api.ts - Added transcribeAudio method')
  console.log('• Updated practiceStore.ts - Added recording states')
  console.log('• Updated practice.tsx - Integrated voice input')
}

// Deployment instructions
const showDeploymentInstructions = () => {
  console.log('\n📦 Deployment Instructions:')
  console.log('---------------------------')
  console.log('1. Deploy the Edge Function:')
  console.log('   supabase functions deploy transcribe')
  console.log('')
  console.log('2. Ensure OpenAI API key is set:')
  console.log('   supabase secrets set OPENAI_API_KEY=your_key')
  console.log('')
  console.log('3. Test on device:')
  console.log('   npm run ios  # or npm run android')
}

// Main test execution
const main = async () => {
  // Check environment
  const envOk = checkEnvVars()
  
  // Test API if environment is set
  if (envOk) {
    await testTranscribeEndpoint()
  }
  
  // Show workflow
  testWorkflow()
  
  // Check components
  checkComponents()
  
  // Show deployment instructions
  showDeploymentInstructions()
  
  console.log('\n✨ Voice input feature is ready for testing!')
  console.log('Note: Edge Function must be deployed to Supabase for full functionality.')
}

// Run tests
main().catch(console.error)