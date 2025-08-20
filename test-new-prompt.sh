#!/bin/bash

# 测试新的评估prompt
echo "Testing new evaluation prompt..."

curl -X POST http://127.0.0.1:54321/functions/v1/submit \
  -H "Content-Type: application/json" \
  -d '{
    "sceneId": "scene001",
    "text": "This is test description",
    "installId": "test-install-123"
  }' | json_pp

echo "Test completed!"