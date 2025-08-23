# Voice Input Feature

## Overview
Added voice input functionality to allow users to describe scenes using speech recognition powered by OpenAI Whisper API.

## Components Implemented

### 1. Frontend Components
- **VoiceInputButton.tsx**: Reusable voice recording button component
  - Handles microphone permissions
  - Records audio using expo-av
  - Shows recording indicator with pulse animation
  - Converts audio to base64 for transmission
  - Max recording duration: 60 seconds

### 2. Backend Services
- **supabase/functions/transcribe**: Edge Function for audio transcription
  - Accepts base64-encoded audio data
  - Supports multiple audio formats (mp3, m4a, webm, wav)
  - Uses OpenAI Whisper API for transcription
  - Returns transcribed English text

### 3. State Management
- Updated **practiceStore.ts** with:
  - `isRecording`: Track recording state
  - `isTranscribing`: Track transcription state
  - `setRecording()`: Update recording state
  - `setTranscribing()`: Update transcription state

### 4. API Integration
- Added to **api.ts**:
  - `transcribeAudio()`: Method to call transcription endpoint
  - Type definitions for transcription request/response

### 5. UI Integration
- Updated **practice.tsx**:
  - Added voice button next to text input
  - Disabled text editing while recording
  - Auto-populate text field with transcription
  - Allow editing transcribed text before submission

## User Workflow
1. Tap microphone button to start recording
2. Speak description in English
3. Tap stop button (or auto-stop after 60 seconds)
4. Wait for transcription (loading indicator shown)
5. Review/edit transcribed text
6. Submit for evaluation

## Deployment Requirements
```bash
# Deploy the Edge Function
supabase functions deploy transcribe

# Verify OpenAI key is set (uses same key as text/image generation)
supabase secrets list
```

## Technical Details
- **Audio Format**: m4a (iOS/Android), webm (Web)
- **Transcription Model**: OpenAI Whisper (whisper-1)
- **Language**: English-optimized transcription
- **Max File Size**: 25MB
- **Timeout**: 30 seconds for transcription

## Permissions Required
- Microphone access for audio recording
- Handled gracefully with user prompts if denied

## Error Handling
- Network failures during transcription
- Permission denied scenarios
- Recording failures
- Timeout protection
- User-friendly error messages

## Testing
Run test script to verify setup:
```bash
export $(cat .env.local | grep -v '^#' | xargs) && node scripts/test-voice-input.js
```