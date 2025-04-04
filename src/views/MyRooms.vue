<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useRoomStore } from '../stores/room'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const roomStore = useRoomStore()

// 我的房间列表
const myRooms = ref([])
const historicalRooms = ref([])
const isLoading = ref(false)

// 标签页激活
const activeTab = ref('current')

// 检查登录状态
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 加载房间数据
onMounted(async () => {
  // 检查是否登录
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  loadMyRooms()
})

// 加载我的房间
const loadMyRooms = async () => {
  isLoading.value = true
  try {
    // 加载我创建的房间
    const rooms = await roomStore.fetchMyRooms(userStore.userId)
    
    if (rooms && rooms.length > 0) {
      // 分类房间
      myRooms.value = rooms.filter(room => 
        room.status === 'waiting' || room.status === 'picking' || room.status === 'gaming'
      )
      
      historicalRooms.value = rooms.filter(room => room.status === 'ended')
    }
    // 如果没有获取到数据，保留初始的示例数据
  } catch (error) {
    console.error('加载房间失败:', error)
    // 发生错误时不清空示例数据
  } finally {
    isLoading.value = false
  }
}

// 进入房间
const enterRoom = (roomId) => {
  router.push(`/room/${roomId}`)
}

// 创建新房间
const createRoom = () => {
  router.push('/rooms?action=create')
}

// 删除房间确认
const confirmDeleteRoom = (room) => {
  ElMessageBox.confirm(
    '确定要删除该房间吗？此操作不可恢复。',
    '删除确认',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    deleteRoom(room.id)
  }).catch(() => {})
}

