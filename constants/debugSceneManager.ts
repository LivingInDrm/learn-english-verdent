import { getSeenSceneIds, getNextScene, getInitialScene, resetSeenSceneIds } from '../constants/sceneManager'

/**
 * 调试工具：测试场景管理功能
 */
export const debugSceneManager = async () => {
  console.log('=== Scene Manager Debug Test ===')
  
  // 1. 重置状态
  await resetSeenSceneIds()
  console.log('1. Reset seen scenes')
  
  // 2. 获取初始场景
  const initialScene = await getInitialScene()
  console.log('2. Initial scene:', initialScene.id, initialScene.fileName)
  
  // 3. 模拟浏览15个场景
  let currentScene = initialScene
  const viewedScenes = [currentScene.id]
  
  for (let i = 1; i < 15; i++) {
    currentScene = await getNextScene(currentScene.id)
    viewedScenes.push(currentScene.id)
    console.log(`${i + 1}. Next scene:`, currentScene.id, currentScene.fileName)
  }
  
  // 4. 检查是否有重复
  const uniqueScenes = new Set(viewedScenes)
  console.log('4. Total unique scenes viewed:', uniqueScenes.size, '/ Expected: 15')
  console.log('   All scenes unique?', uniqueScenes.size === 15)
  
  // 5. 第16次应该重置并选择新场景
  const scene16 = await getNextScene(currentScene.id)
  console.log('5. 16th scene (after reset):', scene16.id, scene16.fileName)
  
  // 6. 检查重置后的状态
  const seenAfterReset = await getSeenSceneIds()
  console.log('6. Seen scenes after reset:', seenAfterReset.length, 'should be 0')
  
  console.log('=== Scene Manager Debug Test Complete ===')
  
  return {
    totalUnique: uniqueScenes.size,
    expectedUnique: 15,
    allUnique: uniqueScenes.size === 15,
    resetWorked: seenAfterReset.length === 0,
    viewedScenes
  }
}