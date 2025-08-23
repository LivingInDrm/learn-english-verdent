import React, { useState, useEffect, useRef } from 'react'
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { Audio } from 'expo-av'

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void
  onRecordingStateChange?: (isRecording: boolean) => void
  disabled?: boolean
  isTranscribing?: boolean
}

export function VoiceInputButton({
  onTranscriptionComplete,
  onRecordingStateChange,
  disabled = false,
  isTranscribing = false,
}: VoiceInputButtonProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [permissionResponse, setPermissionResponse] = useState<Audio.PermissionResponse | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const recordingDuration = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Request microphone permissions on mount
  useEffect(() => {
    requestPermissions()
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Recording animation
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isRecording, pulseAnim])

  const requestPermissions = async () => {
    try {
      const response = await Audio.requestPermissionsAsync()
      setPermissionResponse(response)
      
      if (!response.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access to use voice input.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // On iOS, this would open app settings
              // Implementation varies by platform
            }},
          ]
        )
      }
    } catch (error) {
      console.error('Failed to request audio permissions:', error)
    }
  }

  const startRecording = async () => {
    try {
      // Check permissions
      if (!permissionResponse?.granted) {
        await requestPermissions()
        return
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      })

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension: '.m4a',
            outputFormat: Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: Audio.AndroidAudioEncoder.AAC,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        }
      )

      setRecording(recording)
      setIsRecording(true)
      onRecordingStateChange?.(true)

      // Start duration timer
      recordingDuration.current = 0
      timerRef.current = setInterval(() => {
        recordingDuration.current += 1
        
        // Auto-stop after 60 seconds
        if (recordingDuration.current >= 60) {
          stopRecording()
        }
      }, 1000)

      console.log('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.')
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    try {
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      console.log('Stopping recording...')
      
      setIsRecording(false)
      onRecordingStateChange?.(false)

      // Stop and unload the recording
      await recording.stopAndUnloadAsync()
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      })

      // Get the recording URI
      const uri = recording.getURI()
      console.log('Recording stopped and stored at', uri)

      if (uri) {
        // Convert to base64 and send for transcription
        await transcribeAudio(uri)
      }

      setRecording(null)
    } catch (error) {
      console.error('Failed to stop recording:', error)
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.')
    }
  }

  const transcribeAudio = async (uri: string) => {
    try {
      // Set transcribing state
      onRecordingStateChange?.(false)
      
      // Read the audio file as base64
      const response = await fetch(uri)
      const blob = await response.blob()
      
      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        
        // Extract base64 data (remove data URL prefix)
        const base64Data = base64Audio.split(',')[1]
        
        // Determine MIME type based on platform
        const mimeType = Platform.select({
          ios: 'audio/m4a',
          android: 'audio/m4a',
          web: 'audio/webm',
          default: 'audio/m4a',
        })

        // Call transcription API (will be implemented in api.ts)
        const { transcribeAudio } = await import('../constants/api')
        const result = await transcribeAudio(base64Data, mimeType)
        
        if (result.text) {
          onTranscriptionComplete(result.text)
        } else {
          Alert.alert('Transcription Error', 'No text was transcribed. Please try again.')
        }
      }

      reader.onerror = () => {
        console.error('Failed to read audio file')
        Alert.alert('Error', 'Failed to process audio recording.')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again.')
    }
  }

  const handlePress = () => {
    if (disabled || isTranscribing) return
    
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Icon component for microphone
  const MicrophoneIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, { color, fontSize: isRecording ? 16 : 20 }]}>
        {isRecording ? '⏹' : '🎙️'}
      </Text>
    </View>
  )

  return (
    <Animated.View
      style={[
        styles.container,
        isRecording && {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          disabled && styles.buttonDisabled,
          isTranscribing && styles.buttonTranscribing,
        ]}
        onPress={handlePress}
        disabled={disabled || isTranscribing}
        activeOpacity={0.7}
      >
        {isTranscribing ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <MicrophoneIcon
            color={isRecording ? '#FFFFFF' : (disabled ? '#8E8E93' : '#007AFF')}
          />
        )}
      </TouchableOpacity>
      
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonRecording: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#F2F2F7',
    borderColor: '#C7C7CC',
    opacity: 0.6,
  },
  buttonTranscribing: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
})