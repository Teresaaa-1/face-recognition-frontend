import Vue from 'vue'
import Router from 'vue-router'
import HomePage from '../views/HomePage.vue'
import LoginPage from '../views/LoginPage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import UsersPage from '../views/UsersPage.vue'
import SuccessPage from '../views/SuccessPage.vue'  // 新增导入

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage
    },
    {
      path: '/users',
      name: 'users',
      component: UsersPage
    },
    // 新增打卡成功路由
    {
      path: '/success/:username',
      name: 'success',
      component: SuccessPage,
      props: true
    },
    {
    path: '/records',
    name: 'Records',
    component: () => import('@/views/Records.vue')
    },
    {
  path: '/profile',
  name: 'profile',
  component: () => import('@/views/ProfilePage.vue'),
  meta: { requiresAuth: true }
    }
  ]
})