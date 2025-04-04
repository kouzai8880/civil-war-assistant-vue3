<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useRoomStore } from '../stores/room'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const roomStore = useRoomStore()

// 房间ID
const roomId = computed(() => route.params.id)

// 房间详情
const room = computed(() => roomStore.currentRoom)

// 当前用户ID
const currentUserId = computed(() => userStore.userId)

// 用户是否已准备
const isReady = computed(() => {
  if (!room.value || !currentUserId.value) return false
  const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
  return currentPlayer && currentPlayer.status === 'ready'
})

// 用户是否是房主
const isCreator = computed(() => {
  if (!room.value || !currentUserId.value) return false
  return room.value.creatorId === currentUserId.value
})

// 用户是否是队长
const isCaptain = computed(() => {
  if (!room.value || !currentUserId.value) return false
  const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
  return currentPlayer && currentPlayer.isCaptain
})

// 用户所在队伍ID
const userTeamId = computed(() => {
  if (!room.value || !currentUserId.value) return null
  const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
  return currentPlayer ? currentPlayer.teamId : null
})

// 用户是否在观众席
const isSpectator = computed(() => {
  if (!room.value || !currentUserId.value) return true
  return !room.value.players.some(p => p.userId === currentUserId.value)
})

// 队伍是否已满
const isTeamFull = computed(() => {
  if (!room.value) return true
  return room.value.players.length >= room.value.playerCount
})

// 当前选人阶段
const pickingPhase = ref({
  currentPick: 1,
  currentTeam: 1,
  pickPattern: [1, 2, 2, 2, 1] // 默认使用12221模式
})

// 加载状态
const isLoading = ref(false)

// 选择角色弹窗
const characterPickingVisible = ref(false)

// 选择边弹窗
const sideSelectorVisible = ref(false)

// 当前选择的角色
const selectedCharacter = ref(null)

// 当前选择的边
const selectedSide = ref(null)

// 侧边栏状态
const sidebarCollapsed = ref(false)

// 当前激活的聊天标签
const activeChat = ref('public')

// 聊天消息
const messages = ref({
  public: [
    { id: 1, userId: 'system', username: '系统', content: '欢迎来到房间，请准备就绪', time: new Date() }
  ],
  team1: [],
  team2: []
})

// 聊天输入
const chatInput = ref('')

// 队伍设置对话框
const teamSettingVisible = ref(false)

// 是否已加入语音
const hasJoinedVoice = ref(false)

// 模拟角色列表
const characters = ref([
  { id: 1, name: '玩家小明', avatar: 'https://placekitten.com/100/100' },
  { id: 2, name: '玩家小红', avatar: 'https://placekitten.com/101/101' },
  { id: 3, name: '玩家小刚', avatar: 'https://placekitten.com/102/102' },
  { id: 4, name: '玩家小丽', avatar: 'https://placekitten.com/103/103' },
  { id: 5, name: '玩家小华', avatar: 'https://placekitten.com/104/104' },
  { id: 6, name: '玩家小芳', avatar: 'https://placekitten.com/105/105' },
  { id: 7, name: '玩家小龙', avatar: 'https://placekitten.com/106/106' },
  { id: 8, name: '玩家小雪', avatar: 'https://placekitten.com/107/107' },
])

// 已选择的玩家
const pickedCharacters = ref([])

// 测试用 - 模拟房间状态设置
const setRoomPhase = (phase) => {
  if (!room.value) return
  
  // 创建一个临时的房间对象
  const updatedRoom = {...room.value, status: phase}
  
  // 如果是选人阶段，设置两个队长
  if (phase === 'picking') {
    // 确保有两个队伍
    if (!updatedRoom.teams || updatedRoom.teams.length < 2) {
      updatedRoom.teams = [
        { id: 1, name: '一队', side: null },
        { id: 2, name: '二队', side: null }
      ]
    }
    
    // 分配队长
    let teamOneCaptainSet = false;
    let teamTwoCaptainSet = false;
    
    updatedRoom.players = updatedRoom.players.map(player => {
      if (player.teamId === 1 && !teamOneCaptainSet) {
        player.isCaptain = true;
        teamOneCaptainSet = true;
      } else if (player.teamId === 2 && !teamTwoCaptainSet) {
        player.isCaptain = true;
        teamTwoCaptainSet = true;
      } else {
        player.isCaptain = false;
      }
      return player;
    })
    
    // 确定使用的BP模式
    const mode = updatedRoom.pickMode || '12221';
    
    // 重置选人状态
    pickingPhase.value = {
      currentPick: 1,
      currentTeam: 1,
      pickPattern: mode === '12221' ? [1, 2, 2, 2, 1] : [1, 2, 2, 1, 1]
    }
    
    pickedCharacters.value = []
    
    addSystemMessage('选人阶段开始，由一队队长开始选择队员')
  } else if (phase === 'side-picking') {
    if (!updatedRoom.teams || updatedRoom.teams.length < 2) {
      updatedRoom.teams = [
        { id: 1, name: '一队', side: null },
        { id: 2, name: '二队', side: null }
      ]
    }
    
    addSystemMessage('选边阶段开始，由一队队长选择红蓝方')
  } else if (phase === 'waiting-game') {
    updatedRoom.teams[0].side = selectedSide.value === 'red' ? 'red' : 'blue'
    updatedRoom.teams[1].side = selectedSide.value === 'red' ? 'blue' : 'red'
    addSystemMessage(`一队选择了${selectedSide.value === 'red' ? '红' : '蓝'}方，等待游戏开始...`)
  } else if (phase === 'gaming') {
    addSystemMessage('游戏已开始！')
  }
  
  // 更新到 roomStore
  roomStore.setCurrentRoom(updatedRoom)
}

// 选择玩家
const pickPlayer = (player) => {
  if (!room.value || !isCaptain.value) return
  
  // 检查当前是否轮到该队长选择
  if (pickingPhase.value.currentTeam !== userTeamId.value) {
    ElMessage.warning('不是您的选择回合')
    return
  }
  
  // 检查玩家是否已经被选择
  if (pickedCharacters.value.some(c => c.characterId === player.id)) {
    ElMessage.warning('该玩家已被选择')
    return
  }
  
  // 添加到已选择列表
  pickedCharacters.value.push({
    characterId: player.id,
    characterName: player.name,
    characterAvatar: player.avatar,
    teamId: userTeamId.value,
    pickOrder: pickingPhase.value.currentPick
  })
  
  // 添加系统消息
  addSystemMessage(`${userTeamId.value === 1 ? '一' : '二'}队选择了玩家 ${player.name}`)
  
  // 更新选择进度
  updatePickingProgress()
}

