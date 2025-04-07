import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSocket, connectSocket, disconnectSocket, lobbyApi, roomApi, voiceApi } from '../services/socket'
import { useUserStore } from './user'

/**
 * WebSocket连接状态管理
 */
export const useSocketStore = defineStore('socket', () => {
  // 状态
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref(null)
  const connectionAttempts = ref(0)
  const maxConnectionAttempts = 3
  const listeners = ref({})
  const currentRoomId = ref(null)
  const isInLobby = ref(false)
  const voiceEnabled = ref(false)
  const isMuted = ref(false)

  // 获取用户store
  const userStore = useUserStore()

  // 计算属性
  const isConnected = computed(() => connected.value)
  const isInRoom = computed(() => Boolean(currentRoomId.value))

  // 方法
  // 初始化WebSocket连接
  const connect = async () => {
    if (connected.value || connecting.value) return true
    
    connecting.value = true
    error.value = null
    connectionAttempts.value = 0
    
    try {
      // 获取token并验证有效性
      const token = userStore.token
      if (!token) {
        throw new Error('未登录，无法建立WebSocket连接')
      }
      
      // 验证是否能获取用户信息，确保token有效
      const userData = userStore.userInfo
      if (!userData || !userData.id) {
        throw new Error('无法获取用户信息，token可能已过期')
      }
      
      // 等待连接完成
      await connectSocket(token, userData.avatar)
      
      // 验证连接状态
      const socket = getSocket()
      if (!socket || !socket.connected) {
        throw new Error('WebSocket连接失败')
      }
      
      connected.value = true
      setupEventListeners()
      return true
    } catch (err) {
      console.error('WebSocket连接失败:', err.message)
      error.value = err.message || 'WebSocket连接失败'
      connected.value = false
      
      // 如果未超过最大重试次数，自动重试
      if (connectionAttempts.value < maxConnectionAttempts) {
        connectionAttempts.value++
        console.log(`WebSocket连接失败，正在进行第 ${connectionAttempts.value} 次重试...`)
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 2000))
        return await connect()
      }
      
      // 清理任何可能的连接
      try {
        disconnectSocket()
      } catch (cleanupErr) {
        console.warn('清理WebSocket连接时出错:', cleanupErr)
      }
      
      return false
    } finally {
      connecting.value = false
    }
  }

  // 断开WebSocket连接
  const disconnect = () => {
    if (!connected.value) return
    
    // 移除所有监听器
    cleanupListeners()
    
    // 断开连接
    disconnectSocket()
    connected.value = false
    currentRoomId.value = null
    isInLobby.value = false
    voiceEnabled.value = false
    isMuted.value = false
  }

  // 重新连接
  const reconnect = async () => {
    disconnect()
    return await connect()
  }

  // 加入大厅
  const joinLobby = () => {
    if (!connected.value) {
      error.value = 'WebSocket未连接，无法加入大厅'
      return false
    }
    
    try {
      lobbyApi.joinLobby()
      isInLobby.value = true
      return true
    } catch (err) {
      error.value = err.message || '加入大厅失败'
      return false
    }
  }

  // 离开大厅
  const leaveLobby = () => {
    if (!connected.value || !isInLobby.value) return true
    
    try {
      lobbyApi.leaveLobby()
      isInLobby.value = false
      return true
    } catch (err) {
      error.value = err.message || '离开大厅失败'
      return false
    }
  }

  // 加入房间
  const joinRoom = (roomId) => {
    if (!connected.value) {
      error.value = 'WebSocket未连接，无法加入房间'
      return false
    }
    
    try {
      roomApi.joinRoom(roomId)
      currentRoomId.value = roomId
      return true
    } catch (err) {
      error.value = err.message || '加入房间失败'
      return false
    }
  }

  // 离开房间
  const leaveRoom = () => {
    if (!connected.value || !currentRoomId.value) return true
    
    try {
      roomApi.leaveRoom(currentRoomId.value)
      currentRoomId.value = null
      voiceEnabled.value = false
      isMuted.value = false
      return true
    } catch (err) {
      error.value = err.message || '离开房间失败'
      return false
    }
  }

  // 发送房间消息
  const sendRoomMessage = (content, type = 'text') => {
    if (!connected.value || !currentRoomId.value) {
      error.value = '未连接或未加入房间，无法发送消息'
      return false
    }
    
    try {
      roomApi.sendRoomMessage(currentRoomId.value, content, type)
      return true
    } catch (err) {
      error.value = err.message || '发送消息失败'
      return false
    }
  }

  // 开始语音通话
  const startVoice = () => {
    if (!connected.value || !currentRoomId.value) {
      error.value = '未连接或未加入房间，无法开始语音通话'
      return false
    }
    
    try {
      voiceApi.startVoice(currentRoomId.value)
      voiceEnabled.value = true
      return true
    } catch (err) {
      error.value = err.message || '开始语音通话失败'
      return false
    }
  }

  // 结束语音通话
  const endVoice = () => {
    if (!connected.value || !currentRoomId.value) {
      error.value = '未连接或未加入房间，无法结束语音通话'
      return false
    }
    
    try {
      voiceApi.endVoice(currentRoomId.value)
      voiceEnabled.value = false
      isMuted.value = false
      return true
    } catch (err) {
      error.value = err.message || '结束语音通话失败'
      return false
    }
  }

  // 设置静音状态
  const setMute = (muted) => {
    if (!connected.value || !currentRoomId.value || !voiceEnabled.value) {
      error.value = '未连接、未加入房间或未开启语音，无法设置静音'
      return false
    }
    
    try {
      voiceApi.setMute(currentRoomId.value, muted)
      isMuted.value = muted
      return true
    } catch (err) {
      error.value = err.message || '设置静音状态失败'
      return false
    }
  }

  // 设置事件监听器
  const setupEventListeners = () => {
    const socket = getSocket()
    if (!socket) return

    // 添加通用事件监听器，用于记录所有接收到的WebSocket事件
    socket.onAny((eventName, ...args) => {
      console.log(`[WebSocket事件] ${eventName}:`, args)
    })

    // 基础连接事件
    on('connect', () => {
      console.log('[WebSocket] 连接成功')
      connected.value = true
      error.value = null
    })
    
    on('disconnect', () => {
      console.log('[WebSocket] 连接断开')
      connected.value = false
      currentRoomId.value = null
      isInLobby.value = false
      voiceEnabled.value = false
      isMuted.value = false
    })
    
    on('error', (err) => {
      console.error('[WebSocket] 错误:', err)
      error.value = err.message || 'WebSocket错误'
    })

    // 大厅事件
    on('lobbyJoined', () => {
      console.log('[WebSocket] 加入大厅成功')
      isInLobby.value = true
    })

    on('lobbyLeft', () => {
      console.log('[WebSocket] 离开大厅')
      isInLobby.value = false
    })

    // 房间事件
    on('roomJoined', (data) => {
      console.log('[WebSocket] 加入房间成功:', data)
      currentRoomId.value = data.roomId
    })

    on('roomLeft', () => {
      console.log('[WebSocket] 离开房间')
      currentRoomId.value = null
      voiceEnabled.value = false
      isMuted.value = false
    })

    on('userKicked', (data) => {
      console.log('[WebSocket] 用户被踢出:', data)
      if (data.userId === userStore.userId) {
        currentRoomId.value = null
        voiceEnabled.value = false
        isMuted.value = false
      }
    })

    // 语音事件
    on('voiceStarted', () => {
      console.log('[WebSocket] 语音通话开始')
      voiceEnabled.value = true
    })

    on('voiceEnded', () => {
      console.log('[WebSocket] 语音通话结束')
      voiceEnabled.value = false
      isMuted.value = false
    })

    on('voiceMuted', (data) => {
      console.log('[WebSocket] 语音静音状态更新:', data)
      if (data.userId === userStore.userId) {
        isMuted.value = data.isMuted
      }
    })

    // 聊天事件
    on('lobbyMessage', (data) => {
      console.log('[WebSocket] 收到大厅消息:', data)
    })

    on('roomMessage', (data) => {
      console.log('[WebSocket] 收到房间消息:', data)
    })

    // 系统事件
    on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] 重新连接成功，尝试次数:', attemptNumber)
    })

    on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebSocket] 尝试重新连接，次数:', attemptNumber)
    })

    on('reconnect_error', (error) => {
      console.error('[WebSocket] 重新连接失败:', error)
    })

    on('reconnect_failed', () => {
      console.error('[WebSocket] 重新连接失败，已达到最大重试次数')
    })
  }

  // 注册事件监听
  const on = (event, callback) => {
    const socket = getSocket()
    if (!socket) return
    
    // 保存监听器引用，以便后续移除
    listeners.value[event] = callback
    socket.on(event, callback)
  }

  // 移除事件监听
  const off = (event) => {
    const socket = getSocket()
    if (!socket) return
    
    if (listeners.value[event]) {
      socket.off(event, listeners.value[event])
      delete listeners.value[event]
    }
  }

  // 清理所有监听器
  const cleanupListeners = () => {
    const socket = getSocket()
    if (!socket) return
    
    Object.keys(listeners.value).forEach(event => {
      socket.off(event, listeners.value[event])
    })
    
    listeners.value = {}
  }

  return {
    // 状态
    connected,
    connecting,
    error,
    connectionAttempts,
    maxConnectionAttempts,
    currentRoomId,
    isInLobby,
    voiceEnabled,
    isMuted,
    
    // 计算属性
    isConnected,
    isInRoom,
    
    // 方法
    connect,
    disconnect,
    reconnect,
    joinLobby,
    leaveLobby,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    startVoice,
    endVoice,
    setMute
  }
}) 