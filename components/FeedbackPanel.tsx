import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { usePracticeStore } from '../constants/practiceStore'
import { SpeakButton } from './SpeakButton'

const { width: screenWidth } = Dimensions.get('window')
const generatedImageAspectRatio = 16 / 9
const generatedImageHeight = (screenWidth - 64) / generatedImageAspectRatio // 减去容器padding

interface FeedbackPanelProps {}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = () => {
  const store = usePracticeStore()
  const [isReasonExpanded, setIsReasonExpanded] = useState(false)
  
  // 如果没有反馈状态，不显示面板
  if (store.feedbackStatus === 'idle') {
    return null
  }

  // 提交中状态
  if (store.feedbackStatus === 'submitting' || store.isSubmitting) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>AI正在评估您的描述...</Text>
        </View>
      </View>
    )
  }

  // 错误状态
  if (store.feedbackStatus === 'error' && store.error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>出现错误</Text>
          <Text style={styles.errorMessage}>{store.error.message}</Text>
        </View>
      </View>
    )
  }

  // 有反馈数据的状态
  if ((store.feedbackStatus === 'text_ready' || store.feedbackStatus === 'completed') && store.feedbackData) {
    return (
      <View style={styles.container}>
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>AI反馈</Text>
          
          {/* 最小修正 */}
          {store.feedbackData.minimalFix && (
            <View style={styles.correctionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.correctionLabel}>✏️ Minimal Fix</Text>
                <SpeakButton 
                  text={store.feedbackData.minimalFix}
                  size="small"
                />
              </View>
              <Text style={styles.correctionText}>{store.feedbackData.minimalFix}</Text>
            </View>
          )}

          {/* 错误解释 - 可折叠 */}
          {store.feedbackData.microReason && (
            <TouchableOpacity 
              style={styles.reasonContainer}
              onPress={() => setIsReasonExpanded(!isReasonExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.reasonHeader}>
                <Text style={styles.reasonLabel}>💡 Why This Correction</Text>
                <Text style={styles.expandIcon}>{isReasonExpanded ? '▼' : '▶'}</Text>
              </View>
              {isReasonExpanded && (
                <Text style={styles.reasonText}>{store.feedbackData.microReason}</Text>
              )}
              {!isReasonExpanded && (
                <Text style={styles.reasonTextCollapsed} numberOfLines={1}>
                  {store.feedbackData.microReason}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* 最佳描述 */}
          {store.feedbackData.bestDescription && (
            <View style={styles.bestContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.bestLabel}>🌟 Best Description</Text>
                <SpeakButton 
                  text={store.feedbackData.bestDescription}
                  size="small"
                />
              </View>
              <Text style={styles.bestText}>{store.feedbackData.bestDescription}</Text>
            </View>
          )}


          {/* 生成的图片显示 */}
          {store.feedbackStatus === 'completed' && store.feedbackData.imageUrl && (
            <View style={styles.generatedImageContainer}>
              <Text style={styles.generatedImageLabel}>AI生成图片</Text>
              <Image
                source={{ uri: store.feedbackData.imageUrl }}
                style={[styles.generatedImage, { height: generatedImageHeight }]}
                contentFit="cover"
                transition={300}
                cachePolicy="disk"
              />
            </View>
          )}

          {/* 图片状态指示 */}
          {store.feedbackStatus === 'text_ready' && (
            <View style={styles.imageStatusContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.imageStatusText}>AI图片生成中...</Text>
            </View>
          )}

          {/* 图片生成失败状态 */}
          {store.feedbackStatus === 'completed' && !store.feedbackData.imageUrl && (
            <View style={styles.imageUnavailableContainer}>
              <Text style={styles.imageUnavailableText}>📷 图片生成暂时不可用</Text>
              <Text style={styles.imageUnavailableSubtext}>您可以重新尝试或继续下一张图片</Text>
            </View>
          )}

        </View>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // 加载状态
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  
  // 错误状态
  errorContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  
  // 反馈内容
  feedbackContainer: {
    gap: 16,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
  },
  
  // Section header for items with speak button
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  // 最小修正
  correctionContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
  },
  correctionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  correctionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // 错误解释
  reasonContainer: {
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
    padding: 12,
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6A1B9A',
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginTop: 4,
  },
  reasonTextCollapsed: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    opacity: 0.7,
  },
  
  // 最佳描述
  bestContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
  },
  bestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  bestText: {
    fontSize: 14,
    color: '#1B5E20',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // 生成图片
  generatedImageContainer: {
    gap: 8,
  },
  generatedImageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  generatedImage: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },

  // 图片不可用状态
  imageUnavailableContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  imageUnavailableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  imageUnavailableSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  imageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    gap: 8,
  },
  imageStatusText: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
  },
})