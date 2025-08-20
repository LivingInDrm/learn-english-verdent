# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Describe & See" - an English learning mobile app built with React Native/Expo that helps users practice English descriptions through AI-powered feedback and image generation.

## Key Development Commands

### Starting Development
```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Platform-specific
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

### Environment Setup
```bash
# Create environment file from template
cp .env.example .env.local

# Required environment variables:
# EXPO_PUBLIC_SUPABASE_URL - Your Supabase project URL
# EXPO_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anon key
```

### Supabase Backend Setup
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy submit
supabase functions deploy attempts

# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_key
```

### Quick Setup Check
```bash
# Run configuration check script
bash scripts/quick-setup.sh
```

## Architecture Overview

### Tech Stack
- **Frontend**: React Native with Expo SDK 53
- **Navigation**: expo-router v5 (file-based routing)
- **State Management**: Zustand for local state, React Query for server state
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Services**: OpenAI GPT-4 for text evaluation, DALL-E 3 for image generation
- **TypeScript**: Strict mode enabled

### Project Structure
```
app/                    # expo-router screens
├── _layout.tsx        # Root layout with providers
├── index.tsx          # Home screen
└── practice.tsx       # Main practice screen

constants/             # Core configuration and utilities
├── api.ts            # API client functions
├── supabase.ts       # Supabase client and types
├── practiceStore.ts  # Zustand store for practice state
├── sceneManager.ts   # Scene rotation logic
└── scenes.ts         # Scene data definitions

supabase/
├── functions/        # Edge Functions (Deno)
│   ├── submit/      # Main submission endpoint
│   └── attempts/    # Polling endpoint for image status
└── migrations/      # Database schema

components/           # Reusable UI components
└── FeedbackPanel.tsx # Feedback display component
```

### Core Workflows

#### 1. Text Submission Flow (S3-S5)
1. User describes scene (≥10 words validation)
2. Submit to `/functions/v1/submit` Edge Function
3. Receive immediate text feedback (GPT-4 evaluation)
4. Background image generation starts (DALL-E 3)
5. Poll `/functions/v1/attempts` for image status
6. Display generated image when ready

#### 2. State Management Pattern
- **practiceStore** (Zustand): Manages submission state, feedback data, and polling
- **React Query**: Handles API calls with retry logic and caching
- Progressive response states: `idle` → `submitting` → `text_ready` → `completed`

#### 3. Scene Rotation
- 15 photorealistic scenes in assets/scenes/
- AsyncStorage persists last seen scene
- Automatic rotation on app restart

### Database Schema

**attempts** table:
- `id`: UUID primary key
- `install_id`: Device identifier
- `scene_id`: Current scene
- `input_text`: User's description
- `detail_score`: 1-5 rating
- `accuracy_note`: Feedback text
- `suggested_revision`: Improved version
- `keywords`: Extracted vocabulary
- `image_url`: Generated image URL
- `status`: partial|ok|text_only|blocked|error
- `latency_eval_ms`: Text evaluation time
- `latency_image_ms`: Image generation time

### Error Handling

- Network errors: Retry with exponential backoff
- Rate limiting: 6 requests per minute per device
- Image generation timeout: Falls back to text-only after 2 minutes
- User-friendly error messages in FeedbackPanel

### Testing Endpoints

Test S4 polling:
```bash
node scripts/test-s4-polling.js
```

Test S5 image generation:
```bash
node scripts/test-s5-image-gen.js
```

Verify S3 deployment:
```bash
bash scripts/verify-s3.sh
```

### Key Implementation Notes

- All network requests include proper error handling and loading states
- Image generation runs asynchronously - don't block on it
- Polling interval: 2 seconds, max duration: 2 minutes
- Scene images are 16:9 aspect ratio (1792x1024 for DALL-E 3)
- Word count validation happens client-side before submission
- Install ID is generated once per device using expo-crypto