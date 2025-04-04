<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 侧边栏是否收起
const isCollapsed = ref(true)

// 在线好友分类是否展开
const isOnlineFriendsExpanded = ref(true)
// 离线好友分类是否展开
const isOfflineFriendsExpanded = ref(false)

// 是否显示添加好友模态框
const showAddFriendModal = ref(false)
// 是否显示好友请求模态框
const showFriendRequestsModal = ref(false)

// 好友请求数量
const friendRequestsCount = ref(2)

// 好友列表数据（模拟数据）
const friends = ref({
  online: [
    {
      id: 1,
      name: '好友1',
      avatar: 'https://placekitten.com/110/110',
      status: '在房间中'
    },
    {
      id: 2,
      name: '好友2',
      avatar: 'https://placekitten.com/111/111',
      status: '空闲'
    },
    {
      id: 3,
      name: '好友3',
      avatar: 'https://placekitten.com/112/112',
      status: '游戏中'
    }
  ],
  offline: [
    {
      id: 4,
      name: '好友4',
      avatar: 'https://placekitten.com/113/113',
      status: '3小时前在线'
    },
    {
      id: 5,
      name: '好友5',
      avatar: 'https://placekitten.com/114/114',
      status: '1天前在线'
    },
    {
      id: 6,
      name: '好友6',
      avatar: 'https://placekitten.com/115/115',
      status: '12小时前在线'
    }
  ]
})

// 好友请求列表
const friendRequests = ref([
  {
    id: 1,
    name: '打野高手',
    avatar: 'https://placekitten.com/125/125',
    time: '2小时前'
  },
  {
    id: 2,
    name: '辅助大神',
    avatar: 'https://placekitten.com/126/126',
    time: '5小时前'
  }
])

// 玩家搜索结果列表
const searchResults = ref([
  {
    id: 1,
    name: '峡谷大师',
    avatar: 'https://placekitten.com/120/120',
    level: 120
  },
  {
    id: 2,
    name: '峡谷王者',
    avatar: 'https://placekitten.com/121/121',
    level: 150
  }
])

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// 切换在线好友分类展开状态
const toggleOnlineFriends = () => {
  isOnlineFriendsExpanded.value = !isOnlineFriendsExpanded.value
}

// 切换离线好友分类展开状态
const toggleOfflineFriends = () => {
  isOfflineFriendsExpanded.value = !isOfflineFriendsExpanded.value
}

// 打开添加好友模态框
const openAddFriendModal = () => {
  showAddFriendModal.value = true
}

// 关闭添加好友模态框
const closeAddFriendModal = () => {
  showAddFriendModal.value = false
}

// 打开好友请求模态框
const openFriendRequestsModal = () => {
  showFriendRequestsModal.value = true
}

// 关闭好友请求模态框
const closeFriendRequestsModal = () => {
  showFriendRequestsModal.value = false
}

// 发送消息给好友
const sendMessage = (friendId) => {
  console.log('发送消息给好友:', friendId)
  // 实现发送消息的逻辑
}

// 语音通话
const callFriend = (friendId) => {
  console.log('语音通话好友:', friendId)
  // 实现语音通话的逻辑
}

// 添加好友
const addFriend = (playerId) => {
  console.log('添加好友:', playerId)
  // 实现添加好友的逻辑
  closeAddFriendModal()
}

// 接受好友请求
const acceptFriendRequest = (requestId) => {
  console.log('接受好友请求:', requestId)
  // 实现接受好友请求的逻辑
  friendRequestsCount.value--
}

// 拒绝好友请求
const rejectFriendRequest = (requestId) => {
  console.log('拒绝好友请求:', requestId)
  // 实现拒绝好友请求的逻辑
  friendRequestsCount.value--
}

// 在页面加载时检查用户登录状态
onMounted(() => {
  // 如果用户已登录，可以在这里加载好友列表数据
  if (isLoggedIn.value) {
    // 加载好友列表数据的逻辑
  }
})
</script>

