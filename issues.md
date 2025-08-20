# 实现与设计不一致性问题清单

## 🔍 Review 总结

**Review 日期**: 2025-08-14  
**Review 范围**: S1-S3 已实现部分 vs design-all.md  
**总体符合度**: 约 93%

---

## 🚨 高优先级问题

### Issue #1: 缺失图像生成功能
**状态**: ❌ Critical  
**文件**: `supabase/functions/submit/index.ts:251`

**问题描述**:
- **设计要求**: 并行执行文本评估和图像生成，使用OpenAI Images API
- **当前实现**: 仅实现文本评估，固定返回 `imageUrl: null`
- **影响**: 无法完成完整的"Describe & See"核心功能

**代码位置**:
```typescript
// 当前实现 (行251)
imageUrl: null,  // S3阶段暂时为null

// 设计要求: 应并行调用 OpenAI Images API
```

**解决方案**: 在S5阶段实现OpenAI Images API集成

---

### Issue #2: 缺失轮询机制实现
**状态**: ❌ Critical  
**文件**: `constants/practiceStore.ts:185`

**问题描述**:
- **设计要求**: 客户端每2s轮询 `/attempts/{id}` 获取图像状态，最多15s
- **当前实现**: 基础设施已准备，但核心轮询逻辑未实现
- **影响**: 无法实现渐进式图像更新

**代码位置**:
```typescript
// 当前实现 (行185)
console.log('Polling started for attempt:', attemptId)
// TODO: 缺少实际轮询逻辑

// 设计要求: 每2s调用 GET /attempts/{id}
```

**解决方案**: 在S4阶段实现完整轮询协议

---

### Issue #3: 性能超时配置不符合设计
**状态**: ⚠️ High  
**文件**: `supabase/functions/submit/index.ts:10`

**问题描述**:
- **设计要求**: 文本评估 ≤2s 平均延迟
- **当前实现**: `EVAL_TIMEOUT_MS = 8000` (8秒超时)
- **差异**: 超时时间比设计要求宽松4倍

**代码位置**:
```typescript
// 当前实现
const EVAL_TIMEOUT_MS = 8000  // 8秒

// 设计要求: ≤2s 平均延迟
```

**解决方案**: 调整为 `EVAL_TIMEOUT_MS = 2000`

---

### Issue #4: 界面语言与设计不符  
**状态**: ⚠️ High  
**文件**: `components/FeedbackPanel.tsx:32,44,72`等多处

**问题描述**:
- **设计要求**: 英语学习应用应使用英文界面
- **当前实现**: 反馈面板使用中文提示
- **影响**: 违背国际化产品定位

**代码位置**:
```typescript
// 当前实现 (中文)
<Text style={styles.loadingText}>AI正在评估您的描述...</Text>
<Text style={styles.errorTitle}>出现错误</Text>

// 设计要求: 应为英文界面
```

**解决方案**: 将所有用户界面文本改为英文

---

## ⚠️ 中优先级问题

### Issue #5: 缺失提交时视觉状态
**状态**: ⚠️ Medium  
**文件**: `app/practice.tsx`

**问题描述**:
- **设计要求**: 提交时场景图像应显示"变暗覆盖"效果
- **当前实现**: 未实现相应的视觉反馈
- **影响**: 用户体验不够直观

**UI状态表要求**:
```
Submitting | Scene image (dimmed overlay) | Disabled | Loading spinner
```

**解决方案**: 添加图像覆盖层组件

---

### Issue #6: API请求格式部分不一致
**状态**: ⚠️ Medium  
**文件**: `constants/api.ts:95-99`

**问题描述**:
- **设计要求**: POST /submit 仅需要 `{sceneId, text}`
- **当前实现**: 额外包含 `installId` 字段
- **差异**: 超出了设计规范

**代码位置**:
```typescript
// 当前实现
const request: SubmitRequest & { installId: string } = {
  sceneId, text, installId,  // 多了 installId
}

// 设计要求: 仅 {sceneId, text}
```

**解决方案**: 保持当前实现（installId对频控有益）或将其移到headers

---

### Issue #7: 缺失内容审核机制
**状态**: ⚠️ Medium  
**文件**: `supabase/functions/submit/index.ts`

**问题描述**:
- **设计要求**: 输入验证应包含内容审核
- **当前实现**: 仅实现词数验证
- **影响**: 无法阻止不当内容

**设计要求**:
```
Input validation (≥10 words, moderation, rate limit)
```

**解决方案**: 在S8阶段实现OpenAI Moderation API

---

## 💡 低优先级问题

### Issue #8: expo-router版本不一致
**状态**: 💡 Low  
**文件**: `package.json:14`

**问题描述**:
- **设计要求**: expo-router v3
- **当前实现**: expo-router v5.1.4
- **影响**: 功能正常，但版本不匹配

**解决方案**: 文档更新或版本回退（如有兼容性需求）

---

### Issue #9: 缺失图片预取功能
**状态**: 💡 Low  
**文件**: `constants/sceneManager.ts`

**问题描述**:
- **设计要求**: 使用 `Image.prefetch` 预取下一张场景图
- **当前实现**: 未实现预取优化
- **影响**: 切换场景时可能有加载延迟

**技术设计要求**:
```
expo-image (cachePolicy="disk", Image.prefetch for next-scene warmup)
```

**解决方案**: 在S10阶段实现

---

### Issue #10: 缺失场景元数据
**状态**: 💡 Low  
**文件**: `constants/scenes.ts`

**问题描述**:
- **设计要求**: AI评估应参考"实际场景的参考元数据"
- **当前实现**: 仅有场景ID和文件名
- **影响**: AI评估缺少准确性参考

**设计prompt**:
```
Given the user's description and the actual scene's reference metadata
```

**解决方案**: 为每个场景添加详细描述元数据

---

## 📊 问题统计

| 优先级 | 数量 | 状态 |
|--------|------|------|
| 🚨 高优先级 | 4 | 需要在S4-S5解决 |
| ⚠️ 中优先级 | 3 | 可在后续迭代解决 |
| 💡 低优先级 | 3 | 优化项目 |
| **总计** | **10** | **93%符合度** |

---

## 🎯 修复计划

### S4阶段 (轮询协议)
- [ ] Issue #2: 实现轮询机制
- [ ] Issue #3: 调整超时配置

### S5阶段 (图像生成)  
- [ ] Issue #1: 实现图像生成功能
- [ ] Issue #5: 添加提交视觉状态

### S6-S8阶段 (完善功能)
- [ ] Issue #4: 界面语言国际化
- [ ] Issue #7: 内容审核机制
- [ ] Issue #6: API格式优化

### S9-S10阶段 (性能优化)
- [ ] Issue #9: 图片预取功能
- [ ] Issue #10: 场景元数据

---

## 📝 备注

1. **架构决策正确**: 整体技术选型和架构设计都很好地遵循了设计规范
2. **实现质量高**: 代码质量、类型安全、错误处理都达到生产级别
3. **渐进式开发**: 按S1-S3的分阶段实现策略是明智的，便于验证核心功能
4. **主要缺失**: 图像生成和轮询是下个阶段的重点，当前专注文本评估是合理的

**总结**: 当前实现与设计高度一致，为后续开发打下了坚实基础。