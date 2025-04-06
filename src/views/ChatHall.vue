<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage, ElSkeleton } from 'element-plus'

// 常用的英雄头像列表，用于随机分配
const championIcons = [
  'Ahri', 'Annie', 'Ashe', 'Caitlyn', 'Darius', 
  'Ezreal', 'Garen', 'Jinx', 'Lux', 'Malphite',
  'Nami', 'Syndra', 'Thresh', 'Yasuo', 'Zed',
  'Akali', 'Blitzcrank', 'Draven', 'Ekko', 'Fiora'
]

// 生成英雄头像URL
const getChampionIcon = (index = 0) => {
  const champion = championIcons[index % championIcons.length]
  return `https://ddragon.leagueoflegends.com/cdn/13.12.1/img/champion/${champion}.png`
}

const router = useRouter()
const userStore = useUserStore()

// 用户信息
const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentUser = computed(() => ({
  username: userStore.username,
  avatar: userStore.avatar || getChampionIcon()
}))

// 频道相关
const channels = ref([
  { 
    category: '公共频道',
    items: [
      { id: 'announcement', name: '全服公告', icon: '🌐', badge: 0, topic: '官方公告和重要通知' },
      { id: 'team', name: '组队大厅', icon: '💬', badge: 12, topic: '寻找队友和房间' },
      { id: 'guides', name: '攻略交流', icon: '🔍', badge: 0, topic: '分享游戏技巧和心得' },
      { id: 'esports', name: '赛事专区', icon: '🎯', badge: 0, topic: '讨论专业比赛和电竞资讯' }
    ]
  },
  {
    category: '我的频道',
    items: [
      { id: 'high-level', name: '高端玩家交流群', icon: '👥', badge: 0, topic: '高分段玩家讨论' },
      { id: 'weekend-league', name: '周末联赛', icon: '🏆', badge: 0, topic: '周末联赛交流群' }
    ]
  }
])

// 当前选中的频道
const currentChannel = ref(channels.value[0].items[0])

// 在线用户
const onlineUsers = ref([
  {
    group: '管理员',
    count: 2,
    users: [
      { id: 'admin', name: '系统管理员', avatar: getChampionIcon(10), status: 'online' },
      { id: 'moderator', name: '频道主持人', avatar: getChampionIcon(11), status: 'idle' }
    ]
  },
  {
    group: '在线玩家',
    count: 22,
    users: [
      { id: 'player1', name: '大神玩家', avatar: getChampionIcon(0), status: 'online' },
      { id: 'player2', name: '英雄大师', avatar: getChampionIcon(1), status: 'online' },
      { id: 'player3', name: '中路法师', avatar: getChampionIcon(2), status: 'dnd' },
      { id: 'player4', name: '上单剑客', avatar: getChampionIcon(3), status: 'online' },
      { id: 'player5', name: 'ADC大神', avatar: getChampionIcon(4), status: 'online' }
    ]
  }
])

// 聊天消息
const messages = ref([])
const chatInput = ref('')
const chatContainer = ref(null)
const isLoading = ref(false)

// 加载历史消息
const loadMessages = (channelId) => {
  // 清空现有消息
  messages.value = []
  
  // 设置加载状态
  isLoading.value = true
  
  // 模拟API调用获取消息
  setTimeout(() => {
    const mockMessages = [
      {
        type: 'system',
        content: `欢迎来到${currentChannel.value.name}频道！请遵守聊天规则，文明交流。`,
        time: formatTime(new Date())
      }
    ]
    
    if (channelId === 'announcement') {
      mockMessages.push(
        {
          type: 'user',
          userId: 'admin',
          avatar: getChampionIcon(10),
          name: '系统管理员',
          content: '内战助手已更新到最新版本！新增了聊天大厅功能和个人资料页面。',
          time: formatTime(new Date(Date.now() - 15 * 60000))
        },
        {
          type: 'user',
          userId: 'player2',
          avatar: getChampionIcon(1),
          name: '英雄大师',
          content: '新版本体验很好，特别是聊天功能非常方便！',
          time: formatTime(new Date(Date.now() - 12 * 60000))
        },
        {
          type: 'user',
          userId: 'admin',
          avatar: getChampionIcon(10),
          name: '系统管理员',
          content: '周末联赛将于本周六晚上8点开始，请各位玩家做好准备。',
          time: formatTime(new Date(Date.now() - 10 * 60000))
        },
        {
          type: 'user',
          userId: 'player4',
          avatar: getChampionIcon(3),
          name: '上单剑客',
          content: '我已经准备好了！希望能找到一个好队伍。',
          time: formatTime(new Date(Date.now() - 5 * 60000))
        }
      )
    } else if (channelId === 'team') {
      mockMessages.push(
        {
          type: 'user',
          userId: 'player3',
          avatar: getChampionIcon(2),
          name: '中路法师',
          content: '有人组队打排位吗？钻石水平中单，可以打野。',
          time: formatTime(new Date(Date.now() - 30 * 60000))
        },
        {
          type: 'user',
          userId: 'player5',
          avatar: getChampionIcon(4),
          name: 'ADC大神',
          content: '我是ADC，需要一个辅助，白金以上的来',
          time: formatTime(new Date(Date.now() - 25 * 60000))
        }
      )
    }
    
    messages.value = mockMessages
    
    // 添加一个延时，确保DOM更新后再滚动
    setTimeout(() => {
      scrollToBottom()
      // 结束加载状态，添加短暂延迟避免闪烁
      setTimeout(() => {
        isLoading.value = false
      }, 300)
    }, 100)
  }, 500) // 模拟网络延迟
}