// 更新选择进度
const updatePickingProgress = () => {
  // 确定使用的BP模式
  const mode = room.value.pickMode || '12221';
  
  // 根据模式设置选人模式
  if (mode === '12221') {
    pickingPhase.value.pickPattern = [1, 2, 2, 2, 1];
  } else {
    // 默认使用12211模式
    pickingPhase.value.pickPattern = [1, 2, 2, 1, 1];
  }

  const pattern = pickingPhase.value.pickPattern;
  const currentPick = pickingPhase.value.currentPick;
  
  // 检查是否已完成所有选择
  const totalPicks = getTotalPickCount();
  if (pickedCharacters.value.length >= totalPicks) {
    // 进入选边阶段
    setRoomPhase('side-picking');
    return;
  }
  
  // 更新当前选择信息
  pickingPhase.value.currentPick++;
  
  // 确定下一个选择的队伍
  const pickIndex = Math.floor((currentPick - 1) / 2);
  if (pickIndex < pattern.length) {
    pickingPhase.value.currentTeam = pattern[pickIndex];
  } else {
    // 如果超出了pattern的范围，服务器会自动选择
    // 这里模拟自动选择，默认选择最后一个队伍
    const remainingCount = totalPicks - pickedCharacters.value.length;
    if (remainingCount > 0) {
      autoPickForTeam(pickingPhase.value.currentTeam);
    } else {
      setRoomPhase('side-picking');
      return;
    }
  }
  
  // 添加系统消息
  addSystemMessage(`轮到${pickingPhase.value.currentTeam === 1 ? '一' : '二'}队队长选择玩家`);
}

// 获取总共需要选择的玩家数量
const getTotalPickCount = () => {
  return 8; // 两个队长 + 8个玩家 = 10人
}

// 自动为队伍选择玩家
const autoPickForTeam = (teamId) => {
  // 找到所有未选择的玩家
  const selectedIds = pickedCharacters.value.map(c => c.characterId);
  const availablePlayers = characters.value.filter(c => !selectedIds.includes(c.id));
  
  if (availablePlayers.length > 0) {
    // 随机选择一个玩家
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const selectedPlayer = availablePlayers[randomIndex];
    
    // 添加到已选择列表
    pickedCharacters.value.push({
      characterId: selectedPlayer.id,
      characterName: selectedPlayer.name,
      characterAvatar: selectedPlayer.avatar,
      teamId: teamId,
      pickOrder: pickingPhase.value.currentPick
    });
    
    // 添加系统消息
    addSystemMessage(`系统为${teamId === 1 ? '一' : '二'}队自动选择了 ${selectedPlayer.name}`);
    
    // 继续更新选择进度
    updatePickingProgress();
  }
}

// 加载房间数据
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  
  loadRoomDetail()
})

// 加载房间详情
const loadRoomDetail = async () => {
  isLoading.value = true
  try {
    await roomStore.fetchRoomDetail(roomId.value)
    
    if (!room.value) {
      ElMessage.error('房间不存在')
      router.push('/rooms')
      return
    }
    
    // 确保有观众列表
    if (!room.value.spectators) {
      room.value.spectators = []
    }
    
    // 确保有队伍列表
    if (!room.value.teams) {
      room.value.teams = [
        { id: 1, name: '一队', side: null },
        { id: 2, name: '二队', side: null }
      ]
    }
    
    // 确保当前用户在房间中，如果不在，添加到观众席
    const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
    const currentSpectator = room.value.spectators.find(s => s.userId === currentUserId.value)
    
    if (!currentPlayer && !currentSpectator) {
      // 将用户添加到观众席
      addUserToSpectators()
    }
  } catch (error) {
    ElMessage.error('加载房间失败')
  } finally {
    isLoading.value = false
  }
}

// 将用户添加到观众席
const addUserToSpectators = async () => {
  try {
    // 创建用户数据
    const userData = {
      userId: userStore.userId,
      username: userStore.username,
      avatar: userStore.avatar || 'https://placekitten.com/100/100'
    }
    
    // 将用户添加到观众席
    room.value.spectators.push(userData)
    
    // 添加系统消息
    addSystemMessage(`${userStore.username} 进入了观众席`)
  } catch (error) {
    ElMessage.error('加入观众席失败')
  }
}

// 加入队伍
const joinRoom = async () => {
  if (!room.value) return
  
  // 检查玩家数量是否已满
  if (room.value.players.length >= 10) {
    ElMessage.warning('对局已满员')
    return
  }
  
  try {
    // 创建玩家数据
    const playerData = {
      userId: userStore.userId,
      username: userStore.username,
      avatar: userStore.avatar || 'https://placekitten.com/100/100',
      status: 'not-ready',
      // 初始不分配到任何队伍
      teamId: null,
      isCaptain: false
    }
    
    // 从观众席移除用户
    const spectatorIndex = room.value.spectators.findIndex(s => s.userId === currentUserId.value)
    if (spectatorIndex !== -1) {
      room.value.spectators.splice(spectatorIndex, 1)
    }
    
    // 添加到玩家列表
    room.value.players.push(playerData)
    
    // 添加系统消息
    addSystemMessage(`${userStore.username} 加入了对局`)
  } catch (error) {
    ElMessage.error('加入对局失败')
  }
}

