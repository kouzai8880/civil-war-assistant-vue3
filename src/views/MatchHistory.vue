<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 用户信息
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 加载状态
const isLoading = ref(false)

// 搜索表单
const searchForm = ref({
  username: userStore.username,
  gameType: '',
  timeRange: '',
  result: ''
})

// 战绩数据（模拟数据）
const matchesData = ref([])

// 分页
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 游戏类型选项
const gameTypeOptions = [
  { value: '', label: '全部游戏' },
  { value: 'LOL', label: '英雄联盟' },
  { value: 'PUBG', label: '绝地求生' },
  { value: 'CSGO', label: 'CS2' },
]

// 时间范围选项
const timeRangeOptions = [
  { value: '', label: '全部时间' },
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' },
]

// 游戏结果选项
const resultOptions = [
  { value: '', label: '全部结果' },
  { value: 'win', label: '胜利' },
  { value: 'lose', label: '失败' },
]

// 检查登录状态
onMounted(async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  searchMatches()
})

// 搜索战绩
const searchMatches = async () => {
  isLoading.value = true
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据
    const mockData = generateMockMatches(30)
    
    // 筛选数据
    let filtered = [...mockData]
    
    if (searchForm.value.gameType) {
      filtered = filtered.filter(match => match.gameType === searchForm.value.gameType)
    }
    
    if (searchForm.value.result) {
      filtered = filtered.filter(match => match.result === searchForm.value.result)
    }
    
    // 更新数据
    matchesData.value = filtered
    pagination.value.total = filtered.length
    
  } catch (error) {
    ElMessage.error('获取战绩失败')
  } finally {
    isLoading.value = false
  }
}

// 生成模拟数据
const generateMockMatches = (count) => {
  const matches = []
  const now = new Date()
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getTime() - i * 86400000 * Math.random() * 3)
    const isWin = Math.random() > 0.5
    const gameType = Math.random() > 0.7 ? (Math.random() > 0.5 ? 'PUBG' : 'CSGO') : 'LOL'
    
    const match = {
      id: `match-${i + 1}`,
      roomName: `测试房间 ${i + 1}`,
      gameType,
      createTime: date.toISOString(),
      duration: Math.floor(Math.random() * 30 + 20) + '分钟',
      result: isWin ? 'win' : 'lose',
      team: Math.random() > 0.5 ? '红队' : '蓝队',
      kda: isWin 
        ? `${Math.floor(Math.random() * 10 + 5)}/${Math.floor(Math.random() * 3 + 1)}/${Math.floor(Math.random() * 12 + 8)}`
        : `${Math.floor(Math.random() * 5 + 1)}/${Math.floor(Math.random() * 6 + 5)}/${Math.floor(Math.random() * 8 + 3)}`,
      score: isWin ? Math.floor(Math.random() * 3 + 8) : Math.floor(Math.random() * 3 + 5),
      champion: getRandomChampion()
    }
    
    matches.push(match)
  }
  
  return matches
}

// 随机英雄
const getRandomChampion = () => {
  const champions = ['盖伦', '亚索', '李青', '艾希', '卡特琳娜', '莫甘娜', '卡莎', '伊泽瑞尔', '锐雯', '杰斯']
  return champions[Math.floor(Math.random() * champions.length)]
}

// 处理搜索
const handleSearch = () => {
  pagination.value.current = 1
  searchMatches()
}

// 处理重置
const handleReset = () => {
  searchForm.value = {
    username: userStore.username,
    gameType: '',
    timeRange: '',
    result: ''
  }
  handleSearch()
}

// 处理分页变化
const handlePageChange = (page) => {
  pagination.value.current = page
}

// 处理页面大小变化
const handleSizeChange = (size) => {
  pagination.value.pageSize = size
  pagination.value.current = 1
}

// 查看详情
const viewMatchDetail = (match) => {
  ElMessage.info('对局详情功能开发中')
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0')
  } else if (diffDays === 1) {
    return '昨天 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0')
  } else {
    return date.getMonth() + 1 + '月' + date.getDate() + '日 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0')
  }
}

// 获取KDA值
const getKDAValues = (kda) => {
  return kda
}

// 获取KDA比率
const getKDARatio = (kda) => {
  const [k, d, a] = kda.split('/').map(Number)
  const ratio = ((k + a) / Math.max(1, d)).toFixed(1)
  return ratio + ':1'
}

