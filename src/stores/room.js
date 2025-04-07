import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { roomApi } from '../services/api'
import { useUserStore } from './user'

/**
 * 房间管理Store
 * 处理房间列表和房间详情的状态管理
 */
export const useRoomStore = defineStore('room', () => {
  // 状态
  const rooms = ref([])
  const currentRoom = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    total: 0,
    current: 1,
    pageSize: 12
  })

  // 用户store
  const userStore = useUserStore()

  // 计算属性
  const isInRoom = computed(() => Boolean(currentRoom.value))
  const isRoomOwner = computed(() => {
    if (!currentRoom.value || !userStore.userId) return false
    return currentRoom.value.creatorId === userStore.userId
  })

  // 检查用户是否在房间中（作为玩家或观众）
  const isUserInRoom = (room) => {
    if (!room || !userStore.userId) return false
    
    const isPlayer = room.players && room.players.some(player => player.userId === userStore.userId);
    const isSpectator = room.spectators && room.spectators.some(spectator => spectator.userId === userStore.userId);
    
    return isPlayer || isSpectator;
  }

  // 方法
  // 获取房间列表
  const fetchRooms = async (params = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await roomApi.getRoomList(params)
      
      if (response.status === 'success') {
        // 修正：API返回的是 {data: {rooms: []}} 结构
        const roomsData = response.data?.rooms || response.data || []
        rooms.value = roomsData
        
        // 更新分页信息
        if (response.meta) {
          pagination.value.total = response.meta.total || roomsData.length
          pagination.value.current = response.meta.page || 1
          pagination.value.pageSize = response.meta.limit || 20
        } else {
          pagination.value.total = roomsData.length
        }
        
        console.log('获取房间列表成功，数量:', roomsData.length, roomsData)
        return roomsData
      } else {
        throw new Error(response.message || '获取房间列表失败')
      }
    } catch (err) {
      console.error('获取房间列表失败:', err)
      error.value = err.message || '获取房间列表失败，请稍后重试'
      return []
    } finally {
      loading.value = false
    }
  }

  // 获取我的房间列表
  const fetchMyRooms = async (params = {}) => {
    loading.value = true
    error.value = null
    
    try {
      // 使用当前登录用户的token
      const response = await roomApi.getUserRooms(params)
      
      if (response.status === 'success') {
        // 修正：获取正确的房间数据结构
        const userRooms = response.data?.rooms || response.data || []
        
        console.log('获取我的房间成功，数量:', userRooms.length, userRooms)
        return userRooms
      } else {
        throw new Error(response.message || '获取我的房间失败')
      }
    } catch (err) {
      console.error('获取我的房间失败:', err)
      error.value = err.message || '获取我的房间失败，请稍后重试'
      return []
    } finally {
      loading.value = false
    }
  }

  // 创建房间
  const createRoom = async (roomData) => {
    if (!userStore.isLoggedIn) {
      error.value = '请先登录'
      return null
    }
    
    loading.value = true
    error.value = null
    
    try {
      console.log('准备创建房间，数据:', roomData)
      
      // 确保必要字段存在
      const apiRoomData = {
        name: roomData.name,
        gameType: roomData.gameType || 'LOL',
        playerCount: roomData.playerCount || 10,
        pickMode: roomData.pickMode || 'random',
        description: roomData.description || '',
        password: roomData.password || ''
      }
      
      const response = await roomApi.createRoom(apiRoomData)
      
      if (response.status === 'success' && response.data) {
        console.log('房间创建成功, 服务器返回:', response.data)
        
        // 创建成功后自动设置为当前房间
        const roomInfo = response.data.room || response.data
        currentRoom.value = roomInfo
        
        // 添加到房间列表
        if (rooms.value && rooms.value.length > 0) {
          rooms.value = [roomInfo, ...rooms.value]
        }
        
        return roomInfo
      } else {
        throw new Error(response.message || '创建房间失败')
      }
    } catch (err) {
      console.error('创建房间失败:', err)
      error.value = err.message || '创建房间失败，请稍后重试'
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取房间详情
  const fetchRoomDetail = async (roomId) => {
    if (!roomId) {
      console.error('无法获取房间详情：缺少房间ID')
      error.value = '缺少房间ID'
      currentRoom.value = null
      return null
    }
    
    loading.value = true
    error.value = null
    
    try {
      console.log(`正在获取房间 ${roomId} 的详情`)
      const response = await roomApi.getRoomDetail(roomId)
      
      if (response.status === 'success' && response.data) {
        console.log('服务器返回的原始房间数据:', response.data)
        
        // 完全重置房间数据，不保留旧数据
        const roomData = response.data
        
        // 确保关键属性总是有值，防止前端报错
        roomData.players = roomData.players || []
        roomData.teams = roomData.teams || []
        roomData.spectators = roomData.spectators || []
        roomData.messages = roomData.messages || []
        
        // 更新当前房间数据
        currentRoom.value = roomData
        console.log('处理后的房间数据:', currentRoom.value)
        
        return roomData
      } else {
        console.error('获取房间详情失败:', response.message || '未知错误')
        throw new Error(response.message || '获取房间详情失败')
      }
    } catch (err) {
      console.error('获取房间详情失败:', err)
      error.value = err.message || '获取房间详情失败，请稍后重试'
      // 出错时清空当前房间数据，避免使用旧数据
      currentRoom.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  // 加入房间
  const joinRoom = async (roomId, password = null) => {
    if (!userStore.isLoggedIn) {
      error.value = '请先登录'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      console.log(`用户 ${userStore.username} (${userStore.userId}) 尝试加入房间 ${roomId}`)
      
      // 先获取房间详情，检查用户是否已经在房间中
      const roomDetail = await roomApi.getRoomDetail(roomId)
      
      if (roomDetail.status === 'success' && roomDetail.data) {
        const room = roomDetail.data
        
        // 检查用户是否已经在房间中
        if (isUserInRoom(room)) {
          console.log('用户已在房间中，无需再次加入')
          currentRoom.value = room
          return true
        }
      }
      
      // 只传递密码参数（如果有）
      const userData = password ? { password } : {};
      
      const response = await roomApi.joinRoom(roomId, userData)
      
      if (response.status === 'success') {
        console.log('成功加入房间，更新当前房间数据')
        currentRoom.value = response.data.room || response.data
        
        // 立即重新获取房间详情以确保数据最新
        await fetchRoomDetail(roomId)
        
        return true
      } else {
        throw new Error(response.message || '加入房间失败')
      }
    } catch (err) {
      console.error('加入房间失败:', err)
      error.value = err.message || '加入房间失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  // 离开房间
  const leaveRoom = async () => {
    if (!currentRoom.value || !userStore.isLoggedIn) return false
    
    loading.value = true
    error.value = null
    
    try {
      const response = await roomApi.leaveRoom(currentRoom.value.id, userStore.userId)
      
      if (response.status === 'success') {
        currentRoom.value = null
        return true
      } else {
        throw new Error(response.message || '离开房间失败')
      }
    } catch (err) {
      console.error('离开房间失败:', err)
      error.value = err.message || '离开房间失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  // 踢出玩家
  const kickPlayer = async (targetUserId) => {
    if (!currentRoom.value || !userStore.isLoggedIn) return false
    
    // 检查当前用户是否是房主
    if (!isRoomOwner.value) {
      error.value = '只有房主才能踢出玩家'
      return false
    }
    
    // 不能踢出自己
    if (targetUserId === userStore.userId) {
      error.value = '不能踢出自己'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await roomApi.kickPlayer(currentRoom.value.id, targetUserId)
      
      if (response.status === 'success') {
        // 更新房间数据，移除被踢出的玩家
        if (currentRoom.value.players) {
          currentRoom.value.players = currentRoom.value.players.filter(
            player => player.userId !== targetUserId
          )
        }
        
        // 从观众席移除
        if (currentRoom.value.spectators) {
          currentRoom.value.spectators = currentRoom.value.spectators.filter(
            spectator => spectator.userId !== targetUserId
          )
        }
        
        return true
      } else {
        throw new Error(response.message || '踢出玩家失败')
      }
    } catch (err) {
      console.error('踢出玩家失败:', err)
      error.value = err.message || '踢出玩家失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  // 开始游戏
  const startGame = async () => {
    if (!currentRoom.value || !isRoomOwner.value) {
      error.value = !isRoomOwner.value ? '只有房主才能开始游戏' : '没有加入房间'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await roomApi.startGame(currentRoom.value.id)
      
      if (response.status === 'success') {
        // 更新房间状态
        currentRoom.value = {
          ...currentRoom.value,
          status: 'in_progress'
        }
        return true
      } else {
        throw new Error(response.message || '开始游戏失败')
      }
    } catch (err) {
      console.error('开始游戏失败:', err)
      error.value = err.message || '开始游戏失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新房间设置
  const updateRoomSettings = async (settings) => {
    if (!currentRoom.value || !isRoomOwner.value) {
      error.value = !isRoomOwner.value ? '只有房主才能更改设置' : '没有加入房间'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await roomApi.updateRoomSettings(currentRoom.value.id, settings)
      
      if (response.status === 'success') {
        // 更新房间信息
        currentRoom.value = {
          ...currentRoom.value,
          ...response.data
        }
        return true
      } else {
        throw new Error(response.message || '更新房间设置失败')
      }
    } catch (err) {
      console.error('更新房间设置失败:', err)
      error.value = err.message || '更新房间设置失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  // 从观众席加入玩家列表
  const joinAsPlayer = async (roomId) => {
    if (!userStore.isLoggedIn) {
      error.value = '请先登录'
      return false
    }
    
    if (!roomId) {
      error.value = '房间ID不能为空'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      console.log(`用户 ${userStore.username} 尝试从观众席加入玩家列表, 房间ID: ${roomId}`)
      const response = await roomApi.joinAsPlayer(roomId)
      
      if (response.status === 'success') {
        console.log('成功加入玩家列表，更新当前房间数据')
        currentRoom.value = response.data.room || response.data
        
        // 立即重新获取房间详情以确保数据最新
        await fetchRoomDetail(roomId)
        
        return true
      } else {
        throw new Error(response.message || '加入玩家列表失败')
      }
    } catch (err) {
      console.error('加入玩家列表失败:', err)
      error.value = err.message || '加入玩家列表失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  // 从玩家列表进入观众席
  const joinAsSpectator = async (roomId) => {
    if (!userStore.isLoggedIn) {
      error.value = '请先登录'
      return false
    }
    
    if (!roomId) {
      error.value = '房间ID不能为空'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      console.log(`用户 ${userStore.username} 尝试从玩家列表进入观众席, 房间ID: ${roomId}`)
      const response = await roomApi.joinAsSpectator(roomId)
      
      if (response.status === 'success') {
        console.log('成功进入观众席，更新当前房间数据')
        currentRoom.value = response.data.room || response.data
        
        // 立即重新获取房间详情以确保数据最新
        await fetchRoomDetail(roomId)
        
        return true
      } else {
        throw new Error(response.message || '进入观众席失败')
      }
    } catch (err) {
      console.error('进入观众席失败:', err)
      error.value = err.message || '进入观众席失败，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    rooms,
    currentRoom,
    loading,
    error,
    pagination,
    
    // 计算属性
    isInRoom,
    isRoomOwner,
    
    // 方法
    fetchRooms,
    fetchMyRooms,
    createRoom,
    fetchRoomDetail,
    joinRoom,
    leaveRoom,
    kickPlayer,
    startGame,
    updateRoomSettings,
    joinAsPlayer,
    joinAsSpectator,
    isUserInRoom
  }
}) 