# 项目启动配置检查清单

## ❌ 发现的配置缺失问题

### 1. 环境变量配置文件缺失
- ❌ `.env.local` 文件不存在
- ❌ 缺少实际的Supabase URL和anon key
- ❌ 缺少OpenAI API key配置

### 2. Supabase项目配置缺失
- ❌ 没有实际的Supabase项目
- ❌ 数据库表未创建
- ❌ Edge Functions未部署
- ❌ RLS权限策略未配置

### 3. 本地开发配置缺失
- ❌ Supabase CLI未安装
- ❌ 本地Supabase未启动

## ✅ 快速启动配置步骤

### 第一步：创建环境配置文件

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，填入以下内容：
# （注意：这些是示例值，需要替换为实际值）
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 第二步：设置Supabase项目

#### 选项A：使用云端Supabase（推荐生产环境）

1. **创建Supabase项目**
   ```bash
   # 访问 https://app.supabase.com
   # 点击 "New Project"
   # 记录 Project URL 和 anon key
   ```

2. **安装Supabase CLI**
   ```bash
   npm install -g @supabase/cli
   ```

3. **配置项目**
   ```bash
   # 登录
   supabase login
   
   # 关联项目
   supabase link --project-ref YOUR_PROJECT_REF
   
   # 运行数据库迁移
   supabase db push
   
   # 部署Edge Functions
   supabase functions deploy submit
   supabase functions deploy attempts
   
   # 设置OpenAI API key
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```

#### 选项B：使用本地Supabase（推荐开发环境）

1. **启动本地Supabase**
   ```bash
   # 安装Supabase CLI
   npm install -g @supabase/cli
   
   # 启动本地实例
   supabase start
   ```

2. **使用本地配置**
   ```bash
   # 在 .env.local 中使用本地配置
   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJy9KOVdh8kO6UVgOLCp-V7ZQTU0IKOJg
   ```

### 第三步：获取OpenAI API Key

1. **注册OpenAI账户**
   - 访问 https://platform.openai.com
   - 创建账户并验证

2. **创建API Key**
   - 进入 API Keys 页面
   - 点击 "Create new secret key"
   - 复制生成的key（sk-...开头）

3. **配置API Key**
   ```bash
   # 云端Supabase
   supabase secrets set OPENAI_API_KEY=sk-your-key-here
   
   # 本地Supabase（在Edge Function中会自动从环境变量读取）
   export OPENAI_API_KEY=sk-your-key-here
   ```

## 🔧 快速验证脚本

创建以下脚本来验证配置：

```bash
#!/bin/bash
# quick-setup-check.sh

echo "🔍 检查项目配置..."

# 检查环境文件
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local 文件不存在"
    echo "💡 运行：cp .env.example .env.local"
    exit 1
fi

# 检查环境变量
source .env.local
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ "$EXPO_PUBLIC_SUPABASE_URL" = "your_supabase_project_url" ]; then
    echo "❌ SUPABASE_URL 未配置"
    exit 1
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ] || [ "$EXPO_PUBLIC_SUPABASE_ANON_KEY" = "your_supabase_anon_key" ]; then
    echo "❌ SUPABASE_ANON_KEY 未配置"
    exit 1
fi

echo "✅ 环境变量配置正确"

# 测试Supabase连接
if curl -f "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/" >/dev/null 2>&1; then
    echo "✅ Supabase 连接正常"
else
    echo "❌ Supabase 连接失败"
    exit 1
fi

echo "🎉 配置检查通过！可以启动项目了"
```

## 📱 启动项目

配置完成后：

```bash
# 启动开发服务器
npm start

# 或者在特定端口
npm start -- --port 8082
```

## 🚨 常见配置错误

1. **环境变量未生效**
   - 确保变量名以 `EXPO_PUBLIC_` 开头
   - 重启Expo开发服务器

2. **Supabase连接失败**
   - 检查URL格式：https://xxx.supabase.co
   - 确认anon key正确

3. **OpenAI API调用失败**
   - 检查API key格式：sk-开头
   - 确认账户有余额
   - 验证API key权限

4. **数据库权限错误**
   - 检查RLS策略是否正确设置
   - 确认表已创建

## 📋 最小可运行配置

如果只想快速测试，最少需要：

1. `.env.local` 文件（复制自.env.example）
2. 有效的Supabase URL和anon key
3. OpenAI API key（在Supabase secrets中设置）
4. 创建attempts表
5. 部署Edge Functions