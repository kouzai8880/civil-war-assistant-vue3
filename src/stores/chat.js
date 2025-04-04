import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 聊天状态管理
 * 处理聊天消息、聊天频道和语音聊天
 */
export const useChatStore = defineStore('chat', () => {
  // 状态
  const messages = ref([])
  const activeChannel = ref('public')  // 'public', 'team-1', 'team-2'
  const unreadCount = ref({
    public: 0,
    'team-1': 0,
    'team-2': 0
  })
  const isVoiceEnabled = ref(false)
  const isMuted = ref(false)

  // 计算属性
  const filteredMessages = computed(() => {
    return messages.value.filter(msg => msg.channel === activeChannel.value)
  })

  // 方法
  // 发送消息
  const sendMessage = (content, channel = activeChannel.value, type = 'text') => {
    const message = {
      id: Date.now().toString(),
      userId: 'current-user', // 稍后会从用户状态中获取
      username: '当前用户',
      content,
      channel,
      type,
      time: new Date().toISOString()
    }
    
    messages.value.push(message)
    
    // 后续会集成WebSocket发送消息
    return message
  }

  // 接收消息
  const receiveMessage = (message) => {
    messages.value.push(message)
    
    // 如果接收的消息不是当前活动频道，增加未读计数
    if (message.channel !== activeChannel.value) {
      unreadCount.value[message.channel]++
    }
    
    return message
  }

  // 切换频道
  const switchChannel = (channel) => {
    activeChannel.value = channel
    unreadCount.value[channel] = 0 // 切换后重置未读计数
  }

  // 切换语音状态
  const toggleVoice = () => {
    isVoiceEnabled.value = !isVoiceEnabled.value
    return isVoiceEnabled.value
  }

  // 切换静音状态
  const toggleMute = () => {
    isMuted.value = !isMuted.value
    return isMuted.value
  }

  // 加载历史消息
  const loadHistory = async (roomId, channel) => {
    try {
      // 模拟API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 模拟历史消息
      const mockHistory = Array(20).fill().map((_, index) => ({
        id: `msg-${index}`,
        userId: `user-${index % 5 + 1}`,
        username: `玩家 ${index % 5 + 1}`,
        content: `这是一条测试消息 ${index + 1}`,
        channel,
        type: 'text',
        time: new Date(Date.now() - (index * 60000)).toISOString()
      }))
      
      // 按时间排序，最新的消息在后面
      mockHistory.sort((a, b) => new Date(a.time) - new Date(b.time))
      
      messages.value = [...mockHistory]
      return mockHistory
    } catch (error) {
      console.error('加载历史消息失败:', error)
      return []
    }
  }

  // 清空消息
  const clearMessages = () => {
    messages.value = []
    unreadCount.value = {
      public: 0,
      'team-1': 0,
      'team-2': 0
    }
  }

  return {
    // 状态
    messages,
    activeChannel,
    unreadCount,
    isVoiceEnabled,
    isMuted,
    
    // 计算属性
    filteredMessages,
    
    // 方法
    sendMessage,
    receiveMessage,
    switchChannel,
    toggleVoice,
    toggleMute,
    loadHistory,
    clearMessages
  }
}) 