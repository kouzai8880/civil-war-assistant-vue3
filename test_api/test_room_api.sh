#!/bin/bash

# 设置API基础URL
API_BASE_URL="https://dvmxujshaduv.sealoshzh.site/api/v1"

# 模拟两个玩家的token
PLAYER1_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2YwZWMyMDY3NTBmYzJkMzRkYTM2Y2QiLCJ1c2VybmFtZSI6Iuaxieays-aXpeiQneS4juaYjuacuiIsImlhdCI6MTcxMDU4Mzc3NywiZXhwIjoxNzEzMTc1Nzc3fQ.cEIhhVzUOIUlJLdrqGCTDsm0HdGCIU-uxJnXY0iVZ0A"
PLAYER2_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2YzNmNmYTUzYWNkODMyZTE1YmY5NDAiLCJ1c2VybmFtZSI6Iua1i-ivlTIiLCJpYXQiOjE3MTA1ODM3MDQsImV4cCI6MTcxMzE3NTcwNH0.m8FBsjBvHmkW1Z7mxPuG4V7TIlCWtDzSyWr6Kx1oDEM"

# 创建一个新房间 (由玩家1创建)
echo "1. 玩家1创建房间..."
CREATE_ROOM_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/rooms" \
    -H "Authorization: Bearer ${PLAYER1_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "测试房间API一致性",
        "description": "测试不同玩家获取房间数据是否一致",
        "gameType": "LOL",
        "password": "123456",
        "playerCount": 10,
        "isPublic": true,
        "pickMode": "12221"
    }')

# 提取房间ID
ROOM_ID=$(echo $CREATE_ROOM_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ROOM_ID" ]; then
    echo "无法创建房间或获取房间ID，请检查API响应:"
    echo $CREATE_ROOM_RESPONSE
    exit 1
fi

echo "房间创建成功，ID: $ROOM_ID"
echo

# 玩家1获取房间详情
echo "2. 玩家1获取房间详情..."
PLAYER1_ROOM_DETAILS=$(curl -s -X GET "${API_BASE_URL}/rooms/${ROOM_ID}" \
    -H "Authorization: Bearer ${PLAYER1_TOKEN}")

echo "玩家1获取的房间详情:"
echo $PLAYER1_ROOM_DETAILS | jq '.'
echo

# 玩家2加入房间
echo "3. 玩家2加入房间..."
JOIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/rooms/${ROOM_ID}/join" \
    -H "Authorization: Bearer ${PLAYER2_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "password": "123456"
    }')

echo "玩家2加入房间响应:"
echo $JOIN_RESPONSE | jq '.'
echo

# 玩家2获取房间详情
echo "4. 玩家2获取房间详情..."
PLAYER2_ROOM_DETAILS=$(curl -s -X GET "${API_BASE_URL}/rooms/${ROOM_ID}" \
    -H "Authorization: Bearer ${PLAYER2_TOKEN}")

echo "玩家2获取的房间详情:"
echo $PLAYER2_ROOM_DETAILS | jq '.'
echo

# 对比关键字段是否一致
echo "5. 对比两个玩家获取的房间数据..."

# 提取玩家列表
PLAYER1_PLAYERS=$(echo $PLAYER1_ROOM_DETAILS | jq '.data.players')
PLAYER2_PLAYERS=$(echo $PLAYER2_ROOM_DETAILS | jq '.data.players')

# 提取观众列表
PLAYER1_SPECTATORS=$(echo $PLAYER1_ROOM_DETAILS | jq '.data.spectators')
PLAYER2_SPECTATORS=$(echo $PLAYER2_ROOM_DETAILS | jq '.data.spectators')

echo "玩家1看到的玩家列表:"
echo $PLAYER1_PLAYERS | jq '.'
echo
echo "玩家2看到的玩家列表:"
echo $PLAYER2_PLAYERS | jq '.'
echo

echo "玩家1看到的观众列表:"
echo $PLAYER1_SPECTATORS | jq '.'
echo
echo "玩家2看到的观众列表:"
echo $PLAYER2_SPECTATORS | jq '.'
echo

# 检查玩家列表长度是否一致
PLAYER1_PLAYERS_COUNT=$(echo $PLAYER1_PLAYERS | jq 'length')
PLAYER2_PLAYERS_COUNT=$(echo $PLAYER2_PLAYERS | jq 'length')

PLAYER1_SPECTATORS_COUNT=$(echo $PLAYER1_SPECTATORS | jq 'length')
PLAYER2_SPECTATORS_COUNT=$(echo $PLAYER2_SPECTATORS | jq 'length')

if [ "$PLAYER1_PLAYERS_COUNT" == "$PLAYER2_PLAYERS_COUNT" ]; then
    echo "✅ 玩家列表长度一致: $PLAYER1_PLAYERS_COUNT"
else
    echo "❌ 玩家列表长度不一致: 玩家1看到$PLAYER1_PLAYERS_COUNT人，玩家2看到$PLAYER2_PLAYERS_COUNT人"
fi

if [ "$PLAYER1_SPECTATORS_COUNT" == "$PLAYER2_SPECTATORS_COUNT" ]; then
    echo "✅ 观众列表长度一致: $PLAYER1_SPECTATORS_COUNT"
else
    echo "❌ 观众列表长度不一致: 玩家1看到$PLAYER1_SPECTATORS_COUNT人，玩家2看到$PLAYER2_SPECTATORS_COUNT人"
fi

# 清理房间
echo "6. 清理测试房间..."
DELETE_RESPONSE=$(curl -s -X DELETE "${API_BASE_URL}/rooms/${ROOM_ID}" \
    -H "Authorization: Bearer ${PLAYER1_TOKEN}")

echo "房间删除响应:"
echo $DELETE_RESPONSE | jq '.'
