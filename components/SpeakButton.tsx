import React, { useState, useRef, useEffect } from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
} from 'react-native'
import { Audio } from 'expo-av'
import { textToSpeech } from '../constants/api'

interface SpeakButtonProps {
  text: string
  disabled?: boolean
  size?: 'small' | 'medium'
  style?: any
}

export function SpeakButton({ 
  text, 
  disabled = false,
  size = 'small',
  style 
}: SpeakButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const soundRef = useRef<Audio.Sound | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync()
      }
    }
  }, [])

  const handlePress = async () => {
    if (disabled || !text) return

    // If currently playing, stop
    if (isPlaying && soundRef.current) {
      await stopPlayback()
      return
    }

    // Start new playback
    await startPlayback()
  }

  const startPlayback = async () => {
    try {
      setIsLoading(true)

      // Clean up any existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }

      // Get TTS audio from API
      const response = await textToSpeech(text)
      
      if (!response.audioUrl) {
        console.error('No audio URL received from TTS API')
        return
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      })

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: response.audioUrl },
        { shouldPlay: true }
      )

      soundRef.current = sound
      setIsPlaying(true)
      setIsLoading(false)

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false)
          // Cleanup after playback
          sound.unloadAsync()
          soundRef.current = null
        }
      })

    } catch (error) {
      console.error('TTS playback error:', error)
      setIsLoading(false)
      setIsPlaying(false)
    }
  }

  const stopPlayback = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }
      setIsPlaying(false)
    } catch (error) {
      console.error('Stop playback error:', error)
    }
  }

  const buttonSize = size === 'small' ? 32 : 40
  const iconSize = size === 'small' ? 16 : 20

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
        },
        isPlaying && styles.buttonPlaying,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <Text style={[styles.speakerEmoji, { fontSize: iconSize }]}>
          {isPlaying ? '🔊' : '🔈'}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  buttonPlaying: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    borderColor: '#C7C7CC',
    opacity: 0.5,
  },
  speakerEmoji: {
    textAlign: 'center',
  },
})