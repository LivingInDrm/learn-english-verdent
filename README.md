# Describe & See - English Learning App

## S1 Implementation - Practice Screen Offline Version

This is the S1 implementation of the "Describe & See" English learning app, featuring a basic practice screen with scene display and word count validation.

### Features Implemented (S1)

- ✅ Practice screen with basic layout (image area, input area, error area, send button)
- ✅ Task prompt display: "Describe this scene in English in 2–3 sentences."
- ✅ Scene image display with 16:9 aspect ratio (15 real photorealistic images integrated)
- ✅ Real-time word count validation (<10 words shows error, ≥10 words enables send)
- ✅ Responsive design for different screen sizes
- ✅ Offline functionality (no backend required)

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on device/simulator:**
   - **iOS:** Press `i` in terminal or scan QR code with Camera app
   - **Android:** Press `a` in terminal or scan QR code with Expo Go app
   - **Web:** Press `w` in terminal or open http://localhost:8081 in browser

### Demo Path (3-5 steps)

1. Launch app → See home screen
2. Tap "Start Practice" → Navigate to `/practice`
3. See scene image + task prompt
4. Type description with <10 words → See error message + disabled send button
5. Type description with ≥10 words → See word count update + enabled send button

### Tech Stack

- **Expo SDK 53** with React Native 0.79
- **expo-router v5** for navigation
- **TypeScript** for type safety
- **expo-image** for optimized image handling
- **react-native-safe-area-context** for safe area support

### Project Structure

```
app/
├── _layout.tsx          # Root layout with navigation
├── index.tsx            # Home screen
└── practice.tsx         # Practice screen (main feature)
constants/
└── scenes.ts            # Scene data and image management
assets/
└── scenes/              # Scene images (placeholder for S1)
```

### Next Steps (S2+)

- Scene rotation with local storage
- Backend integration for text evaluation
- Image generation from descriptions
- Progressive response protocol
- Error handling and retry logic

### Validation Checklist

- [x] Works offline without network connection
- [x] Consistent layout on iOS and Android
- [x] Word count validation functions correctly
- [x] TypeScript compilation without errors
- [x] Navigation between screens works