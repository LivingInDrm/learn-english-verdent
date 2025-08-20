# S3 开发阶段部署和测试指南

## 前提条件

1. **Supabase 项目设置**
   - 创建 Supabase 项目：https://app.supabase.com
   - 获取项目 URL 和 anon key
   - 获取 OpenAI API key

2. **环境变量配置**
   ```bash
   # 复制环境变量模板
   cp .env.example .env.local
   
   # 编辑 .env.local，填入实际值：
   EXPO_PUBLIC_SUPABASE_URL=你的supabase项目url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=你的supabase_anon_key
   ```

## 部署步骤

### 1. 数据库设置

```bash
# 安装 Supabase CLI
npm install -g @supabase/cli

# 登录 Supabase
supabase login

# 关联项目
supabase link --project-ref your-project-ref

# 运行数据库迁移
supabase db push
```

### 2. Edge Functions 部署

```bash
# 部署 submit 函数
supabase functions deploy submit

# 部署 attempts 函数  
supabase functions deploy attempts

# 设置环境变量
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 3. 权限配置

在 Supabase Dashboard -> Authentication -> RLS policies 中创建策略：

```sql
-- 允许匿名用户插入 attempts
CREATE POLICY "Allow anonymous insert" ON "public"."attempts"
AS PERMISSIVE FOR INSERT
TO anon
WITH CHECK (true);

-- 允许匿名用户查询自己的 attempts
CREATE POLICY "Allow anonymous select own" ON "public"."attempts"
AS PERMISSIVE FOR SELECT
TO anon
USING (install_id = current_setting('request.jwt.claims.install_id', true));
```

## 测试流程

### 1. 本地开发测试

```bash
# 启动本地 Supabase
supabase start

# 启动 Expo 开发服务器
npm start

# 在 .env.local 中使用本地 Supabase URL
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
```

### 2. 端到端测试

1. **基础功能测试**
   - 输入 <10 词：应显示错误
   - 输入 ≥10 词：Send 按钮启用
   - 点击 Send：显示加载状态

2. **API 调用测试**
   - 检查网络请求：正确的 payload
   - 检查响应：文本反馈正确显示
   - 检查数据库：attempts 记录正确创建

3. **错误处理测试**
   - 网络断开：显示网络错误
   - 服务器错误：显示服务器错误
   - 频控测试：连续快速点击应被限制

### 3. 性能测试

- **目标指标**
  - 文本评估：≤ 2s
  - 网络延迟：≤ 500ms
  - UI 响应：≤ 100ms

## 调试工具

### 1. Supabase Dashboard

- **Logs**: 查看 Edge Function 日志
- **Database**: 检查 attempts 表数据
- **API**: 测试 API 端点

### 2. React Native Debugger

```bash
# 启用远程调试
# 在模拟器中摇晃设备 -> Debug -> Remote Debugger
```

### 3. Expo 开发工具

- **Network**: 检查 API 请求
- **Performance**: 检查渲染性能
- **Logs**: 查看控制台输出

## 常见问题

### 1. CORS 错误
确保 Edge Functions 包含正确的 CORS 头：
```typescript
'Access-Control-Allow-Origin': '*'
```

### 2. 环境变量未生效
- 检查变量名是否以 `EXPO_PUBLIC_` 开头
- 重启 Expo 开发服务器

### 3. 数据库连接错误
- 检查 Supabase 项目 URL 和 key
- 确认数据库迁移已执行

### 4. OpenAI API 错误
- 检查 API key 是否正确
- 确认账户有足够余额
- 检查请求格式是否符合 OpenAI API 规范

## 监控和日志

1. **Supabase Logs**
   ```bash
   supabase functions logs submit
   ```

2. **客户端日志**
   - 使用 React Native Flipper
   - 检查 Metro bundler 输出

3. **性能监控**
   - 记录 API 响应时间
   - 监控内存使用情况
   - 跟踪错误率

## S3 完成标准

- ✅ 输入验证工作正常
- ✅ API 调用成功返回文本反馈
- ✅ UI 状态正确更新
- ✅ 错误处理覆盖主要场景
- ✅ 数据库记录正确创建
- ✅ 频控机制生效
- ✅ 性能满足目标指标