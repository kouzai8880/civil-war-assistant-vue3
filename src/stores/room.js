import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 房间状态管理
 * 处理房间创建、加入、状态更新等功能
 */
export const useRoomStore = defineStore('room', () => {
  // 状态
  const currentRoom = ref(null)
  const rooms = ref([])
  const myRooms = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // 计算属性
  const isRoomFull = computed(() => 
    currentRoom.value?.players?.length >= (currentRoom.value?.playerCount || 10)
  )
  
  const readyPlayers = computed(() => 
    currentRoom.value?.players?.filter(p => p.status === 'ready') || []
  )
  
  const isAllReady = computed(() => 
    readyPlayers.value.length === currentRoom.value?.players?.length &&
    currentRoom.value?.players?.length > 0
  )

  // 方法
  // 获取房间列表
  const fetchRooms = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟数据
      rooms.value = Array(10).fill().map((_, index) => ({
        id: `room-${index + 1}`,
        name: `测试房间 ${index + 1}`,
        creatorId: 'user-1',
        status: ['waiting', 'picking', 'gaming', 'ended'][Math.floor(Math.random() * 4)],
        playerCount: 10,
        teamCount: 2,
        createTime: new Date(Date.now() - Math.random() * 8640000).toISOString(),
        players: Array(Math.floor(Math.random() * 11)).fill().map((_, idx) => ({
          userId: `user-${idx + 1}`,
          status: ['online', 'ready'][Math.floor(Math.random() * 2)]
        }))
      }))
      
      return rooms.value
    } catch (err) {
      error.value = err.message || '获取房间列表失败'
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 获取我的房间
  const fetchMyRooms = async (userId) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟数据 - 筛选创建者为当前用户的房间
      myRooms.value = Array(3).fill().map((_, index) => ({
        id: `my-room-${index + 1}`,
        name: `我的房间 ${index + 1}`,
        creatorId: userId,
        status: ['waiting', 'gaming'][Math.floor(Math.random() * 2)],
        playerCount: 10,
        teamCount: 2,
        createTime: new Date(Date.now() - Math.random() * 8640000).toISOString(),
        players: Array(Math.floor(Math.random() * 11)).fill().map((_, idx) => ({
          userId: idx === 0 ? userId : `user-${idx + 1}`,
          status: ['online', 'ready'][Math.floor(Math.random() * 2)]
        }))
      }))
      
      return myRooms.value
    } catch (err) {
      error.value = err.message || '获取我的房间失败'
      return []
    } finally {
      isLoading.value = false
    }
  }

  // 获取房间详情
  const fetchRoomDetail = async (roomId) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟数据
      currentRoom.value = {
        id: roomId,
        name: `房间 ${roomId}`,
        creatorId: 'user-1',
        password: '',
        gameType: 'LOL',
        playerCount: 10,
        teamCount: 2,
        pickMode: '12221',
        status: 'waiting',
        createTime: new Date().toISOString(),
        players: Array(5).fill().map((_, idx) => ({
          userId: `user-${idx + 1}`,
          username: `玩家 ${idx + 1}`,
          teamId: idx < 2 ? 1 : 2,
          isCaptain: idx === 0 || idx === 2,
          status: ['online', 'ready'][Math.floor(Math.random() * 2)]
        })),
        teams: [
          {
            id: 1,
            name: '红队',
            side: 'none',
            captainId: 'user-1'
          },
          {
            id: 2,
            name: '蓝队',
            side: 'none',
            captainId: 'user-3'
          }
        ]
      }
      
      return currentRoom.value
    } catch (err) {
      error.value = err.message || '获取房间详情失败'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 创建房间
  const createRoom = async (roomData) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟创建成功
      const newRoom = {
        id: `room-${Date.now()}`,
        name: roomData.name,
        creatorId: roomData.creatorId,
        password: roomData.password || '',
        gameType: roomData.gameType || 'LOL',
        playerCount: roomData.playerCount || 10,
        teamCount: roomData.teamCount || 2,
        pickMode: roomData.pickMode || '12221',
        status: 'waiting',
        createTime: new Date().toISOString(),
        players: [{
          userId: roomData.creatorId,
          username: roomData.creatorName,
          teamId: null,
          isCaptain: false,
          status: 'online'
        }],
        teams: [
          {
            id: 1,
            name: '红队',
            side: 'none',
            captainId: null
          },
          {
            id: 2,
            name: '蓝队',
            side: 'none',
            captainId: null
          }
        ]
      }
      
      currentRoom.value = newRoom
      rooms.value.unshift(newRoom)
      myRooms.value.unshift(newRoom)
      
      return newRoom
    } catch (err) {
      error.value = err.message || '创建房间失败'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 加入房间
  const joinRoom = async (roomId, userData) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 查找房间
      await fetchRoomDetail(roomId)
      
      if (!currentRoom.value) {
        throw new Error('房间不存在')
      }
      
      if (isRoomFull.value) {
        throw new Error('房间已满')
      }
      
      // 添加玩家
      const newPlayer = {
        userId: userData.id,
        username: userData.username,
        teamId: null,
        isCaptain: false,
        status: 'online'
      }
      
      currentRoom.value.players.push(newPlayer)
      
      return currentRoom.value
    } catch (err) {
      error.value = err.message || '加入房间失败'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 更新准备状态
  const toggleReady = async (userId, isReady) => {
    if (!currentRoom.value) return false
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 更新玩家状态
      const playerIndex = currentRoom.value.players.findIndex(p => p.userId === userId)
      
      if (playerIndex >= 0) {
        currentRoom.value.players[playerIndex].status = isReady ? 'ready' : 'online'
        return true
      }
      
      return false
    } catch (err) {
      error.value = err.message || '更新准备状态失败'
      return false
    }
  }

  // 离开房间
  const leaveRoom = async (userId) => {
    if (!currentRoom.value) return false
    
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 移除玩家
      const playerIndex = currentRoom.value.players.findIndex(p => p.userId === userId)
      
      if (playerIndex >= 0) {
        currentRoom.value.players.splice(playerIndex, 1)
        
        // 如果是房主，转移房主权限
        if (currentRoom.value.creatorId === userId && currentRoom.value.players.length > 0) {
          currentRoom.value.creatorId = currentRoom.value.players[0].userId
        }
        
        // 如果房间没有玩家，关闭房间
        if (currentRoom.value.players.length === 0) {
          // TODO: 实现关闭房间逻辑
        }
        
        return true
      }
      
      return false
    } catch (err) {
      error.value = err.message || '离开房间失败'
      return false
    }
  }

  return {
    // 状态
    currentRoom,
    rooms,
    myRooms,
    isLoading,
    error,
    
    // 计算属性
    isRoomFull,
    readyPlayers,
    isAllReady,
    
    // 方法
    fetchRooms,
    fetchMyRooms,
    fetchRoomDetail,
    createRoom,
    joinRoom,
    toggleReady,
    leaveRoom
  }
}) 