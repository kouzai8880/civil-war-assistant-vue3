import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Rooms from '../views/Rooms.vue'
import MyRooms from '../views/MyRooms.vue'
import RoomDetail from '../views/RoomDetail.vue'
import Profile from '../views/Profile.vue'
import MatchHistory from '../views/MatchHistory.vue'
import ChatHall from '../views/ChatHall.vue'
import NotFound from '../views/NotFound.vue'

/**
 * 路由配置
 * 包含首页、房间大厅、我的房间、个人中心和登录/注册页面
 */
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '首页',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
      title: '注册',
      requiresAuth: false
    }
  },
  {
    path: '/rooms',
    name: 'Rooms',
    component: Rooms,
    meta: {
      title: '房间大厅',
      requiresAuth: true
    }
  },
  {
    path: '/my-rooms',
    name: 'MyRooms',
    component: MyRooms,
    meta: {
      title: '我的房间',
      requiresAuth: true
    }
  },
  {
    path: '/room/:id',
    name: 'RoomDetail',
    component: RoomDetail,
    meta: {
      title: '房间详情',
      requiresAuth: true
    },
    props: true
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: {
      title: '个人中心',
      requiresAuth: true
    }
  },
  {
    path: '/match-history',
    name: 'MatchHistory',
    component: MatchHistory,
    meta: {
      title: '战绩查询',
      requiresAuth: true
    }
  },
  {
    path: '/match-history/:id',
    name: 'MatchDetail',
    component: MatchHistory,
    props: true
  },
  {
    path: '/chat-hall',
    name: 'ChatHall',
    component: ChatHall,
    meta: {
      title: '聊天大厅',
      requiresAuth: true
    }
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '页面未找到',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 全局导航守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 游戏内战助手` : '游戏内战助手'
  
  // 登录权限验证逻辑 - 后续完善
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isAuthenticated = localStorage.getItem('token') // 简单的身份验证检查
  
  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router 