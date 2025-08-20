#!/bin/bash

# S3 阶段验证脚本

echo "🚀 开始 S3 阶段验证..."

# 1. 检查依赖安装
echo "📦 检查依赖..."
if npm list @supabase/supabase-js @tanstack/react-query zustand expo-crypto > /dev/null 2>&1; then
  echo "✅ 所有必需依赖已安装"
else
  echo "❌ 缺少必需依赖"
  exit 1
fi

# 2. TypeScript 编译检查
echo "🔍 TypeScript 编译检查..."
if npx tsc --noEmit; then
  echo "✅ TypeScript 编译通过"
else
  echo "❌ TypeScript 编译失败"
  exit 1
fi

# 3. 检查关键文件存在
echo "📁 检查关键文件..."
files=(
  "constants/supabase.ts"
  "constants/api.ts"
  "constants/practiceStore.ts"
  "constants/queryClient.ts"
  "components/FeedbackPanel.tsx"
  "supabase/functions/submit/index.ts"
  "supabase/functions/attempts/index.ts"
  "supabase/migrations/001_create_attempts_table.sql"
)

for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    echo "✅ $file"
  else
    echo "❌ 缺少文件: $file"
    exit 1
  fi
done

# 4. 检查环境配置
echo "⚙️  检查环境配置..."
if [[ -f ".env.example" ]]; then
  echo "✅ 环境变量模板存在"
else
  echo "❌ 缺少 .env.example"
fi

# 5. 检查 Supabase 配置
echo "🗄️  检查 Supabase 配置..."
if [[ -f "supabase/config.toml" ]]; then
  echo "✅ Supabase 配置存在"
else
  echo "❌ 缺少 Supabase 配置"
fi

echo ""
echo "🎉 S3 阶段验证完成！"
echo ""
echo "📋 下一步部署清单："
echo "1. 创建 Supabase 项目"
echo "2. 设置环境变量（参考 .env.example）"
echo "3. 运行数据库迁移"
echo "4. 部署 Edge Functions"
echo "5. 配置 OpenAI API Key"
echo "6. 测试端到端流程"
echo ""
echo "📖 详细指南请参考: S3_DEPLOYMENT_GUIDE.md"