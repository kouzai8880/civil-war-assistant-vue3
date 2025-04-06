import io from 'socket.io-client'

// WebSocket实例
let socket = null

// WebSocket服务器地址
const SOCKET_URL = 'https://dvmxujshaduv.sealoshzh.site'

/**
 * 连接WebSocket
 * @param {string} token - 用户认证token
 * @returns {Promise} 连接结果Promise
 */
export const connectSocket = (token) => {
  return new Promise((resolve, reject) => {
    try {
      // 验证token是否有效
      if (!token) {
        console.error('WebSocket连接错误: 未提供token')
        reject(new Error('未提供有效token，无法建立WebSocket连接'))
        return
      }
      
      // 如果已连接，则断开重连
      if (socket && socket.connected) {
        socket.disconnect()
      }
      
      // 连接WebSocket服务器
      console.log('正在连接WebSocket服务器...')
      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token }, // 使用 auth 对象传递 token，这是推荐的做法
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      })
      
      // 连接成功
      socket.on('connect', () => {
        console.log('WebSocket连接成功，SocketID:', socket.id)
        resolve(socket)
      })
      
      // 连接错误
      socket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error)
        reject(new Error('WebSocket连接错误: ' + (error.message || '')))
        
        // 如果错误与认证相关，在控制台打印明确信息
        if (error.message && error.message.includes('认证失败')) {
          console.error('WebSocket认证错误: 请检查token是否有效')
          // 断开并清理连接
          if (socket) {
            socket.disconnect()
            socket = null
          }
        }
      })
      
      // 连接超时
      socket.on('connect_timeout', () => {
        console.error('WebSocket连接超时')
        reject(new Error('WebSocket连接超时'))
      })
    } catch (error) {
      console.error('连接WebSocket时发生错误:', error)
      reject(error)
    }
  })
}

/**
 * 断开WebSocket连接
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log('正在断开WebSocket连接...')
    socket.disconnect()
    socket = null
  }
}

/**
 * 获取当前WebSocket实例
 * @returns {Object|null} Socket.io实例
 */
export const getSocket = () => socket

/**
 * 加入房间
 * @param {string} roomId - 房间ID
 */
export const joinRoom = (roomId) => {
  if (!socket || !socket.connected) {
    console.error('WebSocket未连接，无法加入房间')
    return
  }
  
  console.log('加入房间:', roomId)
  socket.emit('joinRoom', { roomId })
}

/**
 * 离开房间
 * @param {string} roomId - 房间ID
 */
export const leaveRoom = (roomId) => {
  if (!socket || !socket.connected) {
    console.error('WebSocket未连接，无法离开房间')
    return
  }
  
  console.log('离开房间:', roomId)
  socket.emit('leaveRoom', { roomId })
}

/**
 * 发送语音状态更新
 * @param {string} roomId - 房间ID
 * @param {boolean} isMuted - 是否静音
 */
export const updateVoiceStatus = (roomId, isMuted) => {
  if (!socket || !socket.connected) {
    console.error('WebSocket未连接，无法更新语音状态')
    return
  }
  
  console.log('更新语音状态:', { roomId, isMuted })
  socket.emit('voiceStatus', { roomId, isMuted })
}

/**
 * 发送准备状态更新
 * @param {string} roomId - 房间ID
 * @param {boolean} isReady - 是否准备好
 */
export const updateReadyStatus = (roomId, isReady) => {
  if (!socket || !socket.connected) {
    console.error('WebSocket未连接，无法更新准备状态')
    return
  }
  
  console.log('更新准备状态:', { roomId, isReady })
  socket.emit('readyStatus', { roomId, isReady })
}

/**
 * 发送聊天消息到房间
 * @param {string} roomId - 房间ID
 * @param {string} message - 消息内容
 */
export const sendRoomMessage = (roomId, message) => {
  if (!socket || !socket.connected) {
    console.error('WebSocket未连接，无法发送消息')
    return
  }
  
  console.log('发送房间消息:', { roomId, message })
  socket.emit('chatMessage', { roomId, message })
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinRoom,
  leaveRoom,
  updateVoiceStatus,
  updateReadyStatus,
  sendRoomMessage
} 