// 获取随机伤害
const getRandomDamage = (result) => {
  if (result === 'win') {
    return (Math.floor(Math.random() * 15) + 15) + 'k'
  } else {
    return (Math.floor(Math.random() * 10) + 10) + 'k'
  }
}

// 获取随机补刀
const getRandomCS = (result) => {
  if (result === 'win') {
    return Math.floor(Math.random() * 100) + 150
  } else {
    return Math.floor(Math.random() * 80) + 100
  }
}

// 获取随机视野
const getRandomVision = () => {
  return Math.floor(Math.random() * 20) + 10
}

// 英雄图片名称
const getChampionImage = (champion) => {
  const championMap = {
    '盖伦': 'Garen',
    '亚索': 'Yasuo',
    '李青': 'LeeSin',
    '艾希': 'Ashe',
    '卡特琳娜': 'Katarina',
    '莫甘娜': 'Morgana',
    '卡莎': 'Kaisa',
    '伊泽瑞尔': 'Ezreal',
    '锐雯': 'Riven',
    '杰斯': 'Jayce'
  }
  return championMap[champion] || 'Annie'
}

// 获取随机装备
const getRandomItems = (champion, count) => {
  const adItems = ['3006', '3031', '3036', '3094', '3072', '3340']
  const apItems = ['3020', '3089', '3157', '3135', '3165', '3340']
  const tankItems = ['3068', '3075', '3143', '3110', '3211', '3340']
  
  const champType = {
    '艾希': 'ad',
    '伊泽瑞尔': 'ad',
    '卡莎': 'ad',
    '盖伦': 'tank',
    '杰斯': 'ad',
    '亚索': 'ad',
    '李青': 'ad',
    '锐雯': 'ad',
    '卡特琳娜': 'ap',
    '莫甘娜': 'ap'
  }
  
  const type = champType[champion] || (Math.random() > 0.5 ? 'ad' : 'ap')
  
  if (type === 'ad') {
    return adItems.slice(0, count)
  } else if (type === 'ap') {
    return apItems.slice(0, count)
  } else {
    return tankItems.slice(0, count)
  }
}

// 获取随机队友英雄
const getRandomTeamChampions = (count) => {
  const champions = ['Garen', 'Yasuo', 'LeeSin', 'Ashe', 'Katarina', 'Morgana', 'Kaisa', 'Ezreal', 'Riven', 'Jayce', 'Annie', 'Lux', 'Jinx', 'Caitlyn', 'Darius']
  const result = []
  
  while (result.length < count) {
    const randChamp = champions[Math.floor(Math.random() * champions.length)]
    if (!result.includes(randChamp)) {
      result.push(randChamp)
    }
  }
  
  return result
}

// 获取分页列表
const getPageList = () => {
  const totalPages = Math.ceil(pagination.value.total / pagination.value.pageSize)
  const current = pagination.value.current
  
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  
  if (current <= 3) {
    return [1, 2, 3, 4, 5]
  }
  
  if (current >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  
  return [current - 2, current - 1, current, current + 1, current + 2]
}

// 战绩统计
const matchStats = computed(() => {
  const matches = matchesData.value
  if (!matches.length) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      kdaAvg: {
        kills: 0,
        deaths: 0,
        assists: 0
      },
      kdaRatio: 0
    }
  }
  
  const wins = matches.filter(m => m.result === 'win').length
  
  let totalKills = 0
  let totalDeaths = 0
  let totalAssists = 0
  
  matches.forEach(match => {
    const [k, d, a] = match.kda.split('/').map(Number)
    totalKills += k
    totalDeaths += d
    totalAssists += a
  })
  
  const avgKills = (totalKills / matches.length).toFixed(1)
  const avgDeaths = (totalDeaths / matches.length).toFixed(1)
  const avgAssists = (totalAssists / matches.length).toFixed(1)
  const kdaRatio = ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2)
  
  return {
    totalGames: matches.length,
    wins,
    losses: matches.length - wins,
    winRate: Math.round((wins / matches.length) * 100),
    kdaAvg: {
      kills: avgKills,
      deaths: avgDeaths,
      assists: avgAssists
    },
    kdaRatio
  }
})
</script>

