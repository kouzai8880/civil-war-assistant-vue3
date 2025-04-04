<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useRoomStore } from '../stores/room'
import CreateRoomModal from '../components/CreateRoomModal.vue'

const router = useRouter()
const userStore = useUserStore()
const roomStore = useRoomStore()

// 用户登录状态
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 模态框可见性
const showCreateRoomModal = ref(false)

// 热门房间
const hotRooms = ref([
  {
    id: 'room1',
    name: '周末欢乐局',
    status: 'waiting',
    players: 5,
    playerCount: 10,
    createTime: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    id: 'room2',
    name: '高手进阶训练',
    status: 'gaming',
    players: 10,
    playerCount: 10,
    createTime: new Date(Date.now() - 30 * 60 * 1000)
  }
])
const myRooms = ref([])
const isLoading = ref(false)

// 加载数据，但使用初始数据减少加载状态
onMounted(async () => {
  try {
    // 后台异步加载热门房间，不显示加载状态
    const rooms = await roomStore.fetchRooms()
    if (rooms && rooms.length > 0) {
      hotRooms.value = rooms.slice(0, 2)
    }
    
    if (isLoggedIn.value) {
      // 加载我的房间
      isLoading.value = true
      const userRooms = await roomStore.fetchMyRooms(userStore.userId)
      myRooms.value = userRooms.slice(0, 3)
      isLoading.value = false
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    isLoading.value = false
  }
})

// 房间状态标签样式
const statusClass = (status) => {
  switch (status) {
    case 'waiting': return 'status-waiting'
    case 'picking': return 'status-picking'
    case 'gaming': return 'status-gaming'
    case 'ended': return 'status-ended'
    default: return ''
  }
}

// 房间状态文本
const statusText = (status) => {
  switch (status) {
    case 'waiting': return '等待中'
    case 'picking': return '选人中'
    case 'gaming': return '游戏中'
    case 'ended': return '已结束'
    default: return '未知'
  }
}

// 创建房间
const createRoom = () => {
  if (isLoggedIn.value) {
    showCreateRoomModal.value = true
  } else {
    router.push('/login')
  }
}

// 处理房间创建事件
const handleRoomCreated = (roomData) => {
  console.log('房间创建成功:', roomData)
  // 这里可以进行其他操作，如更新房间列表等
}

// 加入房间
const joinRoom = (roomId) => {
  if (isLoggedIn.value) {
    router.push(`/room/${roomId}`)
  } else {
    router.push('/login')
  }
}

// 查看更多房间
const viewMoreRooms = () => {
  router.push('/rooms')
}

// 查看我的房间
const viewMyRooms = () => {
  router.push('/my-rooms')
}
</script>

<template>
  <div class="container">
    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">内战助手 - 点燃峡谷激情</h1>
        <p class="hero-subtitle">完美的英雄联盟内战组织平台，帮助您轻松创建、管理和参与内战，享受游戏的乐趣</p>
        <button class="btn btn-primary" id="create-room-btn" @click="createRoom">立即创建房间</button>
      </div>
    </section>

    <!-- 创建房间模态框 -->
    <CreateRoomModal 
      v-model:visible="showCreateRoomModal" 
      @created="handleRoomCreated"
    />

    <!-- 热门房间 -->
    <div class="row">
      <div class="col">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">热门房间</h2>
            <a href="javascript:void(0)" class="btn btn-outline" @click="viewMoreRooms">查看更多</a>
          </div>
          <el-skeleton :loading="isLoading" animated :count="2" :throttle="500">
            <template #default>
              <div class="room-list">
                <!-- 周末欢乐局 -->
                <div class="room-card">
                  <div class="room-header">
                    <h3 class="room-title">周末欢乐局</h3>
                    <span class="room-status status-waiting">等待中</span>
                  </div>
                  <div class="room-info">
                    <span>玩家: 5/10</span>
                    <span>创建时间: 10分钟前</span>
                  </div>
                  <div class="room-players">
                    <img src="https://placekitten.com/100/100" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/101/101" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/102/102" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/103/103" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/104/104" alt="玩家头像" class="player-avatar">
                  </div>
                  <div class="room-footer">
                    <a href="javascript:void(0)" class="btn btn-primary" @click.stop="joinRoom('room1')">加入房间</a>
                  </div>
                </div>
                
                <!-- 高手进阶训练 -->
                <div class="room-card">
                  <div class="room-header">
                    <h3 class="room-title">高手进阶训练</h3>
                    <span class="room-status status-gaming">游戏中</span>
                  </div>
                  <div class="room-info">
                    <span>玩家: 10/10</span>
                    <span>创建时间: 30分钟前</span>
                  </div>
                  <div class="room-players">
                    <img src="https://placekitten.com/110/110" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/111/111" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/112/112" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/113/113" alt="玩家头像" class="player-avatar">
                    <img src="https://placekitten.com/114/114" alt="玩家头像" class="player-avatar">
                    <span class="player-more">+5</span>
                  </div>
                  <div class="room-footer">
                    <button class="btn btn-outline" @click.stop="joinRoom('room2')">观战中+</button>
                  </div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 主内容区域 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero-section {
  height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80') no-repeat center center;
  background-size: cover;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 2rem;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
}

.hero-title {
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #6c5ce7, #00cec9, #fd79a8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: #f8f9fa;
}

/* 卡片组件 */
.card {
  background-color: rgba(30, 30, 46, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1rem;
}

.card-title {
  font-size: 1.5rem;
  font-weight: bold;
}

/* 网格系统 */
.row {
  display: flex;
  flex-wrap: wrap;
  margin: -0.75rem;
}

.col {
  flex: 1;
  padding: 0.75rem;
}

/* 房间列表 */
.room-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.room-card {
  background-color: rgba(30, 30, 46, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-title {
  font-size: 1.2rem;
  font-weight: bold;
}

.room-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.status-waiting {
  background-color: #fdcb6e;
  color: #000;
}

.status-gaming {
  background-color: #00b894;
  color: #fff;
}

.room-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: #a0a0a0;
}

.room-players {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.player-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
}

.player-more {
  font-size: 0.85rem;
  color: #a0a0a0;
}

.room-footer {
  display: flex;
  justify-content: flex-end;
}

/* 按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(90deg, #6c5ce7, #00cec9);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid #6c5ce7;
  color: #6c5ce7;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}
</style> 