// 格式化时间
const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 发送消息
const sendMessage = () => {
  if (!chatInput.value.trim()) return
  
  // 检查登录状态
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  const newMessage = {
    type: 'user',
    userId: currentUser.value.id,
    avatar: currentUser.value.avatar,
    name: currentUser.value.username,
    content: chatInput.value.trim(),
    time: formatTime(new Date())
  }
  
  messages.value.push(newMessage)
  chatInput.value = ''
  
  // 滚动到底部
  scrollToBottom()
}

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

// 切换频道
const switchChannel = (channel) => {
  currentChannel.value = channel
  loadMessages(channel.id)
  
  // 如果有通知数，重置
  const channelItem = channels.value
    .flatMap(category => category.items)
    .find(item => item.id === channel.id)
  
  if (channelItem && channelItem.badge > 0) {
    channelItem.badge = 0
  }
}

// 检查登录状态
onMounted(() => {
  if (!isLoggedIn.value) {
    ElMessage({
      message: '请登录以获取完整的聊天功能',
      type: 'info',
      duration: 3000
    })
  }
  
  // 加载初始频道的消息
  loadMessages(currentChannel.value.id)
})
</script>

<template>
  <div class="chat-hall-container">
    <!-- 频道侧边栏 -->
    <div class="channels-sidebar">
      <div class="channels-header">
        <h3 class="channels-title">聊天频道</h3>
        <button class="btn-icon">+</button>
      </div>
      <div class="channel-list">
        <el-skeleton v-if="isLoading" :rows="6" animated style="padding: 10px;" />
        <template v-else>
          <div v-for="category in channels" :key="category.category">
            <div class="channel-category">{{ category.category }}</div>
            <div 
              v-for="channel in category.items" 
              :key="channel.id"
              :class="['channel-item', { active: currentChannel.id === channel.id }]"
              @click="switchChannel(channel)"
            >
              <span class="channel-icon">{{ channel.icon }}</span>
              <span class="channel-name">{{ channel.name }}</span>
              <span v-if="channel.badge > 0" class="channel-badge">{{ channel.badge }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 聊天主区域 -->
    <div class="chat-main">
      <div class="chat-header">
        <div class="current-channel">
          <span class="current-channel-icon">{{ currentChannel.icon }}</span>
          <div class="current-channel-info">
            <span class="current-channel-name">{{ currentChannel.name }}</span>
            <span class="current-channel-topic">{{ currentChannel.topic }}</span>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="btn-icon" title="搜索消息">🔍</button>
          <button class="btn-icon" title="查看成员">👥</button>
          <button class="btn-icon" title="设置">⚙️</button>
        </div>
      </div>
      <div class="chat-messages-container" ref="chatContainer">
        <el-skeleton v-if="isLoading" :rows="6" animated style="padding: 20px;" />
        <div 
          v-else
          v-for="(message, index) in messages" 
          :key="index"
          :class="['chat-message', { 'system-message': message.type === 'system' }]"
        >
          <template v-if="message.type === 'system'">
            <div class="message-content">
              <span>{{ message.content }}</span>
            </div>
            <span class="message-time">{{ message.time }}</span>
          </template>
          <template v-else>
            <img :src="message.avatar" :alt="message.name" class="message-avatar">
            <div class="message-content">
              <span class="message-author">{{ message.name }}</span>
              <p>{{ message.content }}</p>
            </div>
            <span class="message-time">{{ message.time }}</span>
          </template>
        </div>
      </div>
      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <input 
            type="text" 
            class="chat-input-main" 
            placeholder="输入消息..." 
            v-model="chatInput"
            @keyup.enter="sendMessage"
          >
          <div class="chat-input-buttons">
            <button class="chat-input-button" title="表情">😊</button>
            <button class="chat-input-button" title="图片">🖼️</button>
            <button class="chat-input-button" title="发送" @click="sendMessage">📤</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 在线用户列表 -->
    <div class="online-users">
      <div class="online-users-header">
        <span>在线用户 ({{ onlineUsers.reduce((total, group) => total + group.count, 0) }})</span>
      </div>
      <div class="user-list">
        <el-skeleton v-if="isLoading" :rows="8" animated style="padding: 10px;" />
        <template v-else>
          <div class="user-group" v-for="group in onlineUsers" :key="group.group">
            <div class="user-group-name">{{ group.group }} ({{ group.count }})</div>
            <div class="user-item" v-for="user in group.users" :key="user.id">
              <div :class="['user-status', `status-${user.status}`]"></div>
              <img :src="user.avatar" :alt="user.name" class="user-avatar">
              <span class="user-name">{{ user.name }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-hall-container {
  display: flex;
  height: calc(100vh - 80px);
  margin-top: 20px;
}

.channels-sidebar {
  width: 250px;
  background-color: #1E1F2D;
  border-radius: 8px 0 0 8px;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.channels-header {
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.channels-title {
  font-weight: bold;
  font-size: 1.1rem;
  margin: 0;
}

.channel-list {
  padding: 10px 0;
}

.channel-category {
  padding: 5px 15px;
  font-size: 0.8rem;
  color: #a0a0a0;
  font-weight: 500;
  text-transform: uppercase;
  margin-top: 15px;
}

.channel-item {
  padding: 8px 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #a0a0a0;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
}

.channel-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.channel-item.active {
  background-color: rgba(95, 121, 252, 0.2);
  color: #5F79FC;
  border-left-color: #5F79FC;
}

.channel-icon {
  margin-right: 10px;
  font-size: 1.1rem;
}

.channel-name {
  flex: 1;
}

.channel-badge {
  background-color: #5F79FC;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 0.7rem;
  min-width: 20px;
  text-align: center;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1E1F2D;
  border-radius: 0 8px 8px 0;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-channel {
  display: flex;
  align-items: center;
}

.current-channel-icon {
  margin-right: 10px;
  font-size: 1.2rem;
}

.current-channel-info {
  display: flex;
  flex-direction: column;
}

.current-channel-name {
  font-weight: bold;
  font-size: 1.1rem;
}

.current-channel-topic {
  font-size: 0.8rem;
  color: #a0a0a0;
}

.chat-header-actions {
  display: flex;
  gap: 10px;
}

.chat-messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.chat-message {
  display: flex;
  margin-bottom: 15px;
  position: relative;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.message-content {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 10px 15px;
  border-radius: 0 8px 8px 8px;
  max-width: 70%;
}

.message-author {
  font-weight: bold;
  margin-bottom: 5px;
  display: block;
}

.message-content p {
  margin: 0;
  word-wrap: break-word;
}

.message-time {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 0.7rem;
  color: #a0a0a0;
}

.system-message {
  justify-content: center;
  margin: 20px 0;
}

.system-message .message-content {
  background-color: rgba(95, 121, 252, 0.1);
  border: 1px solid rgba(95, 121, 252, 0.3);
  border-radius: 8px;
  max-width: 80%;
  text-align: center;
  color: #a0a0a0;
}

.chat-input-area {
  padding: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.chat-input-main {
  flex: 1;
  padding: 12px;
  padding-right: 40px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.9rem;
}

.chat-input-buttons {
  position: absolute;
  right: 10px;
  display: flex;
  gap: 5px;
}

.chat-input-button {
  background: none;
  border: none;
  color: #a0a0a0;
  cursor: pointer;
  font-size: 1.1rem;
  transition: color 0.2s;
}

.chat-input-button:hover {
  color: white;
}

.online-users {
  width: 200px;
  background-color: #1E1F2D;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
}

.online-users-header {
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: bold;
}

.user-group {
  margin-bottom: 10px;
}

.user-group-name {
  padding: 8px 15px;
  font-size: 0.8rem;
  color: #a0a0a0;
  text-transform: uppercase;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px 15px;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.user-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-online {
  background-color: #00CFA1;
}

.status-idle {
  background-color: #FDA92C;
}

.status-dnd {
  background-color: #FF3B30;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  margin-right: 10px;
}

.user-name {
  font-size: 0.9rem;
}

.btn-icon {
  background: none;
  border: none;
  color: #a0a0a0;
  cursor: pointer;
  transition: color 0.2s;
  font-size: 1rem;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-icon:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}
</style> 