// 准备/取消准备
const toggleReady = async () => {
  if (!room.value) return
  
  try {
    // 找到当前玩家
    const playerIndex = room.value.players.findIndex(p => p.userId === currentUserId.value)
    if (playerIndex === -1) {
      ElMessage.warning('您不是队伍成员，无法准备')
      return
    }
    
    // 更新准备状态
    const currentStatus = room.value.players[playerIndex].status
    room.value.players[playerIndex].status = currentStatus === 'ready' ? 'not-ready' : 'ready'
    
    // 添加系统消息
    const message = currentStatus === 'ready' ? 
      `${userStore.username} 取消了准备` : 
      `${userStore.username} 已准备`
      
    addSystemMessage(message)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 检查是否所有人都准备好了
const checkAllReady = () => {
  if (!room.value) return false
  return room.value.players.every(p => p.status === 'ready')
}

// 开始选人
const startPicking = async () => {
  if (!checkAllReady()) {
    ElMessage.warning('还有玩家未准备')
    return
  }
  
  try {
    setRoomPhase('picking')
  } catch (error) {
    ElMessage.error('开始选人失败')
  }
}

// 选择角色
const pickCharacter = (character) => {
  if (!room.value || !isCaptain.value) return
  
  // 检查当前是否轮到该队长选择
  if (pickingPhase.value.currentTeam !== userTeamId.value) {
    ElMessage.warning('不是您的选择回合')
    return
  }
  
  // 检查角色是否已经被选择
  if (pickedCharacters.value.some(c => c.characterId === character.id)) {
    ElMessage.warning('该角色已被选择')
    return
  }
  
  // 添加到已选择列表
  pickedCharacters.value.push({
    characterId: character.id,
    characterName: character.name,
    characterAvatar: character.avatar,
    teamId: userTeamId.value,
    pickOrder: pickingPhase.value.currentPick
  })
  
  // 添加系统消息
  addSystemMessage(`${userTeamId.value === 1 ? '一' : '二'}队选择了 ${character.name}`)
  
  // 关闭选择弹窗
  characterPickingVisible.value = false
  
  // 更新选择进度
  updatePickingProgress()
}

// 选择红蓝方
const pickSide = (side) => {
  if (!room.value || !isCaptain.value || userTeamId.value !== 1) return
  
  selectedSide.value = side
  sideSelectorVisible.value = false
  
  // 进入等待游戏阶段
  setRoomPhase('waiting-game')
}

// 开始游戏
const startGame = async () => {
  try {
    setRoomPhase('gaming')
  } catch (error) {
    ElMessage.error('开始游戏失败')
  }
}

// 离开房间
const leaveRoom = async () => {
  try {
    // 如果是玩家，从玩家列表移除
    const playerIndex = room.value.players.findIndex(p => p.userId === currentUserId.value)
    if (playerIndex !== -1) {
      room.value.players.splice(playerIndex, 1)
      addSystemMessage(`${userStore.username} 离开了队伍`)
    }
    
    // 如果是观众，从观众列表移除
    const spectatorIndex = room.value.spectators.findIndex(s => s.userId === currentUserId.value)
    if (spectatorIndex !== -1) {
      room.value.spectators.splice(spectatorIndex, 1)
    }
    
    ElMessage.success('已离开房间')
    router.push('/rooms')
  } catch (error) {
    ElMessage.error('离开房间失败')
  }
}

// 发送聊天消息
const sendMessage = () => {
  if (!chatInput.value.trim()) return
  
  // 根据当前激活的聊天标签发送到对应频道
  messages.value[activeChat.value].push({
    id: Date.now(),
    userId: currentUserId.value,
    username: userStore.username,
    content: chatInput.value,
    time: new Date()
  })
  
  chatInput.value = ''
  
  // 自动滚动到底部
  nextTick(() => {
    const chatBox = document.querySelector('.chat-messages')
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight
    }
  })
}

// 添加系统消息
const addSystemMessage = (content) => {
  // 添加到所有聊天频道
  Object.keys(messages.value).forEach(channel => {
    messages.value[channel].push({
      id: Date.now() + Math.random(),
      userId: 'system',
      username: '系统',
      content,
      time: new Date()
    })
  })
  
  // 自动滚动到底部
  nextTick(() => {
    const chatBox = document.querySelector('.chat-messages')
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight
    }
  })
}

// 切换语音状态
const toggleVoice = () => {
  hasJoinedVoice.value = !hasJoinedVoice.value
  
  // 添加系统消息
  if (hasJoinedVoice.value) {
    addSystemMessage(`${userStore.username} 加入了语音聊天`)
  } else {
    addSystemMessage(`${userStore.username} 离开了语音聊天`)
  }
}

// 切换侧边栏状态
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 切换聊天频道
const switchChatChannel = (channel) => {
  activeChat.value = channel
}

// 房间状态文本
const statusText = (status) => {
  switch (status) {
    case 'waiting': return '等待中'
    case 'picking': return '选人中'
    case 'side-picking': return '选边中'
    case 'waiting-game': return '等待开始'
    case 'gaming': return '游戏中'
    case 'ended': return '已结束'
    default: return '未知'
  }
}

// 房间状态标签样式
const statusClass = (status) => {
  switch (status) {
    case 'waiting': return 'status-waiting'
    case 'picking': case 'side-picking': return 'status-picking'
    case 'waiting-game': return 'status-waiting-game'
    case 'gaming': return 'status-gaming'
    case 'ended': return 'status-ended'
    default: return ''
  }
}

// 队伍颜色
const teamColor = (teamId) => {
  if (!teamId) return ''
  switch (teamId) {
    case 1: return 'team-red'
    case 2: return 'team-blue'
    default: return ''
  }
}

// 当前用户是否可以开始选人
const canStartPicking = computed(() => {
  if (!room.value || !isCreator.value || room.value.status !== 'waiting') return false
  return checkAllReady() && room.value.players.length >= 2
})

// 是否显示选择角色按钮
const showPickCharacterButton = computed(() => {
  if (!room.value || room.value.status !== 'picking' || !isCaptain.value) return false
  return pickingPhase.value.currentTeam === userTeamId.value
})

// 是否显示选择红蓝方按钮
const showPickSideButton = computed(() => {
  if (!room.value || room.value.status !== 'side-picking' || !isCaptain.value) return false
  return userTeamId.value === 1
})

// 是否显示开始游戏按钮
const showStartGameButton = computed(() => {
  if (!room.value || !isCreator.value) return false
  return room.value.status === 'waiting-game'
})

// 指示队长是否需要行动的提示文本
const captainActionText = computed(() => {
  if (!room.value) return ''
  
  if (room.value.status === 'picking') {
    if (isCaptain.value && pickingPhase.value.currentTeam === userTeamId.value) {
      return '轮到您选择角色'
    } else if (isCaptain.value) {
      return '等待对方队长选择'
    }
  } else if (room.value.status === 'side-picking') {
    if (isCaptain.value && userTeamId.value === 1) {
      return '请选择红方或蓝方'
    }
  }
  
  return ''
})
</script>