// 删除房间
const deleteRoom = async (roomId) => {
  try {
    // 模拟API调用，删除房间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 从列表中移除
    historicalRooms.value = historicalRooms.value.filter(room => room.id !== roomId)
    
    ElMessage.success('房间已删除')
  } catch (error) {
    ElMessage.error('删除房间失败')
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

// 房间状态标签样式
const statusClass = (status) => {
  switch (status) {
    case 'waiting': return 'status-waiting'
    case 'picking': return 'status-waiting'
    case 'gaming': return 'status-gaming'
    case 'ended': return 'status-completed'
    default: return ''
  }
}

// 查看房间详情
const viewRoomDetail = (roomId) => {
  router.push(`/match-history/${roomId}`)
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>我的房间</h1>
      <button class="btn btn-primary" @click="createRoom">创建新房间</button>
    </div>
    
    <div class="tabs">
      <div 
        :class="['tab', activeTab === 'current' ? 'active' : '']" 
        @click="activeTab = 'current'"
      >
        当前房间
      </div>
      <div 
        :class="['tab', activeTab === 'history' ? 'active' : '']" 
        @click="activeTab = 'history'"
      >
        历史房间
      </div>
    </div>
    
    <!-- 当前房间列表 -->
    <div v-if="activeTab === 'current'" class="tab-content active">
      <div v-if="myRooms.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">您还没有创建或加入任何房间</div>
        <button class="btn btn-primary" @click="createRoom">创建房间</button>
      </div>
      
      <div v-else class="room-grid">
        <div v-for="room in myRooms" :key="room.id" class="room-card">
          <div class="room-header">
            <h3 class="room-title">{{ room.name }}</h3>
            <span :class="['room-status', statusClass(room.status)]">{{ statusText(room.status) }}</span>
          </div>
          <div class="room-info">
            <span>创建于: {{ new Date(room.createTime).toLocaleString() }}</span>
            <span>玩家: {{ room.players.length }}/{{ room.playerCount }}</span>
          </div>
          <div class="room-details">
            <div class="room-detail-item">
              <span class="detail-label">游戏模式:</span>
              <span>{{ room.gameType || 'LOL' }}</span>
            </div>
            <div class="room-detail-item">
              <span class="detail-label">房间状态:</span>
              <span>{{ room.isPublic ? '公开' : '私密' }}</span>
            </div>
          </div>
          <div class="room-players">
            <img 
              v-for="(player, index) in room.players.slice(0, 6)" 
              :key="index" 
              :src="player.avatar || `https://placekitten.com/${100 + index}/${100 + index}`" 
              :alt="player.name" 
              class="player-avatar"
            >
            <span v-if="room.players.length > 6" class="more-players">+{{ room.players.length - 6 }}</span>
          </div>
          <div class="room-footer">
            <a href="javascript:void(0)" class="btn btn-primary" @click="enterRoom(room.id)">进入房间</a>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 历史房间列表 -->
    <div v-if="activeTab === 'history'" class="tab-content active">
      <div v-if="historicalRooms.length === 0" class="empty-state">
        <div class="empty-icon">📜</div>
        <div class="empty-text">您还没有历史房间记录</div>
        <button class="btn btn-primary" @click="createRoom">创建房间</button>
      </div>
      
      <div v-else class="room-grid">
        <div v-for="room in historicalRooms" :key="room.id" class="room-card">
          <div class="room-header">
            <h3 class="room-title">{{ room.name }}</h3>
            <span class="room-status status-completed">已完成</span>
          </div>
          <div :class="['match-result', room.result === 'win' ? 'win' : 'lose']">
            <div class="result-indicator"></div>
            <div class="result-text">{{ room.result === 'win' ? '胜利' : '失败' }}</div>
          </div>
          <div class="room-info">
            <span>创建于: {{ new Date(room.createTime).toLocaleString() }}</span>
            <span>持续时间: {{ room.duration }}分钟</span>
          </div>
          <div class="room-details">
            <div class="room-detail-item">
              <span class="detail-label">游戏模式:</span>
              <span>{{ room.gameType || 'LOL' }}</span>
            </div>
            <div class="room-detail-item">
              <span class="detail-label">我的位置:</span>
              <span>{{ room.myTeam }}</span>
            </div>
          </div>
          <div class="room-players">
            <img 
              v-for="(player, index) in room.players.slice(0, 5)" 
              :key="index" 
              :src="player.avatar || `https://placekitten.com/${100 + index}/${100 + index}`" 
              :alt="player.name" 
              class="player-avatar"
            >
            <span v-if="room.players.length > 5" class="more-players">+{{ room.players.length - 5 }}</span>
          </div>
          <div class="room-footer">
            <button class="btn-icon" title="查看战绩">🔍</button>
            <button class="btn-icon" title="查看数据">📊</button>
            <a href="javascript:void(0)" class="btn btn-outline" @click="viewRoomDetail(room.id)">查看详情</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: bold;
}

.tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
}

.tab {
  padding: 1rem 2rem;
  cursor: pointer;
  color: #8b8fa3;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab.active {
  color: #53a8ff;
  border-bottom: 2px solid #53a8ff;
}

.tab-content {
  display: block;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 0;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: #8b8fa3;
}

.empty-text {
  color: #8b8fa3;
  margin-bottom: 1.5rem;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.room-card {
  background-color: #191a23;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #292a37;
  transition: all 0.3s;
}

.room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  border-color: #53a8ff;
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
  margin: 0;
}

.room-status {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.status-waiting {
  background-color: #fda92c;
  color: #fff;
}

.status-gaming {
  background-color: #00cfa1;
  color: #fff;
}

.status-completed {
  background-color: #8b8fa3;
  color: #fff;
}

.match-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.result-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.win .result-indicator {
  background-color: #00cfa1;
}

.lose .result-indicator {
  background-color: #f56c6c;
}

.result-text {
  font-size: 0.9rem;
}

.win .result-text {
  color: #00cfa1;
}

.lose .result-text {
  color: #f56c6c;
}

.room-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: #8b8fa3;
}

.room-details {
  margin-bottom: 1rem;
}

.room-detail-item {
  display: flex;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.detail-label {
  width: 80px;
  color: #8b8fa3;
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

.more-players {
  font-size: 0.85rem;
  color: #8b8fa3;
}

.room-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.btn-primary {
  background-color: #53a8ff;
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid #53a8ff;
  color: #53a8ff;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btn-icon {
  background: none;
  border: none;
  color: #8b8fa3;
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.3s;
}

.btn-icon:hover {
  color: #ffffff;
}

.status-picking {
  background-color: #fda92c;
  color: #fff;
}
</style> 