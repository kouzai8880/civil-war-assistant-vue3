<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import FriendsSidebar from '../components/FriendsSidebar.vue'

// 常用的英雄头像列表，用于随机分配
const championIcons = [
  'Ahri', 'Annie', 'Ashe', 'Caitlyn', 'Darius', 
  'Ezreal', 'Garen', 'Jinx', 'Lux', 'Malphite',
  'Nami', 'Syndra', 'Thresh', 'Yasuo', 'Zed'
]

// 生成英雄头像URL
const getChampionIcon = (index = 0) => {
  const champion = championIcons[index % championIcons.length]
  return `https://ddragon.leagueoflegends.com/cdn/13.12.1/img/champion/${champion}.png`
}

// 用户状态
const userStore = useUserStore()
const router = useRouter()

// 计算属性
const isLoggedIn = computed(() => userStore.isLoggedIn)
const username = computed(() => userStore.username)
const avatar = computed(() => userStore.avatar)

// 导航菜单
const navItems = [
  { name: '首页', path: '/', icon: 'House', requireAuth: false },
  { name: '我的房间', path: '/my-rooms', icon: 'List', requireAuth: true },
  { name: '房间大厅', path: '/rooms', icon: 'Menu', requireAuth: false },
  { name: '战绩查询', path: '/match-history', icon: 'DataAnalysis', requireAuth: false },
  { name: '聊天大厅', path: '/chat-hall', icon: 'ChatDotRound', requireAuth: true }
]

// 筛选导航项
const filteredNavItems = computed(() => {
  return navItems.filter(item => !item.requireAuth || isLoggedIn.value)
})

// 展开状态
const showFriendList = ref(false)

// 用户下拉菜单是否展开
const showDropdown = ref(false)

// 处理登录
const handleLogin = () => {
  router.push('/login')
}

// 处理注册
const handleRegister = () => {
  router.push('/register')
}

// 处理登出
const handleLogout = () => {
  userStore.logout()
  router.push('/')
}

// 切换好友列表显示
const toggleFriendList = () => {
  showFriendList.value = !showFriendList.value
}

// 切换用户下拉菜单显示
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 登出
const logout = () => {
  showDropdown.value = false
  userStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="app-container">
    <nav class="navbar">
      <div class="navbar-left">
        <router-link to="/" class="logo">
          <img src="../assets/logo.png" alt="Logo" class="logo-img">
          <span class="site-name">内战助手</span>
        </router-link>
        
        <div class="nav-links">
          <router-link to="/" class="nav-link" exact-active-class="active">首页</router-link>
          <router-link to="/my-rooms" class="nav-link" active-class="active">我的房间</router-link>
          <router-link to="/rooms" class="nav-link" active-class="active">房间大厅</router-link>
          <router-link to="/match-history" class="nav-link" active-class="active">战绩查询</router-link>
          <router-link to="/chat-hall" class="nav-link" active-class="active">聊天大厅</router-link>
        </div>
      </div>
      
      <div class="navbar-right">
        <template v-if="isLoggedIn">
          <div class="notification-wrapper">
            <button class="notification-btn">
              <el-badge is-dot class="notification-badge">
                <el-icon><Bell /></el-icon>
              </el-badge>
            </button>
          </div>
          
          <div class="user-dropdown">
            <div class="user-info" @click="toggleDropdown">
              <img :src="avatar || getChampionIcon()" alt="Avatar" class="user-avatar">
              <span class="username">{{ username }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </div>
            
            <ul v-if="showDropdown" class="dropdown-menu">
              <li>
                <router-link to="/profile" class="dropdown-item" @click="showDropdown = false">
                  <el-icon><User /></el-icon>个人中心
                </router-link>
              </li>
              <li>
                <router-link to="/match-history" class="dropdown-item" @click="showDropdown = false">
                  <el-icon><List /></el-icon>我的战绩
                </router-link>
              </li>
              <li>
                <router-link to="/friends" class="dropdown-item" @click="showDropdown = false">
                  <el-icon><UserFilled /></el-icon>我的好友
                </router-link>
              </li>
              <li>
                <router-link to="/profile?tab=settings" class="dropdown-item" @click="showDropdown = false">
                  <el-icon><Setting /></el-icon>设置
                </router-link>
              </li>
              <li class="divider"></li>
              <li>
                <a href="javascript:void(0)" class="dropdown-item logout" @click="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </a>
              </li>
            </ul>
          </div>
        </template>
        
        <template v-else>
          <div class="auth-buttons">
            <router-link to="/login" class="btn btn-login">登录</router-link>
            <router-link to="/register" class="btn btn-register">注册</router-link>
          </div>
        </template>
      </div>
    </nav>
    
    <main class="content">
      <router-view />
    </main>
    
    <!-- 好友侧边栏组件 -->
    <FriendsSidebar />
    
    <footer class="footer">
      <p>&copy; 2023 内战助手 - 英雄联盟内战组织平台</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 导航栏样式 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 60px;
  background-color: #171822;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.navbar-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #fff;
  margin-right: 40px;
}

.logo-img {
  height: 24px;
  margin-right: 6px;
}

.site-name {
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 0.5px;
  color: #ffffff;
}

.nav-links {
  display: flex;
  gap: 36px;
}

.nav-link {
  color: #8b8fa3;
  text-decoration: none;
  font-size: 15px;
  padding: 8px 0;
  position: relative;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #ffffff;
}

.nav-link.active {
  color: #53a8ff;
  font-weight: 500;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 通知样式 */
.notification-wrapper {
  position: relative;
}

.notification-btn {
  background: transparent;
  border: none;
  color: #8b8fa3;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s;
}

.notification-btn:hover {
  color: #ffffff;
}

.notification-badge :deep(.el-badge__content) {
  background-color: #f56c6c;
}

/* 用户下拉菜单 */
.user-dropdown {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #22232d;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.username {
  font-size: 14px;
  color: #ffffff;
}

.dropdown-icon {
  font-size: 12px;
  margin-left: 4px;
  color: #8b8fa3;
  transition: transform 0.3s;
}

.user-info:hover .dropdown-icon {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 180px;
  background-color: #22232e;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  padding: 8px 0;
  z-index: 10;
  list-style: none;
  margin: 0;
  border: 1px solid #292a37;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: #8b8fa3;
  text-decoration: none;
  font-size: 14px;
  transition: background-color 0.3s;
}

.dropdown-item:hover {
  background-color: #292a37;
  color: #ffffff;
}

.dropdown-item i {
  font-size: 16px;
}

.divider {
  height: 1px;
  background-color: #292a37;
  margin: 8px 0;
}

.logout {
  color: #f56c6c;
}

/* 按钮样式 */
.auth-buttons {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 6px 16px;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
}

.btn-login {
  background-color: transparent;
  border: 1px solid #53a8ff;
  color: #53a8ff;
}

.btn-login:hover {
  background-color: rgba(83, 168, 255, 0.1);
}

.btn-register {
  background-color: #53a8ff;
  border: 1px solid #53a8ff;
  color: white;
}

.btn-register:hover {
  background-color: #409eff;
}

/* 内容区 */
.content {
  flex: 1;
  padding: 0;
  background-color: #13141b;
}

/* 底部样式 */
.footer {
  padding: 20px;
  text-align: center;
  background-color: #171822;
  color: #8b8fa3;
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
  }
  
  .nav-links {
    display: none;
  }
  
  .user-dropdown .username {
    display: none;
  }
  
  .auth-buttons {
    gap: 8px;
  }
  
  .btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .content {
    padding: 16px;
  }
}
</style> 