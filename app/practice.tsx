import { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Scene, getSceneImageSource, scenes } from '../constants/scenes'
import { getInitialScene, getNextScene, addSeenSceneId, getSeenSceneIds } from '../constants/sceneManager'
import { debugSceneManager } from '../constants/debugSceneManager'
import { useSubmitDescriptionMutation } from '../constants/queryClient'
import { usePracticeStore, getCanSubmit } from '../constants/practiceStore'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { BottomControlBar } from '../components/BottomControlBar'

const { width: screenWidth } = Dimensions.get('window')
const imageAspectRatio = 16 / 9
const imageHeight = screenWidth / imageAspectRatio

export default function Practice() {
  const [inputText, setInputText] = useState('')
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [isLoadingScene, setIsLoadingScene] = useState(true)
  
  // Store和mutation hooks
  const { 
    feedbackStatus, 
    resetFeedback,
    isRecording,
    lastSubmittedText,
    isSubmitting
  } = usePracticeStore()
  const submitMutation = useSubmitDescriptionMutation()
  
  // 加载初始场景
  useEffect(() => {
    loadInitialScene()
  }, [])
  
  const loadInitialScene = async () => {
    try {
      setIsLoadingScene(true)
      const scene = await getInitialScene()
      setCurrentScene(scene)
    } catch (error) {
      console.error('Failed to load initial scene:', error)
    } finally {
      setIsLoadingScene(false)
    }
  }
  
  // Word count validation
  const wordCount = inputText.trim().split(/\s+/).filter(word => word.length > 0).length
  const isValidWordCount = wordCount >= 3
  const hasError = inputText.length > 0 && !isValidWordCount
  // Check if text has changed from last submission
  const hasTextChanged = inputText.trim() !== lastSubmittedText.trim()
  const baseCanSubmit = usePracticeStore(state => getCanSubmit(state, wordCount))
  const canSubmit = baseCanSubmit && hasTextChanged

  const handleSubmit = async () => {
    if (!canSubmit || !currentScene) return
    
    // 使用mutation提交
    submitMutation.mutate({
      sceneId: currentScene.id,
      text: inputText,
    })
    
    // 标记当前场景为已查看
    await addSeenSceneId(currentScene.id)
  }


  const handleNextImage = async () => {
    if (!currentScene) return
    
    try {
      setIsLoadingScene(true)
      
      // 获取下一个场景
      const nextScene = await getNextScene(currentScene.id)
      setCurrentScene(nextScene)
      
      // 重置状态
      setInputText('')
      resetFeedback()
      // Clear last submitted text when moving to new scene
      usePracticeStore.getState().setLastSubmittedText('')
      
    } catch (error) {
      console.error('Failed to load next scene:', error)
    } finally {
      setIsLoadingScene(false)
    }
  }

  const handlePrevScene = async () => {
    if (!currentScene) return
    
    try {
      setIsLoadingScene(true)
      
      // Get previous scene (random from seen scenes or just another random scene)
      const seenIds = await getSeenSceneIds()
      const availableScenes = seenIds.length > 1 
        ? scenes.filter(s => seenIds.includes(s.id) && s.id !== currentScene.id)
        : scenes.filter(s => s.id !== currentScene.id)
      
      if (availableScenes.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableScenes.length)
        setCurrentScene(availableScenes[randomIndex])
      } else {
        // Fallback to any different scene
        const nextScene = await getNextScene(currentScene.id)
        setCurrentScene(nextScene)
      }
      
      // 重置状态
      setInputText('')
      resetFeedback()
      // Clear last submitted text when moving to new scene
      usePracticeStore.getState().setLastSubmittedText('')
      
    } catch (error) {
      console.error('Failed to load previous scene:', error)
    } finally {
      setIsLoadingScene(false)
    }
  }

  const handleVoiceSubmit = (text: string) => {
    // Set the text and immediately submit
    setInputText(text)
    
    // Check word count for the voice input
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    const voiceWordCount = words.length
    
    // Get last submitted text from store
    const store = usePracticeStore.getState()
    const isDifferentFromLast = text.trim() !== store.lastSubmittedText.trim()
    
    if (voiceWordCount >= 3 && currentScene && isDifferentFromLast) {
      // Submit immediately if valid and different from last submission
      submitMutation.mutate({
        sceneId: currentScene.id,
        text: text,
      })
      
      // Mark scene as seen
      addSeenSceneId(currentScene.id)
    }
  }

  const handleDebugTest = async () => {
    console.log('Starting debug test...')
    const result = await debugSceneManager()
    console.log('Debug test result:', result)
    
    // 重新加载初始场景
    await loadInitialScene()
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Area */}
          <View style={styles.imageContainer}>
            {isLoadingScene || !currentScene ? (
              <View style={[styles.imagePlaceholder, { height: imageHeight }]}>
                <Text style={styles.placeholderText}>Loading scene...</Text>
              </View>
            ) : (
              <Image
                source={getSceneImageSource(currentScene)}
                style={[styles.sceneImage, { height: imageHeight }]}
                contentFit="cover"
                transition={200}
              />
            )}
          </View>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Describe this scene in English in 2–3 sentences."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
                autoCorrect={false}
                spellCheck={false}
                editable={!isLoadingScene && !isRecording}
              />
              <TouchableOpacity
                style={[
                  styles.sendIconButton,
                  (!canSubmit || isLoadingScene || isRecording) && styles.sendIconButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isLoadingScene || isRecording}
              >
                <Text style={[
                  styles.sendIconText,
                  (!canSubmit || isLoadingScene || isRecording) && styles.sendIconTextDisabled
                ]}>›</Text>
              </TouchableOpacity>
            </View>
            
            {/* Word Count Display */}
            <View style={styles.wordCountContainer}>
              <Text style={[
                styles.wordCountText,
                { color: hasError ? '#FF3B30' : isValidWordCount ? '#34C759' : '#666' }
              ]}>
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {hasError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Please use at least 3 words
              </Text>
            </View>
          )}


          {/* 反馈面板 */}
          <FeedbackPanel />

          {/* Debug Button - Remove in production */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={handleDebugTest}
              disabled={isLoadingScene}
            >
              <Text style={styles.debugButtonText}>
                Debug: Test Scene Manager
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Fixed Bottom Control Bar */}
      <BottomControlBar
        onPrevScene={handlePrevScene}
        onNextScene={handleNextImage}
        onVoiceSubmit={handleVoiceSubmit}
        disabled={isLoadingScene || feedbackStatus === 'submitting'}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100, // Add space for fixed bottom bar
  },
  imageContainer: {
    marginBottom: 16,
  },
  sceneImage: {
    width: '100%',
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  textInput: {
    fontSize: 16,
    color: '#1D1D1F',
    minHeight: 44,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  sendIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendIconButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendIconText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    transform: [{ translateY: -2 }],
  },
  sendIconTextDisabled: {
    color: '#8E8E93',
  },
  wordCountContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  wordCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
})