<template>
  <div v-if="isLoggedIn">
    <!-- 好友侧边栏 -->
    <div :class="['friends-sidebar', { collapsed: isCollapsed }]">
      <div class="friends-sidebar-handle" @click="toggleSidebar">
        <span>好友列表</span>
      </div>
      <div class="friends-sidebar-header">
        <h3 class="friends-sidebar-title">好友列表</h3>
        <button class="btn-icon" @click="openAddFriendModal">+</button>
      </div>
      <div class="friends-search-mini">
        <input type="text" placeholder="搜索好友...">
      </div>
      <div class="friends-list">
        <!-- 好友请求通知 -->
        <div class="friend-request-notification" v-if="friendRequestsCount > 0">
          <div class="notification-icon">🔔</div>
          <div class="notification-content">
            <div class="notification-text">你有 <span class="notification-count">{{ friendRequestsCount }}</span> 个好友请求</div>
            <button class="btn-xs btn-primary" @click="openFriendRequestsModal">查看请求</button>
          </div>
        </div>
        
        <!-- 在线好友 -->
        <div class="friends-category">
          <div class="category-header" @click="toggleOnlineFriends">
            <span>在线好友 ({{ friends.online.length }})</span>
            <button class="btn-icon category-toggle">{{ isOnlineFriendsExpanded ? '-' : '+' }}</button>
          </div>
          <div class="category-items" v-show="isOnlineFriendsExpanded">
            <div v-for="friend in friends.online" :key="friend.id" class="friend-item online">
              <img :src="friend.avatar" :alt="friend.name" class="friend-avatar">
              <div class="friend-info">
                <span class="friend-name">{{ friend.name }}</span>
                <span class="friend-status">{{ friend.status }}</span>
              </div>
              <div class="friend-actions">
                <button class="btn-icon" title="发送消息" @click="sendMessage(friend.id)">✉️</button>
                <button class="btn-icon" title="语音通话" @click="callFriend(friend.id)">📞</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 离线好友 -->
        <div class="friends-category">
          <div class="category-header" @click="toggleOfflineFriends">
            <span>离线好友 ({{ friends.offline.length }})</span>
            <button class="btn-icon category-toggle">{{ isOfflineFriendsExpanded ? '-' : '+' }}</button>
          </div>
          <div class="category-items" v-show="isOfflineFriendsExpanded">
            <div v-for="friend in friends.offline" :key="friend.id" class="friend-item offline">
              <img :src="friend.avatar" :alt="friend.name" class="friend-avatar">
              <div class="friend-info">
                <span class="friend-name">{{ friend.name }}</span>
                <span class="friend-status">{{ friend.status }}</span>
              </div>
              <div class="friend-actions">
                <button class="btn-icon" title="发送消息" @click="sendMessage(friend.id)">✉️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="friends-footer">
        <button class="btn btn-outline btn-sm" @click="openAddFriendModal">添加好友</button>
        <button class="btn btn-primary btn-sm" @click="openFriendRequestsModal">好友请求</button>
      </div>
    </div>
    
    <!-- 添加好友模态框 -->
    <div :class="['modal-overlay', { active: showAddFriendModal }]">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">添加好友</h2>
          <button class="close-modal" @click="closeAddFriendModal">&times;</button>
        </div>
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">输入玩家名称或ID</label>
            <input type="text" class="form-input" placeholder="搜索玩家...">
          </div>
          <div class="search-results">
            <div v-for="player in searchResults" :key="player.id" class="search-result-item">
              <img :src="player.avatar" :alt="player.name" class="player-avatar">
              <div class="player-info">
                <span class="player-name">{{ player.name }}</span>
                <span class="player-level">等级 {{ player.level }}</span>
              </div>
              <button class="btn btn-sm btn-outline" @click="addFriend(player.id)">添加好友</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 好友请求模态框 -->
    <div :class="['modal-overlay', { active: showFriendRequestsModal }]">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">好友请求</h2>
          <button class="close-modal" @click="closeFriendRequestsModal">&times;</button>
        </div>
        <div class="modal-content">
          <div class="request-list">
            <div v-for="request in friendRequests" :key="request.id" class="request-item">
              <img :src="request.avatar" :alt="request.name" class="player-avatar">
              <div class="request-info">
                <span class="player-name">{{ request.name }}</span>
                <span class="request-time">{{ request.time }}</span>
              </div>
              <div class="request-actions">
                <button class="btn btn-sm btn-outline" @click="rejectFriendRequest(request.id)">拒绝</button>
                <button class="btn btn-sm btn-primary" @click="acceptFriendRequest(request.id)">接受</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 好友侧边栏 */
.friends-sidebar {
  position: fixed;
  top: 60px;
  right: 0;
  width: 300px;
  height: calc(100vh - 60px);
  background-color: rgba(30, 30, 46, 0.8);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
}

