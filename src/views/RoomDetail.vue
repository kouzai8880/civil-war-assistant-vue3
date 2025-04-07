<script setup>
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useRoomStore } from '../stores/room'
import { useSocketStore } from '../stores/socket'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const roomStore = useRoomStore()
const socketStore = useSocketStore()

// 房间ID
const roomId = computed(() => route.params.id)

// 房间详情
const room = computed(() => roomStore.currentRoom)

// 当前用户ID
const currentUserId = computed(() => userStore.userId)

// 用户是否已准备
const isReady = computed(() => {
  if (!room.value || !currentUserId.value || !room.value.players) return false
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
  if (!room.value || !currentUserId.value || !room.value.players) return false
  const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
  return currentPlayer && currentPlayer.isCaptain
})

// 用户所在队伍ID
const userTeamId = computed(() => {
  if (!room.value || !currentUserId.value || !room.value.players) return null
  const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
  return currentPlayer ? currentPlayer.teamId : null
})

// 用户是否在观众席
const isSpectator = computed(() => {
  if (!room.value || !currentUserId.value || !room.value.players) return true
  return !room.value.players.some(p => p.userId === currentUserId.value)
})

// 队伍是否已满
const isTeamFull = computed(() => {
  if (!room.value || !room.value.players) return true
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

// 常用的英雄头像列表，用于随机分配给玩家
const championIcons = [
  'Ahri', 'Annie', 'Ashe', 'Caitlyn', 'Darius', 
  'Ezreal', 'Garen', 'Jinx', 'Lux', 'Malphite',
  'Nami', 'Syndra', 'Thresh', 'Yasuo', 'Zed',
  'Akali', 'Ekko', 'Fiora', 'Irelia', 'Jhin',
  'Kaisa', 'LeeSin', 'Lulu', 'MasterYi', 'Pyke',
  'Riven', 'Sett', 'Vayne', 'Yone', 'Yuumi'
]

// 生成英雄头像URL
const getChampionIcon = (index) => {
  const champion = championIcons[index % championIcons.length]
  return `https://ddragon.leagueoflegends.com/cdn/13.12.1/img/champion/${champion}.png`
}

// 模拟角色列表
const characters = ref([
  { id: 1, name: '玩家小明', avatar: getChampionIcon(0) },
  { id: 2, name: '玩家小红', avatar: getChampionIcon(1) },
  { id: 3, name: '玩家小刚', avatar: getChampionIcon(2) },
  { id: 4, name: '玩家小丽', avatar: getChampionIcon(3) },
  { id: 5, name: '玩家小华', avatar: getChampionIcon(4) },
  { id: 6, name: '玩家小芳', avatar: getChampionIcon(5) },
  { id: 7, name: '玩家小龙', avatar: getChampionIcon(6) },
  { id: 8, name: '玩家小雪', avatar: getChampionIcon(7) },
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
    
    // 确保players数组已初始化
    if (!updatedRoom.players) {
      updatedRoom.players = [];
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
    
    // 确保players数组已初始化
    if (!updatedRoom.players) {
      updatedRoom.players = [];
    }
    
    // 确保当前用户是一队队长
    let userIsTeamOneCaptain = false;
    updatedRoom.players = updatedRoom.players.map(player => {
      if (player.userId === currentUserId.value) {
        player.teamId = 1; // 确保用户在一队
        player.isCaptain = true; // 设置为队长
        userIsTeamOneCaptain = true;
      } else if (player.teamId === 1 && userIsTeamOneCaptain) {
        player.isCaptain = false; // 确保一队只有一个队长
      }
      return player;
    });
    
    // 如果用户不在玩家列表中，添加他们
    if (!userIsTeamOneCaptain && currentUserId.value) {
      if (!updatedRoom.players) {
        updatedRoom.players = [];
      }
      
      updatedRoom.players.push({
        userId: currentUserId.value,
        username: userStore.username,
        avatar: userStore.avatar || getChampionIcon(8),
        teamId: 1,
        isCaptain: true,
        status: 'ready'
      });
    }
    
    // 确保有一些玩家被选择了
    if (pickedCharacters.value.length === 0) {
      // 为两个队伍各添加几个角色
      for (let i = 0; i < 4; i++) {
        pickedCharacters.value.push({
          characterId: characters.value[i].id,
          characterName: characters.value[i].name,
          characterAvatar: characters.value[i].avatar,
          teamId: i < 2 ? 1 : 2,
          pickOrder: i + 1
        });
      }
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

// 刷新定时器
const refreshInterval = ref(null)

// 加载房间数据
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  isLoading.value = true
  
  try {
    // 先获取房间详情
    const roomData = await roomStore.fetchRoomDetail(roomId.value)
    
    if (!roomData) {
      ElMessage.error('房间不存在或已被删除')
      router.push('/rooms')
      return
    }
    
    // 检查用户是否已经在房间中
    const isAlreadyInRoom = roomStore.isUserInRoom(roomData)
    
    if (!isAlreadyInRoom) {
      // 如果用户不在房间中，尝试加入房间
      const success = await roomStore.joinRoom(roomId.value)
      
      if (!success) {
        ElMessage.error(roomStore.error || '加入房间失败')
        router.push('/rooms')
        return
      }
    } else {
      console.log('用户已在房间中，无需再次加入')
    }
    
    // 初始化聊天消息
    if (roomData.messages && roomData.messages.length > 0) {
      messages.value.public = roomData.messages.filter(msg => !msg.teamId)
      messages.value.team1 = roomData.messages.filter(msg => msg.teamId === 1)
      messages.value.team2 = roomData.messages.filter(msg => msg.teamId === 2)
    }
    
    // 如果房间已经在选人阶段，初始化选人状态
    if (roomData.status === 'picking' && roomData.pickPhase) {
      pickingPhase.value = { ...roomData.pickPhase }
    }
    
    // 如果房间已经在选边阶段，初始化选边状态
    if (roomData.status === 'side-picking') {
      // 如果当前用户是一队队长，显示选边弹窗
      if (isCaptain.value && userTeamId.value === 1) {
        sideSelectorVisible.value = true
      }
    }
    
    // 如果房间已经在游戏中，初始化游戏状态
    if (roomData.status === 'gaming') {
      // 这里可以添加游戏状态的初始化逻辑
    }
    
  } catch (error) {
    console.error('加载房间失败:', error)
    ElMessage.error('加载房间失败，请稍后重试')
    router.push('/rooms')
  } finally {
    isLoading.value = false
  }
})

// 设置定期刷新
const setupRefreshInterval = () => {
  // 清除可能已存在的定时器
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  // 设置新的定时器，每5秒刷新一次
  refreshInterval.value = setInterval(() => {
    if (roomId.value) {
      console.log('定时刷新房间数据...')
      roomStore.fetchRoomDetail(roomId.value)
    }
  }, 5000)
  
  console.log('已设置房间数据定时刷新')
}

// 组件卸载时清除定时器
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    console.log('已清除房间数据定时刷新')
  }
})

// 将用户添加到观众席
const addUserToSpectators = async () => {
  if (!room.value || !room.value.spectators || !userStore.userId) return

  try {
    // 调用加入观众席API
    const success = await roomStore.joinAsSpectator(roomId.value)
    
    if (success) {
      console.log('成功加入观众席')
      ElMessage.success('已进入观众席')
      
      // 重新加载房间数据以获取最新状态
      await loadRoomDetail()
    } else {
      throw new Error(roomStore.error || '加入观众席失败')
    }
  } catch (error) {
    console.error('加入观众席失败:', error)
    ElMessage.error(error.message || '加入观众席失败，请稍后重试')
  }
}

// 加入队伍
const joinRoom = async () => {
  if (!room.value) return
  
  // 检查玩家数量是否已满
  if (room.value.players && room.value.players.length >= (room.value.playerCount || 10)) {
    ElMessage.warning('对局已满员')
    return
  }
  
  isLoading.value = true
  
  try {
    console.log(`用户 ${userStore.username} 正在调用API加入房间 ${roomId.value}...`)
    
    // 调用API加入房间（从观众席到玩家列表）
    const success = await roomStore.joinAsPlayer(roomId.value)
    
    if (success) {
      console.log('成功加入房间，服务端返回的房间数据:', room.value)
      ElMessage.success('已加入对局')
      
      // 重新加载房间数据以获取最新状态
      await loadRoomDetail()
    } else {
      throw new Error(roomStore.error || '加入房间失败')
    }
  } catch (error) {
    console.error('加入对局失败:', error)
    ElMessage.error(error.message || '加入对局失败，请稍后重试')
  } finally {
    isLoading.value = false
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
  if (!room.value) {
    console.error('无法开始选人：房间数据不存在')
    ElMessage.error('房间数据不存在')
    return
  }
  
  if (!isCreator.value) {
    console.error('无法开始选人：不是房主')
    ElMessage.warning('只有房主可以开始选人')
    return
  }
  
  if (!checkAllReady()) {
    console.log('还有玩家未准备，无法开始')
    ElMessage.warning('还有玩家未准备')
    return
  }
  
  try {
    console.log('开始选人阶段...')
    setRoomPhase('picking')
    ElMessage.success('已进入选人阶段')
  } catch (error) {
    console.error('开始选人失败', error)
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
  if (!room.value) {
    console.error('无法开始游戏：房间数据不存在')
    ElMessage.error('房间数据不存在')
    return
  }
  
  if (!isCreator.value) {
    console.error('无法开始游戏：不是房主')
    ElMessage.warning('只有房主可以开始游戏')
    return
  }
  
  // 检查两队是否有队员
  if (!room.value.teams || room.value.teams.length < 2) {
    console.error('无法开始游戏：队伍数据异常')
    ElMessage.error('队伍数据异常，无法开始游戏')
    return
  }
  
  // 检查是否已选择红蓝方
  if (!room.value.teams[0].side || !room.value.teams[1].side) {
    console.error('无法开始游戏：尚未选择红蓝方')
    ElMessage.warning('请先选择红蓝方')
    return
  }
  
  try {
    console.log('开始游戏...')
    setRoomPhase('gaming')
    addSystemMessage('游戏开始！祝各位玩家游戏愉快')
    ElMessage.success('游戏已开始')
  } catch (error) {
    console.error('开始游戏失败', error)
    ElMessage.error('开始游戏失败')
  }
}

// 离开房间
const leaveRoom = async () => {
  if (!room.value) {
    console.error('无法离开房间：房间数据不存在')
    router.push('/rooms')
    return
  }
  
  if (!userStore.userId) {
    console.error('无法离开房间：用户未登录')
    router.push('/login')
    return
  }
  
  console.log(`${userStore.username} 正在离开房间...`)
  
  try {
    // 调用API离开房间
    const success = await roomStore.leaveRoom()
    
    if (!success) {
      throw new Error(roomStore.error || '离开房间失败')
    }
    
    // 调用Socket离开房间
    socketStore.leaveRoom()
    
    // 如果是玩家，从玩家列表移除
    if (room.value.players) {
      const playerIndex = room.value.players.findIndex(p => p.userId === userStore.userId)
      if (playerIndex !== -1) {
        room.value.players.splice(playerIndex, 1)
        console.log(`已从玩家列表移除用户 ${userStore.username}`)
        addSystemMessage(`${userStore.username} 离开了队伍`)
      }
    }
    
    // 如果是观众，从观众列表移除
    if (room.value.spectators) {
      const spectatorIndex = room.value.spectators.findIndex(s => s.userId === userStore.userId)
      if (spectatorIndex !== -1) {
        room.value.spectators.splice(spectatorIndex, 1)
        console.log(`已从观众席移除用户 ${userStore.username}`)
      }
    }
    
    // 如果是房主且房间中还有其他玩家，将房主转移给第一个玩家
    if (isCreator.value && room.value.players && room.value.players.length > 0) {
      const newCreator = room.value.players[0]
      room.value.creatorId = newCreator.userId
      console.log(`房主已转移给 ${newCreator.username}`)
      addSystemMessage(`房主已转移给 ${newCreator.username}`)
    }
    
    console.log('成功离开房间')
    ElMessage.success('已离开房间')
    router.push('/rooms')
  } catch (error) {
    console.error('离开房间失败', error)
    ElMessage.error('离开房间失败')
    // 即使出错，仍然尝试返回房间列表
    setTimeout(() => {
      router.push('/rooms')
    }, 1000)
  }
}

// 踢出玩家
const kickPlayer = async (targetUserId, targetUsername) => {
  if (!isCreator.value) {
    ElMessage.warning('只有房主才能踢出玩家')
    return
  }
  
  if (targetUserId === userStore.userId) {
    ElMessage.warning('不能踢出自己')
    return
  }
  
  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      `确定要将 ${targetUsername} 踢出房间吗？`,
      '踢出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 调用API踢出玩家
    const success = await roomStore.kickPlayer(targetUserId)
    
    if (success) {
      ElMessage.success(`已踢出 ${targetUsername}`)
      addSystemMessage(`房主已将 ${targetUsername} 踢出房间`)
      
      // 从玩家列表和观众列表中移除
      if (room.value.players) {
        room.value.players = room.value.players.filter(p => p.userId !== targetUserId)
      }
      if (room.value.spectators) {
        room.value.spectators = room.value.spectators.filter(s => s.userId !== targetUserId)
      }
    } else {
      throw new Error(roomStore.error || '踢出玩家失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('踢出玩家失败', error)
      ElMessage.error(error.message || '踢出玩家失败')
    }
  }
}

// 发送聊天消息
const sendMessage = () => {
  if (!chatInput.value.trim()) {
    return
  }
  
  if (!room.value) {
    console.error('无法发送消息：房间数据不存在')
    ElMessage.error('房间数据不存在')
    return
  }
  
  if (!userStore.userId) {
    console.error('无法发送消息：用户未登录')
    ElMessage.error('请先登录')
    return
  }
  
  // 确保消息对象已初始化
  if (!messages.value[activeChat.value]) {
    console.error(`聊天频道 ${activeChat.value} 不存在`)
    messages.value[activeChat.value] = []
  }
  
  try {
    // 构建消息对象
    const newMessage = {
      id: Date.now(),
      userId: userStore.userId,
      username: userStore.username || '玩家',
      content: chatInput.value.trim(),
      time: new Date()
    }
    
    // 根据当前激活的聊天标签发送到对应频道
    messages.value[activeChat.value].push(newMessage)
    console.log(`向 ${activeChat.value} 频道发送消息: ${newMessage.content}`)
    
    // 清空输入框
    chatInput.value = ''
    
    // 自动滚动到底部
    nextTick(() => {
      const chatBox = document.querySelector('.chat-messages')
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight
      }
    })
  } catch (error) {
    console.error('发送消息失败', error)
    ElMessage.error('发送消息失败')
  }
}

// 添加系统消息
const addSystemMessage = (content) => {
  if (!content || typeof content !== 'string') {
    console.error('无法添加系统消息：内容无效', content)
    return
  }

  try {
    // 创建系统消息对象
    const systemMessage = {
      id: Date.now(),
      userId: 'system',
      username: '系统',
      content: content,
      time: new Date(),
      isSystem: true
    }
    
    // 确保所有聊天频道都已初始化
    if (!messages.value) {
      messages.value = {
        public: [],
        team1: [],
        team2: []
      }
    }
    
    // 添加到所有聊天频道
    Object.keys(messages.value).forEach(channel => {
      if (!messages.value[channel]) {
        messages.value[channel] = []
      }
      messages.value[channel].push(systemMessage)
    })
    
    console.log(`系统消息: ${content}`)
    
    // 自动滚动到底部
    nextTick(() => {
      const chatBox = document.querySelector('.chat-messages')
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight
      }
    })
  } catch (error) {
    console.error('添加系统消息失败', error)
  }
}

// 切换语音状态
const toggleVoice = () => {
  hasJoinedVoice.value = !hasJoinedVoice.value
  
  // 添加系统消息
  if (hasJoinedVoice.value) {
    if (room.value.status === 'waiting') {
      addSystemMessage(`${userStore.username} 加入了语音聊天`)
    } else {
      addSystemMessage(`${userStore.username} 加入了${activeVoiceTeam.value === 1 ? '一' : '二'}队语音聊天`)
    }
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

// 当前活跃的语音队伍
const activeVoiceTeam = ref(0) // 0表示公共，1表示一队，2表示二队

// 各队伍的语音参与者
const teamVoiceParticipants = computed(() => {
  if (!room.value || !hasJoinedVoice.value) return []
  
  // 根据当前选择的队伍语音频道过滤玩家
  if (activeVoiceTeam.value === 0 || room.value.status === 'waiting') {
    return room.value.players.filter(p => p.userId !== currentUserId.value && p.hasJoinedVoice)
  } else {
    return room.value.players.filter(p => 
      p.userId !== currentUserId.value && 
      p.hasJoinedVoice && 
      p.teamId === activeVoiceTeam.value
    )
  }
})

// 切换语音队伍
const switchVoiceTeam = (teamId) => {
  activeVoiceTeam.value = teamId
  
  if (hasJoinedVoice.value) {
    // 如果已经加入语音，则先退出
    hasJoinedVoice.value = false
    addSystemMessage(`${userStore.username} 离开了语音聊天`)
    
    // 然后重新加入新的队伍语音
    setTimeout(() => {
      hasJoinedVoice.value = true
      if (teamId === 0) {
        addSystemMessage(`${userStore.username} 加入了公共语音聊天`)
      } else {
        addSystemMessage(`${userStore.username} 加入了${teamId === 1 ? '一' : '二'}队语音聊天`)
      }
    }, 500)
  }
}

// 监听用户队伍变化，自动切换到对应队伍的语音
watch(userTeamId, (newTeamId) => {
  if (newTeamId && room.value && room.value.status !== 'waiting') {
    activeVoiceTeam.value = newTeamId
  }
})

// 监听房间状态变化
watch(() => room.value?.status, (newStatus) => {
  if (newStatus === 'waiting') {
    // 房间状态为等待中，切换到公共语音
    activeVoiceTeam.value = 0
  } else if (userTeamId.value) {
    // 房间状态变为选人阶段或之后，且用户已经有队伍
    activeVoiceTeam.value = userTeamId.value
  }
})

// 监听路由参数变化，当房间ID变化时重新加载
watch(() => route.params.id, (newId, oldId) => {
  if (newId !== oldId) {
    loadRoomDetail()
  }
})

// 加载房间详情
const loadRoomDetail = async () => {
  if (!roomId.value) {
    console.error('无法加载房间：没有房间ID')
    ElMessage.error('无法加载房间：没有房间ID')
    router.push('/rooms')
    return
  }
  
  isLoading.value = true
  
  try {
    // 延迟一下，确保 isLoading 状态完全应用
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log(`正在加载房间详情，ID: ${roomId.value}`)
    const result = await roomStore.fetchRoomDetail(roomId.value)
    
    if (!result || !room.value) {
      console.error('房间不存在或无法加载房间数据')
      ElMessage.error('无法加载房间详情，可能不存在或已关闭')
      // 延迟导航，给用户看到错误消息的时间
      setTimeout(() => {
        router.push('/rooms')
      }, 1500);
      return;
    }
    
    console.log('房间详情加载成功:', room.value)
    
    // 确保有观众列表
    if (!room.value.spectators) {
      room.value.spectators = []
    }
    
    // 确保有队伍列表
    if (!room.value.teams) {
      room.value.teams = [
        { id: 1, name: '一队', side: null, players: [] },
        { id: 2, name: '二队', side: null, players: [] }
      ]
    }
    
    // 确保玩家列表存在
    if (!room.value.players) {
      room.value.players = []
    }
    
    // 检查用户是否已经在房间中
    const isAlreadyInRoom = roomStore.isUserInRoom(room.value)
    
    if (!isAlreadyInRoom) {
      // 如果用户不在房间中，尝试加入房间
      const success = await roomStore.joinRoom(roomId.value)
      
      if (!success) {
        ElMessage.error(roomStore.error || '加入房间失败')
        setTimeout(() => {
          router.push('/rooms')
        }, 1500);
        return;
      }
    } else {
      console.log('用户已在房间中，无需再次加入')
    }
    
    // 确保当前用户在房间中，如果不在，添加到观众席
    if (currentUserId.value) {
      const currentPlayer = room.value.players.find(p => p.userId === currentUserId.value)
      const currentSpectator = room.value.spectators.find(s => s.userId === currentUserId.value)
      
      if (!currentPlayer && !currentSpectator) {
        // 将用户添加到观众席
        addUserToSpectators()
      }
    }
    
    // 如果房间状态为游戏中，但没有队伍信息，初始化队伍信息
    if (room.value.status === 'in_progress' && (!room.value.teams || room.value.teams.length === 0)) {
      // 初始化队伍数据
      initializeTeamsData()
    }
    
  } catch (error) {
    console.error('加载房间失败', error);
    ElMessage.error(roomStore.error || '加载房间详情失败，请稍后重试')
    
    // 如果房间加载失败，返回到房间列表
    setTimeout(() => {
      router.push('/rooms')
    }, 1500);
  } finally {
    // 延迟关闭加载状态，确保有足够的时间显示加载动画
    setTimeout(() => {
      isLoading.value = false
    }, 500);
  }
}

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
                  <h2 class="section-title">观众席 ({{ room.spectators?.length || 0 }})</h2>
                  
                  <div class="header-buttons">
                    <!-- 如果当前用户在玩家列表中，显示加入观众席按钮 -->
                    <el-button 
                      v-if="!isSpectator && room.status === 'waiting'"
                      type="primary"
                      size="small"
                      class="join-spectator-btn"
                      @click="addUserToSpectators"
                    >
                      观看模式
                    </el-button>
                  </div>
                </div>
                
                <div class="spectators-sidebar-list">
                  <div v-for="(spectator, index) in room.spectators || []" :key="spectator.userId" class="spectator-sidebar-item">
                    <img :src="spectator.avatar || getChampionIcon(index + 15)" alt="观众头像" class="spectator-avatar">
                    <span class="spectator-name">{{ spectator.username }}</span>
                    <!-- 添加踢出按钮 -->
                    <el-button 
                      v-if="isCreator && spectator.userId !== userStore.userId"
                      type="danger" 
                      size="small" 
                      @click="kickPlayer(spectator.userId, spectator.username)"
                      :icon="Delete"
                    >
                      踢出
                    </el-button>
                  </div>
                  
                  <div v-if="!room.spectators || room.spectators.length === 0" class="empty-spectators-sidebar">
                    暂无观众
                  </div>
                </div>
              </div>
              
              <!-- 语音区域 -->
              <div class="voice-container">
                <div class="card-header">
                  <h2 class="section-title">
                    {{ room.status === 'waiting' || activeVoiceTeam === 0 ? '公共语音' : 
                       activeVoiceTeam === 1 ? '一队语音' : '二队语音' }}
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
                
                <!-- 选人阶段以后的状态显示队伍语音选择 -->
                <div v-if="room.status !== 'waiting'" class="team-voice-tabs">
                  <div 
                    class="team-voice-tab" 
                    :class="{'active': activeVoiceTeam === 0}"
                    @click="switchVoiceTeam(0)"
                  >
                    公共语音
                  </div>
                  <div 
                    class="team-voice-tab" 
                    :class="{'active': activeVoiceTeam === 1}"
                    @click="switchVoiceTeam(1)"
                  >
                    一队语音
                  </div>
                  <div 
                    class="team-voice-tab" 
                    :class="{'active': activeVoiceTeam === 2}"
                    @click="switchVoiceTeam(2)"
                  >
                    二队语音
                  </div>
                </div>
                
                <div class="voice-participants">
                  <div class="voice-participant" :class="{'speaking': hasJoinedVoice}">
                    <img :src="userStore.avatar || getChampionIcon(8)" alt="您的头像" class="voice-avatar">
                    <span class="participant-name">{{ userStore.username }} (您)</span>
                    <div class="voice-indicator"></div>
                  </div>
                  <div v-for="participant in teamVoiceParticipants" :key="participant.userId" class="voice-participant speaking">
                    <img :src="participant.avatar" :alt="participant.username" class="voice-avatar">
                    <span class="participant-name">{{ participant.username }}</span>
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
              <!-- 分割成两个部分：主体内容和聊天区域 -->
              <div class="content-main-wrapper">
                <!-- 根据房间状态显示不同的内容 -->
                <div class="content-main">
                  <template v-if="room.status === 'waiting'">
                    <!-- 房间主体 - 等待中状态 -->
                    <div class="room-body">
                      <!-- 等待中状态的玩家列表 -->
                      <div class="section-card players-container" v-if="room.status === 'waiting'">
                        <div class="card-header">
                          <h2 class="section-title">玩家列表 ({{ room.players?.length || 0 }}/10)</h2>
                          
                          <div class="header-buttons">
                            <!-- 如果当前用户是观众且队伍未满，显示加入队伍按钮 -->
                            <el-button 
                              v-if="isSpectator && room.status === 'waiting' && !isTeamFull"
                              type="success"
                              size="small"
                              class="join-team-btn"
                              @click="joinRoom"
                            >
                              加入队伍
                            </el-button>
                          </div>
                        </div>
                        
                        <div class="player-grid">
                          <!-- 显示已加入的玩家 -->
                          <div 
                            v-for="player in room.players || []" 
                            :key="player.userId"
                            class="player-card"
                          >
                            <img :src="player.avatar || getChampionIcon(index + 9)" alt="玩家头像" class="player-avatar">
                            
                            <div class="player-info">
                              <div class="player-name">
                                {{ player.username }}
                                <span v-if="player.userId === room.creatorId" class="player-badge creator">房主</span>
                              </div>
                               
                              <div class="player-status" :class="player.status === 'ready' ? 'online' : 'afk'">
                                {{ player.status === 'ready' ? '已准备' : '未准备' }}
                              </div>
                            </div>
                            
                            <!-- 添加踢出按钮 -->
                            <el-button 
                              v-if="isCreator && player.userId !== userStore.userId"
                              type="danger" 
                              size="small" 
                              class="kick-button"
                              @click="kickPlayer(player.userId, player.username)"
                              :icon="Delete"
                            >
                              踢出
                            </el-button>
                          </div>
                          
                          <!-- 空位 -->
                          <div 
                            v-for="n in (10 - (room.players?.length || 0))" 
                            :key="`empty-slot-${n}`"
                            class="empty-slot"
                          >
                            <div class="empty-avatar"></div>
                            <div>等待加入...</div>
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
                                    v-for="player in (room.players || []).filter(p => p.teamId === 1 && p.isCaptain)" 
                                    :key="player.userId"
                                    class="team-captain"
                                  >
                                    <div class="captain-badge">队长</div>
                                    <img :src="player.avatar || getChampionIcon(index + 10)" alt="队长头像" class="captain-avatar">
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
                                    v-for="n in (5 - (room.players || []).filter(p => p.teamId === 1 && p.isCaptain).length - pickedCharacters.filter(c => c.teamId === 1).length)" 
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
                                    v-for="player in (room.players || []).filter(p => p.teamId === 2 && p.isCaptain)" 
                                    :key="player.userId"
                                    class="team-captain"
                                  >
                                    <div class="captain-badge">队长</div>
                                    <img :src="player.avatar || getChampionIcon(index + 10)" alt="队长头像" class="captain-avatar">
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
                                    v-for="n in (5 - (room.players || []).filter(p => p.teamId === 2 && p.isCaptain).length - pickedCharacters.filter(c => c.teamId === 2).length)" 
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
                    </div>
                  </template>
                  
                  <!-- 选边阶段 -->
                  <template v-else-if="room.status === 'side-picking'">
                    <div class="room-body side-picking-phase">
                      <div class="section-card side-picking-container">
                        <div class="card-header">
                          <h2 class="section-title">选择红蓝方</h2>
                          <div class="pick-status">
                            选人阶段已完成
                          </div>
                        </div>
                        
                        <div class="side-picking-content">
                          <div class="side-picking-message">
                            <div class="alert-message">
                              由一队队长选择红蓝方
                            </div>
                            
                            <div v-if="isCaptain && userTeamId === 1" class="side-selection">
                              <button 
                                class="side-btn red-side" 
                                @click="pickSide('red')"
                              >
                                <div class="side-icon">🔴</div>
                                <div>选择红方</div>
                              </button>
                              <button 
                                class="side-btn blue-side" 
                                @click="pickSide('blue')"
                              >
                                <div class="side-icon">🔵</div>
                                <div>选择蓝方</div>
                              </button>
                            </div>
                            
                            <div v-else class="waiting-for-side-pick">
                              <p>等待一队队长选择红蓝方...</p>
                            </div>
                          </div>
                          
                          <!-- 双方阵容展示 -->
                          <div class="teams-composition">
                            <!-- 一队已选择的角色 -->
                            <div class="team-composition team-red">
                              <h3>一队阵容 <span class="team-count">{{ pickedCharacters.filter(c => c.teamId === 1).length }}/5</span></h3>
                              <div class="team-characters">
                                <div 
                                  v-for="char in pickedCharacters.filter(c => c.teamId === 1)" 
                                  :key="char.characterId"
                                  class="team-character"
                                >
                                  <div class="pick-order">{{ char.pickOrder }}</div>
                                  <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                                  <div class="character-name">{{ char.characterName }}</div>
                                </div>

                                <!-- 空位 -->
                                <div 
                                  v-for="n in (5 - pickedCharacters.filter(c => c.teamId === 1).length)" 
                                  :key="`empty-team1-${n}`"
                                  class="empty-character"
                                >
                                  <div class="empty-avatar"></div>
                                  <div class="empty-name">等待选择</div>
                                </div>
                              </div>
                            </div>
                            
                            <!-- 二队已选择的角色 -->
                            <div class="team-composition team-blue">
                              <h3>二队阵容 <span class="team-count">{{ pickedCharacters.filter(c => c.teamId === 2).length }}/5</span></h3>
                              <div class="team-characters">
                                <div 
                                  v-for="char in pickedCharacters.filter(c => c.teamId === 2)" 
                                  :key="char.characterId"
                                  class="team-character"
                                >
                                  <div class="pick-order">{{ char.pickOrder }}</div>
                                  <img :src="char.characterAvatar" :alt="char.characterName" class="character-avatar">
                                  <div class="character-name">{{ char.characterName }}</div>
                                </div>

                                <!-- 空位 -->
                                <div 
                                  v-for="n in (5 - pickedCharacters.filter(c => c.teamId === 2).length)" 
                                  :key="`empty-team2-${n}`"
                                  class="empty-character"
                                >
                                  <div class="empty-avatar"></div>
                                  <div class="empty-name">等待选择</div>
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
                
                <!-- 始终显示的聊天区域 -->
                <div class="chat-wrapper">
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
                          <img :src="msg.avatar || getChampionIcon(20)" alt="头像" class="message-avatar">
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
                    
                    <!-- 聊天输入框部分 -->
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
              </div>
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
          v-else-if="!isLoading"
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
  flex-direction: row;
  align-items: center;
  padding: 1rem;
  background-color: rgba(30, 31, 45, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 10;
  margin: 0;
  gap: 10px;
}

.chat-input input {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 10px 15px;
  color: #fff;
  margin: 0;
}

.chat-input input:focus {
  border-color: #ff9800;
  outline: none;
}

.chat-actions {
  display: flex;
  gap: 5px;
}

.btn-emoji, 
.btn-send {
  min-width: 40px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background-color: rgba(0, 0, 0, 0.3);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-send {
  background-color: #ff9800;
  padding: 0 12px;
}

.btn-send:hover {
  background-color: #f57c00;
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
  padding: 1.5rem;
  min-height: 100%;
}

.picking-phase,
.side-picking-phase,
.waiting-game-phase,
.gaming-phase {
  padding: 0;
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
  position: relative;
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
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  box-shadow: none;
  background-color: transparent;
}

.chat-wrapper .card-header {
  padding: 12px 15px;
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.chat-wrapper .section-title {
  display: flex;
  align-items: center;
}

.chat-wrapper .section-title::before {
  content: '💬';
  margin-right: 8px;
  font-size: 1.1rem;
}

.chat-wrapper .chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin: 10px;
  min-height: 180px;
  max-height: calc(100% - 130px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-wrapper .chat-input {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  padding: 12px !important;
  background-color: rgba(30, 31, 45, 0.95) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 100 !important;
  margin: 0 !important;
  gap: 10px !important;
  height: 70px !important;
}

.chat-wrapper .chat-input input {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 10px 15px;
  color: #fff;
  margin: 0;
}

.chat-wrapper .chat-input input:focus {
  border-color: #ff9800;
  outline: none;
}

.chat-wrapper .chat-actions {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
}

.chat-wrapper .btn-emoji, 
.chat-wrapper .btn-send {
  min-width: 40px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background-color: rgba(0, 0, 0, 0.3);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-wrapper .btn-send {
  background-color: #ff9800;
  padding: 0 12px;
}

.chat-wrapper .btn-send:hover {
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

/* 选边阶段样式 */
.side-picking-content {
  padding: 2rem;
}

.side-picking-message {
  text-align: center;
  margin-bottom: 2rem;
}

.side-selection {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
}

.side-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 2.5rem;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.side-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.side-btn.red-side {
  background-color: rgba(220, 53, 69, 0.2);
  color: #dc3545;
  border: 2px solid #dc3545;
}

.side-btn.blue-side {
  background-color: rgba(13, 110, 253, 0.2);
  color: #0d6efd;
  border: 2px solid #0d6efd;
}

.side-btn.red-side:hover {
  background-color: rgba(220, 53, 69, 0.3);
}

.side-btn.blue-side:hover {
  background-color: rgba(13, 110, 253, 0.3);
}

.waiting-for-side-pick {
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: center;
}

.teams-composition {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  gap: 2rem;
}

.team-composition {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.team-composition.team-red, .team-composition.side-red {
  border-left: 4px solid #dc3545;
}

.team-composition.team-blue, .team-composition.side-blue {
  border-left: 4px solid #0d6efd;
}

.team-composition h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.side-label {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.1);
}

.side-red .side-label {
  background-color: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.side-blue .side-label {
  background-color: rgba(13, 110, 253, 0.2);
  color: #0d6efd;
}

.team-characters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.team-character {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  transition: all 0.3s;
}

.team-character:hover {
  transform: translateY(-3px);
  background-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.character-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  margin-bottom: 0.5rem;
  object-fit: cover;
}

.character-name {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 992px) {
  .side-picking-content {
    padding: 1rem;
  }
  
  .teams-composition {
    flex-direction: column;
  }
  
  .side-selection {
    flex-direction: column;
    gap: 1rem;
  }
  
  .team-characters {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }
}

.team-voice-tab:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.alert-message {
  background-color: rgba(255, 152, 0, 0.1);
  border-left: 3px solid #ff9800;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  color: #ff9800;
  font-weight: 500;
}

.pick-order {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #ff9800;
  color: white;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border: 2px solid #1e1f2d;
}

.team-character {
  position: relative;
}

.team-count {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: normal;
}

.empty-character {
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.empty-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  margin: 0 auto 0.5rem;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.empty-name {
  color: #8b8fa3;
  font-size: 0.9rem;
}

.side-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
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
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: rgba(255, 255, 255, 0.03);
  transition: all 0.2s;
}

.spectator-sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.spectator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 10px;
  object-fit: cover;
}

.spectator-name {
  font-size: 0.9rem;
  color: #fff;
  flex: 1;
}

.join-team-btn {
  margin-left: auto;
}

.join-spectator-btn {
  font-size: 0.8rem;
}

.empty-spectators-sidebar {
  padding: 20px;
  text-align: center;
  color: #a0a0a0;
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

.content-main-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.content-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0; /* 防止flex项目溢出 */
  padding-bottom: 10px;
}

.chat-wrapper {
  width: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 400px; /* 增加最小高度 */
  max-height: 500px; /* 限制最大高度 */
  background-color: rgba(0, 0, 0, 0.1);
  position: relative; /* 添加相对定位 */
  padding-bottom: 80px; /* 为输入框预留空间 */
}

.chat-wrapper .chat-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
  background-color: rgba(30, 31, 45, 0.95);
  z-index: 5;
}

.chat-wrapper .chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin: 10px;
  min-height: 180px;
  max-height: calc(100% - 130px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 确保聊天输入框样式正确 */
.chat-input {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  padding: 12px !important;
  background-color: rgba(30, 31, 45, 0.95) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 100 !important;
  margin: 0 !important;
  gap: 10px !important;
  height: 70px !important;
}

@media (max-width: 992px) {
  .chat-wrapper {
    min-height: 450px !important;
    max-height: none !important;
    padding-bottom: 70px !important;
  }
  
  .chat-wrapper .chat-messages {
    max-height: calc(100% - 80px) !important;
    min-height: 180px !important;
  }
  
  .chat-input {
    height: 60px !important;
  }
}

.chat-wrapper .chat-tab {
  padding: 10px 15px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.chat-wrapper .chat-tab.active {
  color: #fff;
  border-bottom: 2px solid #ff9800;
}

.chat-wrapper .chat-tab:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.chat-wrapper .message {
  display: flex;
  margin-bottom: 10px;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-wrapper .message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.chat-wrapper .message-content {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.chat-wrapper .message-author {
  font-weight: 500;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
}

.chat-wrapper .message-time {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.chat-wrapper .system-message .message-content {
  background-color: rgba(255, 152, 0, 0.08);
  color: #ff9800;
  text-align: center;
  font-weight: 500;
  padding: 8px 15px;
  border-radius: 20px;
  box-shadow: none;
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.chat-input input {
  flex: 1 !important;
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  padding: 8px 15px !important;
  color: #fff !important;
  margin: 0 !important;
  height: 40px !important;
}

.chat-actions {
  display: flex !important;
  gap: 8px !important;
  margin: 0 !important;
}

.btn-emoji, 
.btn-send {
  min-width: 40px !important;
  height: 40px !important;
  border-radius: 8px !important;
  border: none !important;
  color: #fff !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.btn-emoji {
  background-color: rgba(0, 0, 0, 0.3) !important;
}

.btn-send {
  background-color: #ff9800 !important;
  padding: 0 15px !important;
}

/* 语音相关样式 */
.team-voice-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
}

.team-voice-tab {
  flex: 1;
  padding: 8px 10px;
  text-align: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.team-voice-tab.active {
  color: #fff;
  border-bottom: 2px solid #ff9800;
  background-color: rgba(255, 152, 0, 0.1);
}

/* 玩家列表 -->
<div class="players-list">
  <h3>玩家列表 ({{ room.players.length }}/{{ room.maxPlayers }})</h3>
  <div class="player-items">
    <div v-for="player in room.players" :key="player.userId" class="player-item">
      <div class="player-info">
        <span class="player-name">{{ player.username }}</span>
        <span v-if="player.userId === room.creatorId" class="creator-badge">房主</span>
      </div>
      <div class="player-actions">
        <el-button 
          v-if="isCreator && player.userId !== userStore.userId"
          type="danger" 
          size="small" 
          @click="kickPlayer(player.userId, player.username)"
          :icon="Delete"
        >
          踢出
        </el-button>
      </div>
    </div>
  </div>
</div>

<!-- 观众列表 -->
<div class="spectators-list">
  <h3>观众列表 ({{ room.spectators.length }})</h3>
  <div class="spectator-items">
    <div v-for="spectator in room.spectators" :key="spectator.userId" class="spectator-item">
      <div class="spectator-info">
        <span class="spectator-name">{{ spectator.username }}</span>
      </div>
      <div class="spectator-actions">
        <el-button 
          v-if="isCreator && spectator.userId !== userStore.userId"
          type="danger" 
          size="small" 
          @click="kickPlayer(spectator.userId, spectator.username)"
          :icon="Delete"
        >
          踢出
        </el-button>
      </div>
    </div>
  </div>
</div>

.players-list,
.spectators-list {
  margin-bottom: 20px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 15px;
}

.players-list h3,
.spectators-list h3 {
  margin: 0 0 10px 0;
  color: #ff9800;
  font-size: 16px;
}

.player-items,
.spectator-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-item,
.spectator-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  transition: background-color 0.3s;
}

.player-item:hover,
.spectator-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.player-info,
.spectator-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-name,
.spectator-name {
  color: #fff;
  font-size: 14px;
}

.creator-badge {
  background-color: #ff9800;
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.player-actions,
.spectator-actions {
  display: flex;
  gap: 8px;
}

/* 确保踢出按钮样式正确 */
.el-button--danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

.el-button--danger:hover {
  background-color: #f78989;
  border-color: #f78989;
}

/* 玩家列表和观众列表样式 */
.players-sidebar,
.spectators-sidebar {
  margin-bottom: 20px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 15px;
}

.players-sidebar .card-header,
.spectators-sidebar .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.players-sidebar .section-title,
.spectators-sidebar .section-title {
  margin: 0;
  color: #ff9800;
  font-size: 16px;
}

.players-sidebar-list,
.spectators-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-sidebar-item,
.spectator-sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  transition: background-color 0.3s;
}

.player-sidebar-item:hover,
.spectator-sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.player-avatar,
.spectator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.player-name,
.spectator-name {
  color: #fff;
  font-size: 14px;
  flex: 1;
}

.creator-badge {
  background-color: #ff9800;
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.empty-players-sidebar,
.empty-spectators-sidebar {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 10px;
  font-style: italic;
}

/* 确保踢出按钮样式正确 */
.el-button--danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

.el-button--danger:hover {
  background-color: #f78989;
  border-color: #f78989;
}

/* 踢出按钮样式 */
.kick-button {
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 4px 8px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.player-card:hover .kick-button {
  opacity: 1;
}

.player-card {
  position: relative;
}
</style>