<template>
  <div class="room-detail-container">
    <el-skeleton :loading="isLoading" animated :count="1" :throttle="500">
      <template #default>
        <template v-if="room">
          <!-- 房间头部信息 -->
          <div class="room-header">
            <div class="room-title">
              <h1>{{ room.name }}</h1>
              <div :class="['room-status', statusClass(room.status)]">
                {{ statusText(room.status) }}
              </div>
            </div>
            
            <div class="room-info-bar">
              <div class="room-info-item">
                <div class="info-label">玩家数量:</div>
                <div class="info-content">
                  <el-icon><User /></el-icon>
                  <span>{{ room.players.length }}/{{ room.playerCount }}</span>
                </div>
              </div>
              
              <div class="room-info-item">
                <div class="info-label">游戏模式:</div>
                <div class="info-content">
                  <el-icon><Monitor /></el-icon>
                  <span>{{ room.gameType || 'LOL' }}</span>
                </div>
              </div>
              
              <div class="room-info-item">
                <div class="info-label">BP模式:</div>
                <div class="info-content">{{ room.pickMode || '队长BP(12211)' }}</div>
              </div>
              
              <div class="room-info-item">
                <div class="info-label">创建时间:</div>
                <div class="info-content">
                  <el-icon><Clock /></el-icon>
                  <span>{{ new Date(room.createTime).toLocaleString() }}</span>
                </div>
              </div>
            </div>
            
            <div class="room-description" v-if="room.description">
              <h3>房间描述</h3>
              <p>{{ room.description }}</p>
            </div>
            
            <!-- 测试导航按钮 -->
            <div class="test-buttons">
              <h4>测试导航按钮</h4>
              <div class="test-button-group">
                <el-button size="small" @click="setRoomPhase('waiting')">等待阶段</el-button>
                <el-button size="small" @click="setRoomPhase('picking')">选人阶段</el-button>
                <el-button size="small" @click="setRoomPhase('side-picking')">选边阶段</el-button>
                <el-button size="small" @click="setRoomPhase('waiting-game')">等待游戏</el-button>
                <el-button size="small" @click="setRoomPhase('gaming')">游戏中</el-button>
              </div>
            </div>
            
            <!-- 队长提示 -->
            <div class="captain-prompt" v-if="captainActionText">
              <el-alert
                :title="captainActionText"
                type="warning"
                :closable="false"
                show-icon
              />
            </div>
            
            <!-- 房间操作按钮 -->
            <div class="room-actions">
              <!-- 如果是观众且队伍未满，显示加入队伍按钮 -->
              <template v-if="isSpectator && !isTeamFull && room.status === 'waiting'">
                <el-button 
                  type="primary"
                  @click="joinRoom"
                  class="action-btn"
                >
                  加入对局
                </el-button>
              </template>
              
              <!-- 如果是队伍成员，显示准备按钮 -->
              <el-button 
                v-if="!isSpectator && room.status === 'waiting'" 
                :type="isReady ? 'warning' : 'success'"
                @click="toggleReady"
                class="action-btn"
              >
                {{ isReady ? '取消准备' : '准备' }}
              </el-button>
              
              <!-- 房主可以开始选人 -->
              <el-button 
                v-if="canStartPicking" 
                type="primary"
                @click="startPicking"
                class="action-btn"
              >
                开始选人
              </el-button>
              
              <!-- 队长选择角色按钮 -->
              <el-button 
                v-if="showPickCharacterButton" 
                type="warning"
                @click="characterPickingVisible = true"
                class="action-btn"
              >
                选择角色
              </el-button>
              
              <!-- 一队队长选择红蓝方按钮 -->
              <el-button 
                v-if="showPickSideButton" 
                type="warning"
                @click="sideSelectorVisible = true"
                class="action-btn"
              >
                选择红蓝方
              </el-button>
              
              <!-- 房主可以开始游戏 -->
              <el-button 
                v-if="showStartGameButton" 
                type="success"
                @click="startGame"
                class="action-btn"
              >
                开始游戏
              </el-button>
              
              <!-- 离开房间按钮 -->
              <el-button type="danger" @click="leaveRoom" class="action-btn">
                离开房间
              </el-button>
            </div>
          </div>
          
          <div class="main-content" :class="{'sidebar-collapsed': sidebarCollapsed}">
            <!-- 侧边栏(观众和语音) -->
            <div class="sidebar">
              <div class="sidebar-toggle" @click="toggleSidebar">
                <i class="el-icon-arrow-right" v-if="sidebarCollapsed"></i>
                <i class="el-icon-arrow-left" v-else></i>
              </div>
              
              <!-- 观众席移到顶部 -->
              <div class="spectators-sidebar">
                <div class="card-header">
                  <h2 class="section-title">观众席 ({{ room.spectators.length }})</h2>
                </div>
                
                <div class="spectators-sidebar-list">
                  <div v-for="spectator in room.spectators" :key="spectator.userId" class="spectator-sidebar-item">
                    <img :src="spectator.avatar || 'https://placekitten.com/80/80'" alt="观众头像" class="spectator-avatar">
                    <span class="spectator-name">{{ spectator.username }}</span>
                  </div>
                  
                  <div v-if="room.spectators.length === 0" class="empty-spectators-sidebar">
                    暂无观众
                  </div>
                </div>
              </div>
              
              <!-- 语音区域 -->
              <div class="voice-container">
                <div class="card-header">
                  <h2 class="section-title">
                    {{ isSpectator || room.status === 'waiting' ? '公共语音' : 
                       userTeamId === 1 ? '一队语音' : '二队语音' }}
                  </h2>
                  <div class="voice-controls">
                    <button 
                      class="btn-mic" 
                      :class="{'active': hasJoinedVoice}"
                    >
                      🎤
                    </button>
                    <button class="btn-speaker active">🔊</button>
                  </div>
                </div>
                
                <div class="voice-participants">
                  <div class="voice-participant" :class="{'speaking': hasJoinedVoice}">
                    <img :src="userStore.avatar || 'https://placekitten.com/90/90'" alt="您的头像" class="voice-avatar">
                    <span class="participant-name">{{ userStore.username }} (您)</span>
                    <div class="voice-indicator"></div>
                  </div>
                  <div v-if="hasJoinedVoice" class="voice-participant speaking">
                    <img src="https://placekitten.com/91/91" alt="参与者头像" class="voice-avatar">
                    <span class="participant-name">用户2</span>
                    <div class="voice-indicator"></div>
                  </div>
                </div>
                
                <button 
                  class="btn join-voice-btn" 
                  :class="hasJoinedVoice ? 'btn-danger' : 'btn-primary'"
                  @click="toggleVoice"
                >
                  {{ hasJoinedVoice ? '退出语音' : '加入语音' }}
                </button>
              </div>
            </div>
            
            <!-- 主要内容区域 -->
            <div class="content-area">
              <!-- 根据房间状态显示不同的内容 -->
              <template v-if="room.status === 'waiting'">
                <!-- 房间主体 - 等待中状态 -->
                <div class="room-body">
                  <!-- 等待中状态的玩家列表 -->
                  <div class="section-card players-container" v-if="room.status === 'waiting'">
                    <div class="card-header">
                      <h2 class="section-title">玩家列表 ({{ room.players.length }}/10)</h2>
                    </div>
                    
                    <div class="player-grid">
                      <!-- 显示已加入的玩家 -->
                      <div 
                        v-for="player in room.players" 
                        :key="player.userId"
                        class="player-card"
                      >
                        <img :src="player.avatar || 'https://placekitten.com/100/100'" alt="玩家头像" class="player-avatar">
                        
                        <div class="player-info">
                          <div class="player-name">
                            {{ player.username }}
                            <span v-if="player.userId === room.creatorId" class="player-badge creator">房主</span>
                          </div>
                           
                          <div class="player-status" :class="player.status === 'ready' ? 'online' : 'afk'">
                            {{ player.status === 'ready' ? '已准备' : '未准备' }}
                          </div>
                        </div>
                      </div>
                      
                      <!-- 空位 -->
                      <div 
                        v-for="n in (10 - room.players.length)" 
                        :key="`empty-slot-${n}`"
                        class="empty-slot"
                      >
                        <div class="empty-avatar"></div>
                        <div>等待加入...</div>
                      </div>
                    </div>
                  </div>
                
                  <!-- 聊天区域移到主内容区 -->
                  <div class="section-card chat-container-main">
                    <div class="card-header">
                      <h2 class="section-title">聊天室</h2>
                    </div>
                    
                    <div class="chat-tabs">
                      <div 
                        class="chat-tab" 
                        :class="{'active': activeChat === 'public'}"
                        @click="switchChatChannel('public')"
                      >
                        公共聊天
                      </div>
                      <div 
                        v-if="room.status !== 'waiting' && userTeamId === 1"
                        class="chat-tab" 
                        :class="{'active': activeChat === 'team1'}"
                        @click="switchChatChannel('team1')"
                      >
                        一队聊天
                      </div>
                      <div 
                        v-if="room.status !== 'waiting' && userTeamId === 2"
                        class="chat-tab" 
                        :class="{'active': activeChat === 'team2'}"
                        @click="switchChatChannel('team2')"
                      >
                        二队聊天
                      </div>
                    </div>
                    
                    <div class="chat-messages">
                      <div 
                        v-for="msg in messages[activeChat]" 
                        :key="msg.id"
                        :class="['message', {'system-message': msg.userId === 'system'}]"
                      >
                        <template v-if="msg.userId !== 'system'">
                          <img :src="'https://placekitten.com/80/80'" alt="头像" class="message-avatar">
                          <div class="message-content">
                            <div class="message-author">
                              {{ msg.username }}
                              <span class="message-time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
                            </div>
                            <p>{{ msg.content }}</p>
                          </div>
                        </template>
                        <template v-else>
                          <div class="message-content">
                            {{ msg.content }}
                          </div>
                        </template>
                      </div>
                    </div>
                    
                    <div class="chat-input">
                      <input
                        v-model="chatInput"
                        placeholder="输入聊天信息..."
                        maxlength="100"
                        @keyup.enter="sendMessage"
                      />
                      <div class="chat-actions">
                        <button class="btn-emoji">😊</button>
                        <button class="btn-send" @click="sendMessage">发送</button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- 选人阶段 -->
              <template v-else-if="room.status === 'picking'">
                <div class="room-body picking-phase">
                  <div class="section-card picking-container">
                    <div class="card-header">
                      <h2 class="section-title">队员选择</h2>
                      <div class="pick-status">
                        当前回合: {{ pickingPhase.currentPick }}/{{ getTotalPickCount() }}
                        ({{ pickingPhase.currentTeam === 1 ? '一队选择' : '二队选择' }})
                      </div>
                    </div>
                    
                    <div class="pick-content-container">
                      <!-- 队伍区域 -->
                      <div class="teams-container">
                        <div class="team-group">
                          <!-- 一队 -->
                          <div class="team-red-section" :class="{'active-team': pickingPhase.currentTeam === 1}">
                            <div class="team-info">
                              <h3 class="team-name">一队</h3>
                              <span v-if="pickingPhase.currentTeam === 1" class="current-pick-status">正在选人</span>
                            </div>
                            
                            <div class="team-players-grid">
                              <!-- 队长位置 -->
                              <div 
                                v-for="player in room.players.filter(p => p.teamId === 1 && p.isCaptain)" 
                                :key="player.userId"
                                class="team-captain"
                              >
                                <div class="captain-badge">队长</div>
                                <img :src="player.avatar || 'https://placekitten.com/100/100'" alt="队长头像" class="captain-avatar">
                                <div class="captain-name">{{ player.username }}</div>
                              </div>
                              
                              <!-- 队员位置（已选择的玩家） -->
                              <div 
                                v-for="char in pickedCharacters.filter(c => c.teamId === 1)" 
                                :key="char.characterId"
                                class="picked-player"
                              >
                                <div class="pick-order">{{ char.pickOrder }}</div>
                                <img :src="char.characterAvatar" :alt="char.characterName" class="picked-avatar">
                                <div class="picked-name">{{ char.characterName }}</div>
                              </div>
                              
                              <!-- 空位 -->
                              <div 
                                v-for="n in (5 - room.players.filter(p => p.teamId === 1 && p.isCaptain).length - pickedCharacters.filter(c => c.teamId === 1).length)" 
                                :key="`empty-pick-1-${n}`"
                                class="empty-pick"
                              >
                                <div class="empty-player"></div>
                                <div>等待选择</div>
                              </div>
                            </div>
                          </div>
                          
                          <!-- 二队 -->
                          <div class="team-blue-section" :class="{'active-team': pickingPhase.currentTeam === 2}">
                            <div class="team-info">
                              <h3 class="team-name">二队</h3>
                              <span v-if="pickingPhase.currentTeam === 2" class="current-pick-status">正在选人</span>
                            </div>
                            
                            <div class="team-players-grid">
                              <!-- 队长位置 -->
                              <div 
                                v-for="player in room.players.filter(p => p.teamId === 2 && p.isCaptain)" 
                                :key="player.userId"
                                class="team-captain"
                              >
                                <div class="captain-badge">队长</div>
                                <img :src="player.avatar || 'https://placekitten.com/100/100'" alt="队长头像" class="captain-avatar">
                                <div class="captain-name">{{ player.username }}</div>
                              </div>
                              
                              <!-- 队员位置（已选择的玩家） -->
                              <div 
                                v-for="char in pickedCharacters.filter(c => c.teamId === 2)" 
                                :key="char.characterId"
                                class="picked-player"
                              >
                                <div class="pick-order">{{ char.pickOrder }}</div>
                                <img :src="char.characterAvatar" :alt="char.characterName" class="picked-avatar">
                                <div class="picked-name">{{ char.characterName }}</div>
                              </div>
                              
                              <!-- 空位 -->
                              <div 
                                v-for="n in (5 - room.players.filter(p => p.teamId === 2 && p.isCaptain).length - pickedCharacters.filter(c => c.teamId === 2).length)" 
                                :key="`empty-pick-2-${n}`"
                                class="empty-pick"
                              >
                                <div class="empty-player"></div>
                                <div>等待选择</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 公共玩家池 -->
                      <div class="common-players-pool">
                        <div class="pool-header">
                          <h3>待选玩家</h3>
                        </div>
                        <div class="pool-players">
                          <div 
                            v-for="player in characters.filter(c => !pickedCharacters.some(p => p.characterId === c.id))" 
                            :key="player.id"
                            class="pool-player"
                            :class="{'selectable': pickingPhase.currentTeam === userTeamId && isCaptain}"
                            @click="isCaptain && pickingPhase.currentTeam === userTeamId && pickPlayer(player)"
                          >
                            <img :src="player.avatar" :alt="player.name" class="pool-player-avatar">
                            <div class="pool-player-name">{{ player.name }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- 提示信息 -->
                    <div v-if="isCaptain && pickingPhase.currentTeam === userTeamId" class="pick-message">
                      请选择一名玩家加入您的队伍
                    </div>
                    <div v-else-if="isCaptain" class="pick-message">
                      请等待对方队长进行选择
                    </div>
                    <div v-else class="pick-message">
                      队长正在为队伍选择玩家，请耐心等待
                    </div>
                  </div>
                  
                  <!-- 聊天区域 - 保持与等待阶段一致 -->
                  <div class="section-card chat-container-main">
                    <div class="card-header">
                      <h2 class="section-title">聊天室</h2>
                    </div>
                    
                    <div class="chat-tabs">
                      <div 
                        class="chat-tab" 
                        :class="{'active': activeChat === 'public'}"
                        @click="switchChatChannel('public')"
                      >
                        公共聊天
                      </div>
                      <div 
                        v-if="userTeamId === 1"
                        class="chat-tab" 
                        :class="{'active': activeChat === 'team1'}"
                        @click="switchChatChannel('team1')"
                      >
                        一队聊天
                      </div>
                      <div 
                        v-if="userTeamId === 2"
                        class="chat-tab" 
                        :class="{'active': activeChat === 'team2'}"
                        @click="switchChatChannel('team2')"
                      >
                        二队聊天
                      </div>
                    </div>
                    
                    <div class="chat-messages">
                      <div 
                        v-for="msg in messages[activeChat]" 
                        :key="msg.id"
                        :class="['message', {'system-message': msg.userId === 'system'}]"
                      >
                        <template v-if="msg.userId !== 'system'">
                          <img :src="'https://placekitten.com/80/80'" alt="头像" class="message-avatar">
                          <div class="message-content">
                            <div class="message-author">
                              {{ msg.username }}
                              <span class="message-time">{{ new Date(msg.time).toLocaleTimeString() }}</span>
                            </div>
                            <p>{{ msg.content }}</p>
                          </div>
                        </template>
                        <template v-else>
                          <div class="message-content">
                            {{ msg.content }}
                          </div>
                        </template>
                      </div>
                    </div>
                    
                    <div class="chat-input">
                      <input
                        v-model="chatInput"
                        placeholder="输入聊天信息..."
                        maxlength="100"
                        @keyup.enter="sendMessage"
                      />
                      <div class="chat-actions">
                        <button class="btn-emoji">😊</button>
                        <button class="btn-send" @click="sendMessage">发送</button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- 选边阶段 -->
              <template v-else-if="room.status === 'side-picking'">
                <div class="room-body side-picking-phase">
                  <div class="section-card side-picking-container">
                    <div class="card-header">
                      <h2 class="section-title">选择红蓝方</h2>
                    </div>
                    
                    <div class="side-picking-content">
                      <div class="side-picking-message">
                        <p>选人阶段已完成，由一队队长选择红蓝方</p>
                        
                        <div v-if="isCaptain && userTeamId === 1" class="side-selection">
                          <button 
                            class="side-btn red-side" 
                            @click="pickSide('red')"
                          >
                            选择红方
                          </button>
                          <button 
                            class="side-btn blue-side" 
                            @click="pickSide('blue')"
                          >
                            选择蓝方
                          </button>
                        </div>
                        
                        <div v-else class="waiting-for-side-pick">
                          <p>等待一队队长选择...</p>
                        </div>
                      </div>
                      
                      <!-- 双方阵容展示 -->
                      <div class="teams-composition">
                        <!-- 一队已选择的角色 -->
                        <div class="team-composition team-red">
                          <h3>一队阵容</h3>
                          <div class="team-characters">
                            <div 
                              v-for="char in pickedCharacters.filter(c => c.teamId === 1)" 
                              :key="char.characterId"
                              class="team-character"
                            >
                              <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                              <div class="character-name">{{ char.characterName }}</div>
                            </div>
                          </div>
                        </div>
                        
                        <!-- 二队已选择的角色 -->
                        <div class="team-composition team-blue">
                          <h3>二队阵容</h3>
                          <div class="team-characters">
                            <div 
                              v-for="char in pickedCharacters.filter(c => c.teamId === 2)" 
                              :key="char.characterId"
                              class="team-character"
                            >
                              <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                              <div class="character-name">{{ char.characterName }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- 等待游戏开始界面 -->
              <template v-else-if="room.status === 'waiting-game'">
                <div class="room-body waiting-game-phase">
                  <div class="section-card waiting-game-container">
                    <div class="card-header">
                      <h2 class="section-title">等待游戏开始</h2>
                    </div>
                    
                    <div class="waiting-game-content">
                      <div class="waiting-game-message">
                        <p>
                          一队已选择 {{ room.teams[0]?.side === 'red' ? '红方' : '蓝方' }}，
                          二队将使用 {{ room.teams[0]?.side === 'red' ? '蓝方' : '红方' }}
                        </p>
                        <p>所有玩家请在游戏客户端中建立自定义房间，按照分配加入对应队伍</p>
                        
                        <div v-if="isCreator" class="start-game-section">
                          <p>请在确认所有玩家已准备就绪后开始游戏</p>
                          <el-button type="success" @click="startGame" class="start-game-btn">
                            开始游戏
                          </el-button>
                        </div>
                        
                        <div v-else class="waiting-for-game-start">
                          <p>等待房主开始游戏...</p>
                        </div>
                      </div>
                      
                      <!-- 双方阵容展示 -->
                      <div class="teams-composition">
                        <!-- 一队已选择的角色 -->
                        <div class="team-composition" :class="room.teams[0]?.side === 'red' ? 'side-red' : 'side-blue'">
                          <h3>
                            一队阵容
                            <span class="side-label">
                              {{ room.teams[0]?.side === 'red' ? '红方' : '蓝方' }}
                            </span>
                          </h3>
                          <div class="team-characters">
                            <div 
                              v-for="char in pickedCharacters.filter(c => c.teamId === 1)" 
                              :key="char.characterId"
                              class="team-character"
                            >
                              <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                              <div class="character-name">{{ char.characterName }}</div>
                            </div>
                          </div>
                        </div>
                        
                        <!-- 二队已选择的角色 -->
                        <div class="team-composition" :class="room.teams[0]?.side === 'red' ? 'side-blue' : 'side-red'">
                          <h3>
                            二队阵容
                            <span class="side-label">
                              {{ room.teams[0]?.side === 'red' ? '蓝方' : '红方' }}
                            </span>
                          </h3>
                          <div class="team-characters">
                            <div 
                              v-for="char in pickedCharacters.filter(c => c.teamId === 2)" 
                              :key="char.characterId"
                              class="team-character"
                            >
                              <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                              <div class="character-name">{{ char.characterName }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- 游戏中界面 -->
              <template v-else-if="room.status === 'gaming'">
                <div class="room-body gaming-phase">
                  <div class="section-card gaming-container">
                    <div class="card-header">
                      <h2 class="section-title">游戏进行中</h2>
                    </div>
                    
                    <div class="gaming-content">
                      <div class="gaming-message">
                        <p>游戏已开始，对局数据将在游戏结束后更新</p>
                        <div class="game-timer">
                          <div class="timer-label">游戏时长：</div>
                          <div class="timer">25:30</div>
                        </div>
                      </div>
                      
                      <!-- 双方阵容展示 -->
                      <div class="teams-composition">
                        <!-- 一队已选择的角色 -->
                        <div class="team-composition" :class="room.teams[0]?.side === 'red' ? 'side-red' : 'side-blue'">
                          <h3>
                            一队阵容
                            <span class="side-label">
                              {{ room.teams[0]?.side === 'red' ? '红方' : '蓝方' }}
                            </span>
                          </h3>
                          <div class="team-characters">
                            <div 
                              v-for="char in pickedCharacters.filter(c => c.teamId === 1)" 
                              :key="char.characterId"
                              class="team-character"
                            >
                              <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                              <div class="character-name">{{ char.characterName }}</div>
                            </div>
                          </div>
                        </div>
                        
                        <!-- 二队已选择的角色 -->
                        <div class="team-composition" :class="room.teams[0]?.side === 'red' ? 'side-blue' : 'side-red'">
                          <h3>
                            二队阵容
                            <span class="side-label">
                              {{ room.teams[0]?.side === 'red' ? '蓝方' : '红方' }}
                            </span>
                          </h3>
                          <div class="team-characters">
                            <div 
                              v-for="char in pickedCharacters.filter(c => c.teamId === 2)" 
                              :key="char.characterId"
                              class="team-character"
                            >
                              <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                              <div class="character-name">{{ char.characterName }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
          
          <!-- 选择角色弹窗 -->
          <el-dialog
            v-model="characterPickingVisible"
            title="选择角色"
            width="800px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
          >
            <div class="character-grid">
              <div 
                v-for="character in characters" 
                :key="character.id"
                class="character-item"
                :class="{'disabled': pickedCharacters.some(c => c.characterId === character.id)}"
                @click="pickedCharacters.some(c => c.characterId === character.id) ? null : pickCharacter(character)"
              >
                <img :src="character.avatar" :alt="character.name" class="character-grid-avatar">
                <div class="character-grid-name">{{ character.name }}</div>
              </div>
            </div>
          </el-dialog>
          
          <!-- 选择红蓝方弹窗 -->
          <el-dialog
            v-model="sideSelectorVisible"
            title="选择红蓝方"
            width="600px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
          >
            <div class="side-selection-dialog">
              <div class="side-options">
                <div class="side-option red" @click="pickSide('red')">
                  <div class="side-icon">🔴</div>
                  <h3>红方</h3>
                  <p>选择红方作为您的队伍方</p>
                </div>
                
                <div class="side-option blue" @click="pickSide('blue')">
                  <div class="side-icon">🔵</div>
                  <h3>蓝方</h3>
                  <p>选择蓝方作为您的队伍方</p>
                </div>
              </div>
            </div>
          </el-dialog>
        </template>
        
        <el-empty 
          v-else 
          description="房间不存在或已被删除" 
          :image-size="200"
        >
          <el-button type="primary" @click="router.push('/rooms')">返回房间列表</el-button>
        </el-empty>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
/* 主容器样式 */
.room-detail-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  color: #fff;
  min-height: calc(100vh - 64px);
  background-color: #121320;
}

/* 房间头部 */
.room-header {
  background-color: #1e1f2d;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.room-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.room-title h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #fff;
}

.room-status {
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-waiting {
  background-color: #fda92c;
  color: #fff;
}

.status-picking {
  background-color: #5f79fc;
  color: #fff;
}

.status-waiting-game {
  background-color: #a67edd;
  color: #fff;
}

.status-gaming {
  background-color: #00cfa1;
  color: #fff;
}

.status-ended {
  background-color: #f56c6c;
  color: #fff;
}

.room-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.room-info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  color: #8b8fa3;
  font-size: 0.9rem;
}

.info-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
}

.room-description {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.room-description h3 {
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  color: #fff;
}

.room-description p {
  color: #8b8fa3;
  line-height: 1.6;
}

/* 测试导航按钮 */
.test-buttons {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.test-buttons h4 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: #ff9800;
}

.test-button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* 队长提示 */
.captain-prompt {
  margin-bottom: 1.5rem;
}

.room-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  font-weight: 500;
}

/* 主要内容区域 */
.main-content {
  display: flex;
  gap: 1.5rem;
  height: calc(100vh - 350px);
  min-height: 500px;
  position: relative;
  transition: all 0.3s ease;
}

.sidebar {
  background-color: #1e1f2d;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.sidebar-collapsed .sidebar {
  width: 40px;
}

.sidebar-toggle {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.content-area {
  flex: 1;
  overflow: hidden;
  background-color: #1e1f2d;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 聊天区域 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 60%;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-collapsed .chat-container,
.sidebar-collapsed .voice-container {
  display: none;
}

.chat-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-tab {
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: #8b8fa3;
  transition: all 0.3s;
}

.chat-tab.active {
  color: #fff;
  border-bottom: 2px solid #5f79fc;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  display: flex;
  margin-bottom: 1rem;
  align-items: flex-start;
}

.message-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  margin-right: 0.75rem;
  object-fit: cover;
}

.message-content {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 0.75rem;
  border-radius: 8px;
}

.message-author {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.message-time {
  font-size: 0.75rem;
  color: #8b8fa3;
  margin-left: 0.5rem;
}

.system-message {
  justify-content: center;
  color: #8b8fa3;
  font-style: italic;
}

.system-message .message-content {
  background-color: rgba(95, 121, 252, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  flex: initial;
  color: #5f79fc;
}

.chat-input {
  display: flex;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input input {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
}

.chat-actions {
  display: flex;
  margin-left: 0.5rem;
}

.btn-emoji, .btn-send {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  border: none;
  background-color: rgba(0, 0, 0, 0.3);
  color: #8b8fa3;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: 0.5rem;
}

.btn-send {
  background-color: #5f79fc;
  color: white;
}

.btn-emoji:hover, .btn-send:hover {
  transform: translateY(-2px);
}

/* 语音区域样式 */
.voice-container {
  flex: 0 0 auto;
  height: calc(100% - 600px - 1px); /* 减去观众栏高度和边框 */
  min-height: 180px;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: hidden;
}

.voice-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-mic, .btn-speaker {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: none;
  background-color: rgba(0, 0, 0, 0.3);
  color: #8b8fa3;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-mic.active, .btn-speaker.active {
  background-color: #5f79fc;
  color: white;
}

.voice-participants {
  flex: 1;
  overflow-y: auto;
  margin: 0.5rem 0;
  max-height: calc(100% - 100px); /* 留出空间给标题和按钮 */
}

.voice-participant {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.voice-participant.speaking {
  background-color: rgba(255, 255, 255, 0.05);
}

.voice-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  margin-right: 0.75rem;
  object-fit: cover;
}

.participant-name {
  flex: 1;
}

.voice-indicator {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.speaking .voice-indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #00cfa1;
  opacity: 0.8;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.5);
    opacity: 0.8;
  }
}

.join-voice-btn {
  display: block;
  width: 100%;
  padding: 0.75rem;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #5f79fc;
}

.btn-danger {
  background-color: #f56c6c;
}

.join-voice-btn:hover {
  filter: brightness(1.1);
}

/* 玩家列表部分 */
.room-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.section-card {
  background-color: #1e1f2d;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.players-container {
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
}

.single-team {
  background-color: #1c1d29;
  padding: 0;
  overflow: hidden;
}

/* 玩家网格布局 */
.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.player-card {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.3s;
}

.player-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background-color: rgba(255, 255, 255, 0.08);
}

.player-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  margin-right: 0.75rem;
  object-fit: cover;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  white-space: nowrap;
}

.player-badge.creator {
  background-color: #f56c6c;
}

.player-badge.captain {
  background-color: #5f79fc;
}

.player-status {
  font-size: 0.8rem;
}

.player-status.online {
  color: #00cfa1;
}

.player-status.afk {
  color: #fda92c;
}

.empty-slot {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 0.75rem;
  color: #8b8fa3;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.empty-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  margin-right: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

/* 观众区域 */
.spectators-container {
  margin-top: 1rem;
}

.spectators-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.5rem;
}

.spectator {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.3s;
}

.spectator:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.spectator-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  margin-right: 0.75rem;
  object-fit: cover;
}

.spectator-name {
  color: #fff;
}

.empty-spectators {
  padding: 1.5rem;
  text-align: center;
  color: #8b8fa3;
}

/* 选人阶段样式 */
.picking-phase {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.picking-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.pick-status {
  color: #ff9800;
  font-weight: 600;
  margin-left: 10px;
}

.pick-content-container {
  display: flex;
  gap: 20px;
}

.teams-container {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.common-players-pool {
  flex: 2;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pool-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.pool-header h3 {
  color: #fff;
  font-size: 1.1rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pool-header h3::before {
  content: '👥';
  font-size: 1.2rem;
}

.pool-players {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  height: 100%;
  align-content: flex-start;
}

.pool-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
}

.pool-player.selectable {
  border-color: rgba(255, 152, 0, 0.3);
}

.pool-player.selectable:hover {
  background-color: rgba(255, 152, 0, 0.1);
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.pool-player-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #424242;
  transition: all 0.2s;
}

.pool-player.selectable:hover .pool-player-avatar {
  border-color: #ff9800;
}

.pool-player-name {
  margin-top: 5px;
  color: #fff;
  font-size: 0.9rem;
  text-align: center;
}

.team-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.team-red-section, .team-blue-section {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.team-red-section {
  border-left: 4px solid #ff9800; /* 橙色代替红色 */
}

.team-blue-section {
  border-left: 4px solid #00b0ff; /* 浅蓝色代替深蓝色 */
}

.team-red-section:hover, .team-blue-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.team-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.team-name {
  color: #fff;
  font-size: 1.1rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-name::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.team-red-section .team-name::before {
  background-color: #ff9800;
}

.team-blue-section .team-name::before {
  background-color: #00b0ff;
}

.current-pick-status {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  background-color: #ff9800;
  padding: 4px 8px;
  border-radius: 4px;
}

/* 更新当前选择的队伍样式 */
.team-red-section.active-team {
  background-color: rgba(255, 152, 0, 0.1);
}

.team-blue-section.active-team {
  background-color: rgba(0, 176, 255, 0.1);
}

.team-players-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.team-captain, .picked-player, .empty-pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px;
  position: relative;
}

.captain-badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  background-color: #ff9800;
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 1;
}

.captain-avatar, .picked-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #424242;
}

.captain-name, .picked-name {
  margin-top: 5px;
  color: #fff;
  font-size: 0.8rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.pick-order {
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
}

.empty-player {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 2px dashed #424242;
}

.pick-message {
  text-align: center;
  padding: 15px;
  color: #ff9800;
  background-color: rgba(255, 152, 0, 0.1);
  border-radius: 8px;
  font-weight: 500;
}

.chat-container-main {
  flex: 2;
  display: flex;
  flex-direction: column;
}

/* 聊天区域样式 */
.chat-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
}

.chat-tab {
  padding: 10px 15px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.chat-tab.active {
  color: #fff;
  border-bottom: 2px solid #ff9800;
}

.chat-tab:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
}

.message {
  display: flex;
  margin-bottom: 10px;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.message-content {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-radius: 8px;
}

.message-author {
  font-weight: 500;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
}

.message-time {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.system-message .message-content {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ff9800;
  text-align: center;
}

.chat-input {
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 0;
}

.chat-input input {
  background-color: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 4px;
  padding: 10px;
  color: #fff;
  margin-bottom: 10px;
}

.chat-actions {
  display: flex;
  justify-content: space-between;
}

.btn-emoji, .btn-send {
  background-color: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-send {
  background-color: #ff9800;
}

.btn-send:hover {
  background-color: #f57c00;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .main-content {
    flex-direction: column;
    height: auto;
  }
  
  .sidebar {
    width: 100%;
    height: 300px;
  }
  
  .sidebar-collapsed .sidebar {
    height: 40px;
    width: 100%;
  }
  
  .sidebar-toggle {
    transform: rotate(90deg);
  }
  
  .player-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  
  .teams-picks {
    flex-direction: column;
  }
  
  .side-options {
    flex-direction: column;
  }
  
  .picking-phase {
    flex-direction: column;
  }
  
  .teams-container {
    flex-direction: column;
  }
  
  .team-players-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }
  
  .pick-content-container {
    flex-direction: column;
  }
  
  .picking-phase {
    flex-direction: column;
  }
  
  .teams-container {
    flex-direction: column;
  }
  
  .team-players-grid {
    grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  }
}

@media (max-width: 576px) {
  .player-grid {
    grid-template-columns: 1fr;
  }
  
  .teams-picks {
    flex-direction: column;
  }
  
  .picked-characters {
    justify-content: center;
  }
}

/* 侧边栏观众席样式 */
.spectators-sidebar {
  padding-bottom: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.spectators-sidebar-list {
  overflow-y: auto;
  padding: 0.5rem 1rem;
  flex: 1;
}

.spectator-sidebar-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.spectator-sidebar-item:hover {
  transform: translateY(-2px);
  background-color: rgba(255, 255, 255, 0.08);
}

.empty-spectators-sidebar {
  padding: 1rem;
  text-align: center;
  color: #8b8fa3;
  font-style: italic;
}

/* 主区域聊天室样式 */
.chat-container-main {
  display: flex;
  flex-direction: column;
  height: 500px;
  overflow: hidden;
}

.chat-container-main .chat-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-container-main .chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chat-container-main .chat-input {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 待选玩家池移动端样式 */
@media (max-width: 992px) {
  .pool-players {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}

@media (max-width: 576px) {
  .pool-players {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .pool-player-avatar {
    width: 50px;
    height: 50px;
  }
}
</style>