.friends-sidebar.collapsed {
  transform: translateX(290px);
}

.friends-sidebar-handle {
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 80px;
  background-color: rgba(30, 30, 46, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px 0 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-right: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem 0;
}

.friends-sidebar-handle span {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.8rem;
  color: #8b8fa3;
}

.friends-sidebar-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.friends-sidebar-title {
  font-weight: bold;
  margin: 0;
}

.friends-search-mini {
  margin: 0.5rem 1rem;
}

.friends-search-mini input {
  width: 100%;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.2);
  color: #fff;
}

.friends-list {
  flex: 1;
  overflow-y: auto;
}

/* 好友请求通知 */
.friend-request-notification {
  display: flex;
  align-items: center;
  background-color: rgba(30, 30, 46, 0.6);
  padding: 10px;
  margin: 10px;
  border-radius: 5px;
  border-left: 3px solid #5f79fc;
}

.notification-icon {
  font-size: 1.2rem;
  margin-right: 10px;
  color: #5f79fc;
}

.notification-content {
  flex: 1;
}

.notification-text {
  font-size: 0.85rem;
  margin-bottom: 5px;
  color: #fff;
}

.notification-count {
  font-weight: bold;
  color: #5f79fc;
}

.btn-xs {
  padding: 2px 8px;
  font-size: 0.75rem;
}

.btn-primary {
  background-color: #5f79fc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-outline {
  background: transparent;
  border: 1px solid #5f79fc;
  color: #5f79fc;
  border-radius: 4px;
  cursor: pointer;
}

/* 好友分类 */
.friends-category {
  margin-bottom: 10px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 15px;
  font-weight: 500;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.category-toggle {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-items {
  padding: 0 10px;
}

/* 好友项目 */
.friend-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 5px;
  margin: 5px 0;
  transition: background-color 0.2s;
}

.friend-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.friend-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 10px;
  object-fit: cover;
}

.friend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.friend-name {
  font-weight: 500;
  margin-bottom: 2px;
  color: #fff;
  position: relative;
}

.online .friend-name::after {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
  margin-left: 5px;
  vertical-align: middle;
}

.offline .friend-name::after {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #bbb;
  border-radius: 50%;
  margin-left: 5px;
  vertical-align: middle;
}

.friend-status {
  font-size: 0.75rem;
  color: #8b8fa3;
}

.friend-status.room-status {
  color: #5f79fc;
}

.friend-actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1rem;
  color: #8b8fa3;
  cursor: pointer;
  transition: color 0.3s;
  padding: 4px;
}

.btn-icon:hover {
  color: #fff;
}

.friends-footer {
  margin-top: auto;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-sm {
  padding: 4px 12px;
  font-size: 0.85rem;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.modal-overlay.active {
  opacity: 1;
  pointer-events: all;
}

.modal {
  background-color: #1e1f2d;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  padding: 2rem;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateY(20px);
  transition: transform 0.3s;
}

.modal-overlay.active .modal {
  transform: translateY(0);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1rem;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.close-modal {
  background: none;
  border: none;
  color: #8b8fa3;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s;
}

.close-modal:hover {
  color: #fff;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #8b8fa3;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 1rem;
}

/* 搜索结果样式 */
.search-results {
  margin-top: 15px;
  max-height: 300px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-result-item:last-child {
  border-bottom: none;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 15px;
  object-fit: cover;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.player-name {
  font-weight: 500;
  margin-bottom: 2px;
  color: #fff;
}

.player-level {
  font-size: 0.75rem;
  color: #8b8fa3;
}

/* 好友请求列表样式 */
.request-list {
  max-height: 400px;
  overflow-y: auto;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.request-item:last-child {
  border-bottom: none;
}

.request-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 15px;
}

.request-time {
  font-size: 0.75rem;
  color: #8b8fa3;
}

.request-actions {
  display: flex;
  gap: 8px;
}

/* 滚动条样式 */
.friends-list::-webkit-scrollbar,
.search-results::-webkit-scrollbar,
.request-list::-webkit-scrollbar {
  width: 6px;
}

.friends-list::-webkit-scrollbar-track,
.search-results::-webkit-scrollbar-track,
.request-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.friends-list::-webkit-scrollbar-thumb,
.search-results::-webkit-scrollbar-thumb,
.request-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.friends-list::-webkit-scrollbar-thumb:hover,
.search-results::-webkit-scrollbar-thumb:hover,
.request-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style> 