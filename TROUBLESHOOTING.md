# React Native 常见错误解决方案

## "Maximum update depth exceeded" 错误

### 🚨 错误症状
- 应用启动时显示红屏
- 错误信息："Maximum update depth exceeded"
- 通常在组件更新周期中发生

### 🔍 常见原因
1. **状态选择器循环**: 在Zustand或Redux中使用了导致重复渲染的选择器
2. **useEffect依赖循环**: useEffect的依赖数组中包含了每次渲染都会变化的对象
3. **直接在渲染中调用setState**: 在组件渲染过程中直接调用状态更新函数
4. **父子组件状态循环**: 父子组件之间的状态更新形成循环

### ✅ 解决方案

#### 1. 简化状态选择器
```typescript
// ❌ 错误：复杂的选择器可能导致循环
const { status, data, error } = usePracticeStore(selectFeedbackState)

// ✅ 正确：直接访问store
const store = usePracticeStore()
// 或者分别选择需要的状态
const status = usePracticeStore(state => state.feedbackStatus)
```

#### 2. 检查useEffect依赖
```typescript
// ❌ 错误：对象依赖每次都是新的
useEffect(() => {
  // 某些操作
}, [{ someConfig }])

// ✅ 正确：使用稳定的基本类型
useEffect(() => {
  // 某些操作
}, [someValue])
```

#### 3. 避免在渲染中调用状态更新
```typescript
// ❌ 错误：在渲染中直接调用
function Component() {
  if (someCondition) {
    setState(newValue) // 这会导致循环
  }
  return <View />
}

// ✅ 正确：在useEffect中调用
function Component() {
  useEffect(() => {
    if (someCondition) {
      setState(newValue)
    }
  }, [someCondition])
  return <View />
}
```

### 🛠️ 调试步骤
1. **检查错误堆栈**: 找到导致错误的具体组件和行号
2. **简化组件**: 逐步移除复杂逻辑，确定问题所在
3. **检查状态订阅**: 确保没有不必要的重复订阅
4. **重置缓存**: 运行`expo start --reset-cache`

## 其他常见错误

### Network Request Failed
- 检查Supabase URL是否正确
- 确认本地Supabase是否运行
- 验证网络连接

### Cannot connect to Metro
- 重启Metro bundler
- 清理node_modules: `rm -rf node_modules && npm install`
- 检查端口是否被占用

### TypeScript编译错误
- 运行`npx tsc --noEmit`检查错误
- 确保类型定义正确
- 检查导入路径是否正确

### 🚀 快速修复命令
```bash
# 重置所有缓存并重启
pkill -f "expo|metro"
rm -rf node_modules
npm install
expo start --reset-cache

# 检查Supabase状态
supabase status

# 重启Supabase
supabase restart
```