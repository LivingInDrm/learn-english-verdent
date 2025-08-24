import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { Audio } from 'expo-av'
import { transcribeAudio } from '../constants/api'
import { usePracticeStore } from '../constants/practiceStore'

interface BottomControlBarProps {
  onPrevScene: () => void
  onNextScene: () => void
  onVoiceSubmit: (text: string) => void
  disabled?: boolean
}

export function BottomControlBar({
  onPrevScene,
  onNextScene,
  onVoiceSubmit,
  disabled = false,
}: BottomControlBarProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { isSubmitting } = usePracticeStore()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        stopRecording()
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        if (!disabled) {
          Alert.alert('Permission Denied', 'Please allow microphone access to use voice input.')
        }
        return
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      })

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      recordingRef.current = recording
      setIsRecording(true)

      // Set max recording duration (60 seconds)
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording()
      }, 60000)

    } catch (error) {
      console.error('Failed to start recording:', error)
      Alert.alert('Recording Error', 'Could not start recording. Please try again.')
    }
  }

  const stopRecording = async () => {
    if (!recordingRef.current) return

    try {
      setIsRecording(false)
      
      // Clear timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }

      // Stop and unload recording
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) {
        console.error('No recording URI')
        return
      }

      // Start transcription
      setIsTranscribing(true)
      await transcribeAndSubmit(uri)

    } catch (error) {
      console.error('Failed to stop recording:', error)
      Alert.alert('Recording Error', 'Could not process recording. Please try again.')
      setIsTranscribing(false)
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      })
    }
  }

  const transcribeAndSubmit = async (uri: string) => {
    try {
      // Read the audio file as base64
      const response = await fetch(uri)
      const blob = await response.blob()
      
      // Convert to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string
          // Remove data URL prefix to get pure base64
          const base64Data = base64.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(blob)
      
      const base64Audio = await base64Promise

      // Determine MIME type based on platform
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/wav'

      // Transcribe audio
      const transcriptionResult = await transcribeAudio(base64Audio, mimeType)
      
      if (transcriptionResult?.text) {
        // Auto-submit the transcribed text in a separate try-catch
        try {
          onVoiceSubmit(transcriptionResult.text)
        } catch (submitError) {
          console.error('Error during voice submit:', submitError)
          // Don't show alert for submit errors, just log them
        }
      } else {
        // Don't show alert here, it's handled in the catch block if there's an error
        console.log('No speech detected in recording')
      }

    } catch (error) {
      console.error('Transcription failed:', error)
      // Only show alert for actual transcription failures, not submit errors
      if (error?.message?.includes('transcribe') || error?.message?.includes('audio')) {
        Alert.alert('Transcription Error', 'Could not transcribe audio. Please try again.')
      }
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleVoicePress = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const isDisabled = disabled || isSubmitting || isTranscribing

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.sideButton, isDisabled && styles.buttonDisabled]}
        onPress={onPrevScene}
        disabled={isDisabled}
      >
        <Text style={[styles.buttonText, styles.sideButtonText]}>← Prev</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.voiceButton,
          isRecording && styles.voiceButtonRecording,
          isTranscribing && styles.voiceButtonTranscribing,
          isDisabled && !isRecording && !isTranscribing && styles.buttonDisabled,
        ]}
        onPress={handleVoicePress}
        disabled={isDisabled && !isRecording}
      >
        {isTranscribing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isRecording ? (
          <View style={styles.voiceContent}>
            <Text style={styles.voiceIcon}>⏹</Text>
            <Text style={styles.voiceLabel}>Stop</Text>
          </View>
        ) : (
          <View style={styles.voiceContent}>
            <Text style={styles.voiceIcon}>🎤</Text>
            <Text style={styles.voiceLabel}>Voice</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.sideButton, isDisabled && styles.buttonDisabled]}
        onPress={onNextScene}
        disabled={isDisabled}
      >
        <Text style={[styles.buttonText, styles.sideButtonText]}>Next →</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12, // Account for iPhone safe area
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  voiceButton: {
    flex: 1.5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#0051D5',
  },
  voiceButtonRecording: {
    backgroundColor: '#FF3B30',
    borderColor: '#D70015',
  },
  voiceButtonTranscribing: {
    backgroundColor: '#FF9500',
    borderColor: '#C77400',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sideButtonText: {
    color: '#007AFF',
  },
  voiceContent: {
    alignItems: 'center',
    gap: 2,
  },
  voiceIcon: {
    fontSize: 20,
  },
  voiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})