<template>
  <div class="match-history-container">
    <div class="match-history-header">
      <h2>战绩查询</h2>
      <div class="match-filter">
        <div class="filter-group">
          <label>玩家:</label>
          <input type="text" v-model="searchForm.username" class="form-input" placeholder="输入玩家昵称..." disabled>
        </div>
        <div class="filter-group">
          <label>游戏类型:</label>
          <select v-model="searchForm.gameType" class="form-input">
            <option v-for="item in gameTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>时间:</label>
          <select v-model="searchForm.timeRange" class="form-input">
            <option v-for="item in timeRangeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>结果:</label>
          <select v-model="searchForm.result" class="form-input">
            <option v-for="item in resultOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>
        <button class="btn btn-primary" :disabled="isLoading" @click="handleSearch">搜索</button>
        <button class="btn btn-outline" @click="handleReset">重置</button>
      </div>
    </div>
    
    <!-- 战绩概览 -->
    <div class="match-history-stats">
      <div class="stats-card">
        <div class="stats-card-header">
          <h3>战绩概览</h3>
          <div class="stats-period">
            <select v-model="searchForm.timeRange" class="form-input">
              <option v-for="item in timeRangeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="stats-card-content">
          <div class="stats-overview">
            <div class="stats-item">
              <div class="stats-value">{{ matchStats.totalGames }}</div>
              <div class="stats-label">总场次</div>
            </div>
            <div class="stats-item">
              <div class="stats-value">{{ matchStats.wins }}</div>
              <div class="stats-label">胜利</div>
            </div>
            <div class="stats-item">
              <div class="stats-value">{{ matchStats.losses }}</div>
              <div class="stats-label">失败</div>
            </div>
            <div class="stats-item">
              <div class="stats-value">{{ matchStats.winRate }}%</div>
              <div class="stats-label">胜率</div>
            </div>
          </div>
          <div class="stats-kda">
            <div class="kda-title">KDA平均</div>
            <div class="kda-values">
              <span class="kda-k">{{ matchStats.kdaAvg.kills }}</span> /
              <span class="kda-d">{{ matchStats.kdaAvg.deaths }}</span> /
              <span class="kda-a">{{ matchStats.kdaAvg.assists }}</span>
            </div>
            <div class="kda-ratio">{{ matchStats.kdaRatio }}:1 KDA</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 战绩列表 -->
    <div class="match-list" v-loading="isLoading">
      <div 
        v-for="match in matchesData.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)" 
        :key="match.id" 
        :class="['match-item', match.result]"
        @click="viewMatchDetail(match)"
      >
        <div class="match-result">
          <div class="result-text">{{ match.result === 'win' ? '胜利' : '失败' }}</div>
          <div class="match-time">{{ formatDate(match.createTime) }}</div>
          <div class="match-duration">{{ match.duration }}</div>
        </div>
        <div class="match-champion">
          <img :src="`https://ddragon.leagueoflegends.com/cdn/12.6.1/img/champion/${getChampionImage(match.champion)}.png`" alt="英雄" class="champion-image">
          <div class="champion-level">{{ Math.floor(Math.random() * 8 + 10) }}</div>
        </div>
        <div class="match-performance">
          <div class="match-kda">
            <div class="kda-values">{{ getKDAValues(match.kda) }}</div>
            <div class="kda-ratio">{{ getKDARatio(match.kda) }}</div>
          </div>
          <div class="match-details">
            <div class="match-detail">
              <span class="detail-label">伤害</span>
              <span class="detail-value">{{ getRandomDamage(match.result) }}</span>
            </div>
            <div class="match-detail">
              <span class="detail-label">补刀</span>
              <span class="detail-value">{{ getRandomCS(match.result) }}</span>
            </div>
            <div class="match-detail">
              <span class="detail-label">视野</span>
              <span class="detail-value">{{ getRandomVision() }}</span>
            </div>
          </div>
        </div>
        <div class="match-items">
          <img v-for="(item, index) in getRandomItems(match.champion, 6)" :key="index" 
               :src="`https://ddragon.leagueoflegends.com/cdn/12.6.1/img/item/${item}.png`" alt="装备" class="item-image">
        </div>
        <div class="match-teams">
          <div class="match-team blue">
            <img v-for="(champ, index) in getRandomTeamChampions(5)" :key="'blue'+index" 
                 :src="`https://ddragon.leagueoflegends.com/cdn/12.6.1/img/champion/${champ}.png`" alt="队友英雄" class="team-champion-image">
          </div>
          <div class="vs">VS</div>
          <div class="match-team red">
            <img v-for="(champ, index) in getRandomTeamChampions(5)" :key="'red'+index" 
                 :src="`https://ddragon.leagueoflegends.com/cdn/12.6.1/img/champion/${champ}.png`" alt="对手英雄" class="team-champion-image">
          </div>
        </div>
        <div class="match-rating">
          <div class="rating-value">{{ match.score }}</div>
          <div class="rating-label">评分</div>
          <div v-if="match.score >= 8.5" class="match-mvp">MVP</div>
        </div>
        <div class="match-actions">
          <button class="btn-icon">👁️</button>
        </div>
      </div>
      
      <!-- 分页 -->
      <div class="pagination">
        <button class="pagination-btn" @click="handlePageChange(pagination.current - 1)" :disabled="pagination.current <= 1">&laquo;</button>
        <button 
          v-for="page in getPageList()" 
          :key="page" 
          :class="['pagination-btn', { active: page === pagination.current }]"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
        <button class="pagination-btn" @click="handlePageChange(pagination.current + 1)" :disabled="pagination.current >= Math.ceil(pagination.total / pagination.pageSize)">&raquo;</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-history-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.match-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.match-filter {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group select, .filter-group input {
  padding: 0.5rem;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--light-text);
}

