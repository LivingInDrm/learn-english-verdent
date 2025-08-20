#!/bin/bash

# 快速配置检查和设置脚本

echo "🚀 学英语应用 - 快速配置检查"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_env_file() {
    if [ ! -f ".env.local" ]; then
        echo -e "${RED}❌ .env.local 文件不存在${NC}"
        echo -e "${YELLOW}💡 建议：cp .env.example .env.local${NC}"
        
        read -p "是否现在创建 .env.local 文件？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.example .env.local
            echo -e "${GREEN}✅ 已创建 .env.local 文件${NC}"
            echo -e "${YELLOW}⚠️  请编辑 .env.local 填入实际的配置值${NC}"
        fi
        return 1
    else
        echo -e "${GREEN}✅ .env.local 文件存在${NC}"
        return 0
    fi
}

check_env_vars() {
    if [ -f ".env.local" ]; then
        # 读取环境变量
        export $(cat .env.local | grep -v '^#' | xargs)
        
        # 检查Supabase URL
        if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ "$EXPO_PUBLIC_SUPABASE_URL" = "your_supabase_project_url" ]; then
            echo -e "${RED}❌ EXPO_PUBLIC_SUPABASE_URL 未正确配置${NC}"
            echo -e "${YELLOW}💡 需要设置为实际的 Supabase 项目 URL${NC}"
            return 1
        else
            echo -e "${GREEN}✅ EXPO_PUBLIC_SUPABASE_URL 已配置${NC}"
        fi
        
        # 检查Supabase Anon Key
        if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ] || [ "$EXPO_PUBLIC_SUPABASE_ANON_KEY" = "your_supabase_anon_key" ]; then
            echo -e "${RED}❌ EXPO_PUBLIC_SUPABASE_ANON_KEY 未正确配置${NC}"
            echo -e "${YELLOW}💡 需要设置为实际的 Supabase anon key${NC}"
            return 1
        else
            echo -e "${GREEN}✅ EXPO_PUBLIC_SUPABASE_ANON_KEY 已配置${NC}"
        fi
    fi
    return 0
}

test_supabase_connection() {
    if [ ! -z "$EXPO_PUBLIC_SUPABASE_URL" ] && [ "$EXPO_PUBLIC_SUPABASE_URL" != "your_supabase_project_url" ]; then
        echo "🔗 测试 Supabase 连接..."
        if curl -s -f "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Supabase 连接正常${NC}"
            return 0
        else
            echo -e "${RED}❌ Supabase 连接失败${NC}"
            echo -e "${YELLOW}💡 请检查 SUPABASE_URL 是否正确${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⏭️  跳过 Supabase 连接测试（URL 未配置）${NC}"
        return 1
    fi
}

check_supabase_cli() {
    if command -v supabase &> /dev/null; then
        echo -e "${GREEN}✅ Supabase CLI 已安装${NC}"
        supabase --version
        return 0
    else
        echo -e "${RED}❌ Supabase CLI 未安装${NC}"
        echo -e "${YELLOW}💡 安装命令：npm install -g @supabase/cli${NC}"
        
        read -p "是否现在安装 Supabase CLI？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm install -g @supabase/cli
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Supabase CLI 安装成功${NC}"
                return 0
            fi
        fi
        return 1
    fi
}

check_dependencies() {
    echo "📦 检查项目依赖..."
    
    required_deps=("@supabase/supabase-js" "@tanstack/react-query" "zustand" "expo-crypto")
    missing_deps=()
    
    for dep in "${required_deps[@]}"; do
        if npm list "$dep" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $dep${NC}"
        else
            echo -e "${RED}❌ $dep${NC}"
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${YELLOW}💡 缺少依赖，运行 npm install 来安装${NC}"
        return 1
    else
        echo -e "${GREEN}✅ 所有依赖已安装${NC}"
        return 0
    fi
}

show_next_steps() {
    echo ""
    echo "🎯 下一步操作："
    echo "==============="
    
    if [ ! -f ".env.local" ] || ! check_env_vars >/dev/null 2>&1; then
        echo "1. 📝 配置环境变量："
        echo "   - 编辑 .env.local 文件"
        echo "   - 设置 EXPO_PUBLIC_SUPABASE_URL"
        echo "   - 设置 EXPO_PUBLIC_SUPABASE_ANON_KEY"
        echo ""
    fi
    
    echo "2. 🗄️  设置 Supabase："
    echo "   选项A（云端）："
    echo "   - 访问 https://app.supabase.com 创建项目"
    echo "   - supabase link --project-ref YOUR_REF"
    echo "   - supabase db push"
    echo "   - supabase functions deploy submit"
    echo "   - supabase functions deploy attempts"
    echo "   - supabase secrets set OPENAI_API_KEY=your_key"
    echo ""
    echo "   选项B（本地）："
    echo "   - supabase start"
    echo "   - 使用本地 URL: http://localhost:54321"
    echo ""
    
    echo "3. 🤖 获取 OpenAI API Key："
    echo "   - 访问 https://platform.openai.com"
    echo "   - 创建 API key"
    echo "   - 配置到 Supabase secrets"
    echo ""
    
    echo "4. 🚀 启动项目："
    echo "   - npm start"
    echo ""
    
    echo "📖 详细指南：查看 S3_DEPLOYMENT_GUIDE.md"
}

# 主执行流程
echo ""

# 检查环境文件
check_env_file
env_file_ok=$?

# 检查环境变量
if [ $env_file_ok -eq 0 ]; then
    check_env_vars
    env_vars_ok=$?
else
    env_vars_ok=1
fi

# 测试Supabase连接
if [ $env_vars_ok -eq 0 ]; then
    test_supabase_connection
    supabase_ok=$?
else
    supabase_ok=1
fi

# 检查Supabase CLI
check_supabase_cli
cli_ok=$?

# 检查依赖
check_dependencies
deps_ok=$?

echo ""
echo "📊 配置状态总结："
echo "=================="

if [ $env_file_ok -eq 0 ]; then
    echo -e "${GREEN}✅ 环境文件${NC}"
else
    echo -e "${RED}❌ 环境文件${NC}"
fi

if [ $env_vars_ok -eq 0 ]; then
    echo -e "${GREEN}✅ 环境变量${NC}"
else
    echo -e "${RED}❌ 环境变量${NC}"
fi

if [ $supabase_ok -eq 0 ]; then
    echo -e "${GREEN}✅ Supabase 连接${NC}"
else
    echo -e "${RED}❌ Supabase 连接${NC}"
fi

if [ $cli_ok -eq 0 ]; then
    echo -e "${GREEN}✅ Supabase CLI${NC}"
else
    echo -e "${RED}❌ Supabase CLI${NC}"
fi

if [ $deps_ok -eq 0 ]; then
    echo -e "${GREEN}✅ 项目依赖${NC}"
else
    echo -e "${RED}❌ 项目依赖${NC}"
fi

# 检查是否可以启动
if [ $env_vars_ok -eq 0 ] && [ $supabase_ok -eq 0 ] && [ $deps_ok -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 配置完成！可以启动项目了${NC}"
    echo -e "${GREEN}运行：npm start${NC}"
else
    show_next_steps
fi