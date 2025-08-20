import AsyncStorage from '@react-native-async-storage/async-storage'
import { scenes, Scene } from './scenes'

const SEEN_SCENES_KEY = 'seenSceneIds'

/**
 * 获取已查看过的场景ID列表
 */
export const getSeenSceneIds = async (): Promise<string[]> => {
  try {
    const seenIdsJson = await AsyncStorage.getItem(SEEN_SCENES_KEY)
    return seenIdsJson ? JSON.parse(seenIdsJson) : []
  } catch (error) {
    console.warn('Failed to load seen scene IDs:', error)
    return []
  }
}

/**
 * 保存已查看过的场景ID列表
 */
export const saveSeenSceneIds = async (seenIds: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(SEEN_SCENES_KEY, JSON.stringify(seenIds))
  } catch (error) {
    console.warn('Failed to save seen scene IDs:', error)
  }
}

/**
 * 添加场景ID到已查看列表
 */
export const addSeenSceneId = async (sceneId: string): Promise<void> => {
  const seenIds = await getSeenSceneIds()
  if (!seenIds.includes(sceneId)) {
    seenIds.push(sceneId)
    await saveSeenSceneIds(seenIds)
  }
}

/**
 * 清空已查看的场景列表（当所有场景都看过后重置）
 */
export const resetSeenSceneIds = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SEEN_SCENES_KEY)
  } catch (error) {
    console.warn('Failed to reset seen scene IDs:', error)
  }
}

/**
 * 获取下一个场景（非重复随机选取）
 * 如果所有场景都已查看，则重置并返回随机场景
 */
export const getNextScene = async (currentSceneId?: string): Promise<Scene> => {
  const seenIds = await getSeenSceneIds()
  
  // 过滤出未查看的场景
  const unseenScenes = scenes.filter(scene => !seenIds.includes(scene.id))
  
  // 如果没有未查看的场景，重置并从所有场景中选择
  if (unseenScenes.length === 0) {
    await resetSeenSceneIds()
    // 如果当前场景存在，避免选择同一个场景
    const availableScenes = currentSceneId 
      ? scenes.filter(scene => scene.id !== currentSceneId)
      : scenes
    
    const randomIndex = Math.floor(Math.random() * availableScenes.length)
    return availableScenes[randomIndex]
  }
  
  // 从未查看的场景中随机选择
  const randomIndex = Math.floor(Math.random() * unseenScenes.length)
  return unseenScenes[randomIndex]
}

/**
 * 获取初始场景（应用启动时）
 */
export const getInitialScene = async (): Promise<Scene> => {
  const seenIds = await getSeenSceneIds()
  
  // 如果没有查看过任何场景，返回第一个场景
  if (seenIds.length === 0) {
    return scenes[0]
  }
  
  // 否则获取下一个未查看的场景
  return getNextScene()
}