.match-history-stats {
  margin-bottom: 2rem;
}

.stats-card {
  background-color: #1E1F2D;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.stats-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-period {
  display: flex;
  align-items: center;
}

.stats-card-content {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2rem;
}

.stats-overview {
  display: flex;
  gap: 2rem;
  flex: 1;
}

.stats-item {
  text-align: center;
}

.stats-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stats-label {
  color: #a0a0a0;
}

.stats-kda {
  text-align: center;
  padding: 0 2rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.kda-title {
  margin-bottom: 0.5rem;
  color: #a0a0a0;
}

.kda-values {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.kda-k {
  color: #00CFA1;
}

.kda-d {
  color: #FF3B30;
}

.kda-a {
  color: #5F79FC;
}

.kda-ratio {
  color: #FDA92C;
}

.match-list {
  margin-bottom: 2rem;
}

.match-item {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background-color: #1E1F2D;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s;
  cursor: pointer;
}

.match-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.match-item.win {
  border-left: 4px solid #00CFA1;
}

.match-item.lose {
  border-left: 4px solid #FF3B30;
}

.match-result {
  width: 120px;
  padding-right: 1.5rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.result-text {
  font-weight: bold;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.win .result-text {
  color: #00CFA1;
}

.lose .result-text {
  color: #FF3B30;
}

.match-time, .match-duration {
  font-size: 0.8rem;
  color: #a0a0a0;
}

.match-champion {
  padding: 0 1.5rem;
  text-align: center;
}

.champion-image {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  margin-bottom: 0.25rem;
}

.champion-level {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  margin: -1.5rem auto 0;
  position: relative;
}

.match-performance {
  display: flex;
  flex-direction: column;
  padding: 0 1.5rem;
  width: 200px;
}

.match-kda {
  margin-bottom: 0.5rem;
}

.match-details {
  display: flex;
  gap: 1rem;
}

.match-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-label {
  font-size: 0.7rem;
  color: #a0a0a0;
}

.detail-value {
  font-weight: bold;
}

.match-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  width: 150px;
  padding: 0 1.5rem;
}

.item-image {
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
}

.match-teams {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.5rem;
}

.match-team {
  display: flex;
  gap: 0.25rem;
}

.team-champion-image {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
}

.vs {
  font-size: 0.8rem;
  color: #a0a0a0;
  padding: 0 0.5rem;
}

.match-rating {
  text-align: center;
  padding: 0 1.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  width: 80px;
}

.rating-value {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.win .rating-value {
  color: #00CFA1;
}

.lose .rating-value {
  color: #FDA92C;
}

.rating-label {
  font-size: 0.8rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
}

.match-mvp {
  background-color: #5F79FC;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.match-actions {
  padding-left: 1.5rem;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
}

.pagination-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #1E1F2D;
  color: #a0a0a0;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination-btn.active, .pagination-btn:hover:not(:disabled) {
  background-color: #5F79FC;
  color: white;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 