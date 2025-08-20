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
import { Scene, getSceneImageSource } from '../constants/scenes'
import { getInitialScene, getNextScene, addSeenSceneId } from '../constants/sceneManager'
import { debugSceneManager } from '../constants/debugSceneManager'
import { useSubmitDescriptionMutation } from '../constants/queryClient'
import { usePracticeStore, getCanSubmit } from '../constants/practiceStore'
import { FeedbackPanel } from '../components/FeedbackPanel'

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
    lastSubmittedText, 
    resetFeedback 
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
  const canSubmit = usePracticeStore(state => getCanSubmit(state, wordCount))

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

  const handleTryAgain = () => {
    // 恢复上次提交的文本用于编辑
    if (lastSubmittedText) {
      setInputText(lastSubmittedText)
    }
    resetFeedback()
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
      
    } catch (error) {
      console.error('Failed to load next scene:', error)
    } finally {
      setIsLoadingScene(false)
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Describe this scene in English in 2–3 sentences."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              autoCorrect={false}
              spellCheck={false}
              editable={!isLoadingScene}
            />
            
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

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: canSubmit && !isLoadingScene ? '#007AFF' : '#C7C7CC' }
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isLoadingScene}
            >
              <Text style={[
                styles.sendButtonText,
                { color: canSubmit && !isLoadingScene ? '#FFFFFF' : '#8E8E93' }
              ]}>
                Send
              </Text>
            </TouchableOpacity>

            {/* Next Image Button - 只在没有反馈时显示 */}
            {feedbackStatus === 'idle' && (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  { backgroundColor: isLoadingScene ? '#C7C7CC' : '#34C759' }
                ]}
                onPress={handleNextImage}
                disabled={isLoadingScene}
              >
                <Text style={[
                  styles.nextButtonText,
                  { color: isLoadingScene ? '#8E8E93' : '#FFFFFF' }
                ]}>
                  Next Image
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 反馈面板 */}
          <FeedbackPanel
            onTryAgain={handleTryAgain}
            onNextImage={handleNextImage}
          />

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
  textInput: {
    fontSize: 16,
    color: '#1D1D1F',
    minHeight: 44,
    textAlignVertical: 'top',
    lineHeight: 22,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sendButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
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