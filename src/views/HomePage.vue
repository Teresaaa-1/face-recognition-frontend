<template>
  <div class="home-container">
    <!-- 登录状态显示区域 -->
    <div v-if="isLoggedIn" class="user-status">
      <div class="status-card">
        <div class="user-avatar">
          <i class="user-icon">👤</i>
        </div>
        <div class="user-info">
          <h3>欢迎回来，{{ userInfo.username || userInfo.full_name || '用户' }}！</h3>
          <p class="user-details">
            <span v-if="userInfo.full_name">姓名：{{ userInfo.full_name }}</span>
            <span v-if="userInfo.email">邮箱：{{ userInfo.email }}</span>
          </p>
          <p class="user-role">
            <span class="role-badge" :class="getRoleBadgeClass()">
              {{ getUserRoleText() }}
            </span>
            <span class="access-level">权限等级：{{ userInfo.access_level || 1 }}</span>
          </p>
          <p class="login-time">登录时间：{{ loginTime }}</p>
        </div>
        <div class="user-actions">
          <button @click="logout" class="logout-btn">退出登录</button>
        </div>
      </div>
    </div>

    <!-- 主标题 -->
    <div class="main-header">
      <h2>{{ isLoggedIn ? '人脸识别系统' : '欢迎来到人脸识别系统' }}</h2>
      <p v-if="!isLoggedIn">请选择一个操作：</p>
    </div>

    <!-- 功能菜单 -->
    <div class="menu-container">
      <!-- 未登录用户菜单 -->
      <div v-if="!isLoggedIn" class="menu-grid">
        <router-link to="/register" class="menu-item register">
          <div class="menu-icon">📝</div>
          <h3>用户注册</h3>
          <p>注册新用户账户</p>
        </router-link>
        
        <router-link to="/login" class="menu-item login">
          <div class="menu-icon">🔐</div>
          <h3>人脸登录</h3>
          <p>使用人脸识别登录</p>
        </router-link>
      </div>

      <!-- 已登录用户菜单 -->
      <div v-else class="menu-grid">
        <router-link to="/records" class="menu-item records">
          <div class="menu-icon">📋</div>
          <h3>打卡记录</h3>
          <p>查看我的打卡记录</p>
        </router-link>

        <router-link to="/users" class="menu-item users" v-if="canViewUsers">
          <div class="menu-icon">👥</div>
          <h3>查看用户</h3>
          <p>管理用户信息</p>
          <span class="admin-badge">管理员</span>
        </router-link>

        <router-link to="/profile" class="menu-item profile">
          <div class="menu-icon">⚙️</div>
          <h3>个人设置</h3>
          <p>修改个人信息</p>
        </router-link>
      </div>
    </div>

    <!-- 系统状态 -->
    <div class="system-status" v-if="isLoggedIn">
      <div class="status-item">
        <span class="status-label">系统状态：</span>
        <span class="status-value online">正常运行</span>
      </div>
      <div class="status-item">
        <span class="status-label">当前时间：</span>
        <span class="status-value">{{ currentTime }}</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在获取用户信息...</p>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="checkLoginStatus" class="retry-btn">重试</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'HomePage',
  data() {
    return {
      isLoggedIn: false,
      userInfo: {},
      loading: false,
      error: null,
      currentTime: '',
      loginTime: '',
      timeInterval: null
    }
  },
  computed: {
    canViewUsers() {
    // 管理员权限检查：优先检查组名，然后检查权限等级
    return this.isLoggedIn && (
      // 优先检查组名是否为管理员
      (this.userInfo.group_name && (
        this.userInfo.group_name.includes('管理员') || 
        this.userInfo.group_name.toLowerCase().includes('admin')
      )) ||
      // 检查角色字段
      (this.userInfo.role && this.userInfo.role.includes('admin')) ||
      // 最后检查权限等级（可能需要调整阈值）
      (this.userInfo.access_level && this.userInfo.access_level >= 3)
    );
  }
  },
  async mounted() {
    await this.checkLoginStatus();
    this.startTimeUpdate();
  },
  beforeDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  },
  methods: {
    async checkLoginStatus() {
      this.loading = true;
      this.error = null;

      try {
        // 检查所有可能的token存储位置
        const token = this.findToken();
        
        if (!token) {
          this.isLoggedIn = false;
          this.userInfo = {};
          return;
        }

        console.log('找到Token，正在验证用户身份...');

        // 验证token并获取用户信息
        const response = await axios.get('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('用户信息获取成功:', response.data);

        if (response.data && response.data.profile) {
          this.isLoggedIn = true;
          this.userInfo = response.data.profile;
          this.loginTime = new Date().toLocaleString('zh-CN');
          
          // 确保token存储在标准位置
          localStorage.setItem('token', token);
          
          console.log('用户登录状态已确认:', this.userInfo);
        } else {
          throw new Error('用户信息格式错误');
        }

      } catch (error) {
        console.error('检查登录状态失败:', error);
        
        if (error.response?.status === 401) {
          // Token过期或无效
          this.clearAuthData();
          this.error = null; // 不显示错误，只是未登录状态
        } else {
          this.error = `获取用户信息失败: ${error.response?.data?.message || error.message}`;
        }
        
        this.isLoggedIn = false;
        this.userInfo = {};
      } finally {
        this.loading = false;
      }
    },

    findToken() {
      // 检查所有可能的token存储位置
      const possibleKeys = [
        'token',
        'authToken', 
        'accessToken',
        'access_token',
        'jwt_token',
        'bearer_token',
        'auth_token'
      ];

      // 优先检查localStorage
      for (const key of possibleKeys) {
        const token = localStorage.getItem(key);
        if (token) {
          console.log(`在localStorage.${key}中找到token`);
          return token;
        }
      }

      // 再检查sessionStorage
      for (const key of possibleKeys) {
        const token = sessionStorage.getItem(key);
        if (token) {
          console.log(`在sessionStorage.${key}中找到token`);
          return token;
        }
      }

      return null;
    },

    getUserRoleText() {
    // 优先使用组名
    if (this.userInfo.group_name) {
      return this.userInfo.group_name;
    } 
    // 其次根据权限等级判断
    else if (this.userInfo.access_level) {
      const level = this.userInfo.access_level;
      if (level >= 10) return '超级管理员';
      if (level >= 5) return '高级管理员'; 
      if (level >= 3) return '管理员';
      if (level >= 2) return '高级用户';
      return '普通用户';
    }
    return '普通用户';
  },

    getRoleBadgeClass() {
    // 优先检查组名
    if (this.userInfo.group_name) {
      const groupName = this.userInfo.group_name.toLowerCase();
      if (groupName.includes('管理员') || groupName.includes('admin')) {
        return 'admin';
      }
    }
    
    // 其次检查权限等级
    const level = this.userInfo.access_level || 1;
    if (level >= 10) return 'super-admin';
    if (level >= 5) return 'admin';
    if (level >= 3) return 'admin';
    if (level >= 2) return 'advanced';
    return 'normal';
  },

    startTimeUpdate() {
      this.updateCurrentTime();
      this.timeInterval = setInterval(() => {
        this.updateCurrentTime();
      }, 1000);
    },

    updateCurrentTime() {
      this.currentTime = new Date().toLocaleString('zh-CN');
    },

    async logout() {
      try {
        // 清除所有认证数据
        this.clearAuthData();
        
        // 重置状态
        this.isLoggedIn = false;
        this.userInfo = {};
        this.error = null;
        
        console.log('用户已登出');
        
        // 可选：调用后端登出接口
        // await axios.post('/api/logout');
        
      } catch (error) {
        console.error('登出过程中出现错误:', error);
        // 即使出错也要清除本地数据
        this.clearAuthData();
        this.isLoggedIn = false;
        this.userInfo = {};
      }
    },

    clearAuthData() {
      // 清除所有可能的token存储
      const possibleKeys = [
        'token', 'authToken', 'accessToken', 'access_token', 
        'jwt_token', 'bearer_token', 'auth_token'
      ];
      
      possibleKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('所有认证数据已清除');
    }
  }
}
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 用户状态卡片 */
.user-status {
  margin-bottom: 30px;
}

.status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 25px;
  color: white;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-icon {
  font-size: 48px;
  display: block;
  background: rgba(255, 255, 255, 0.2);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 600;
}

.user-details {
  margin: 8px 0;
  opacity: 0.9;
}

.user-details span {
  margin-right: 20px;
  font-size: 14px;
}

.user-role {
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 15px;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
}

.role-badge.super-admin {
  background: #ff6b6b;
}

.role-badge.admin {
  background: #feca57;
  color: #333;
}

.role-badge.advanced {
  background: #48dbfb;
  color: #333;
}

.role-badge.normal {
  background: rgba(255, 255, 255, 0.3);
}

.access-level {
  font-size: 14px;
  opacity: 0.9;
}

.login-time {
  margin: 8px 0 0 0;
  font-size: 13px;
  opacity: 0.8;
}

.user-actions {
  flex-shrink: 0;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* 主标题 */
.main-header {
  text-align: center;
  margin: 40px 0;
}

.main-header h2 {
  color: #333;
  font-size: 32px;
  font-weight: 300;
  margin-bottom: 10px;
}

.main-header p {
  color: #666;
  font-size: 16px;
}

/* 菜单网格 */
.menu-container {
  margin: 40px 0;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
}

.menu-item {
  display: block;
  padding: 30px 25px;
  border-radius: 15px;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.menu-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.menu-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.menu-icon {
  font-size: 48px;
  margin-bottom: 15px;
  text-align: center;
}

.menu-item h3 {
  color: #333;
  font-size: 20px;
  font-weight: 600;
  margin: 15px 0 10px 0;
  text-align: center;
}

.menu-item p {
  color: #666;
  font-size: 14px;
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

/* 不同菜单项的颜色主题 */
.menu-item.register {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.menu-item.register::before {
  background: #5a67d8;
}

.menu-item.register h3,
.menu-item.register p {
  color: white;
}

.menu-item.login {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.menu-item.login::before {
  background: #e53e3e;
}

.menu-item.login h3,
.menu-item.login p {
  color: white;
}

.menu-item.records {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.menu-item.records::before {
  background: #10b981;
}

.menu-item.records h3,
.menu-item.records p {
  color: white;
}

.menu-item.users {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
  position: relative;
}

.menu-item.users::before {
  background: #f59e0b;
}

.menu-item.users h3,
.menu-item.users p {
  color: white;
}

.admin-badge {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
}

.menu-item.profile {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
}

.menu-item.profile::before {
  background: #06b6d4;
}

/* 系统状态 */
.system-status {
  margin: 40px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  color: #666;
  font-size: 14px;
}

.status-value {
  color: #333;
  font-weight: 600;
  font-size: 14px;
}

.status-value.online {
  color: #28a745;
}

/* 加载和错误状态 */
.loading {
  text-align: center;
  margin: 60px 0;
}

.loading-spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  margin: 40px 0;
  padding: 20px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background-color: #c82333;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-container {
    padding: 15px;
  }
  
  .status-card {
    flex-direction: column;
    text-align: center;
  }
  
  .user-info h3 {
    font-size: 20px;
  }
  
  .menu-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .system-status {
    flex-direction: column;
    gap: 15px;
  }
  
  .main-header h2 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .home-container {
    padding: 10px;
  }
  
  .status-card {
    padding: 20px;
  }
  
  .menu-item {
    padding: 25px 20px;
  }
  
  .menu-icon {
    font-size: 36px;
  }
  
  .menu-item h3 {
    font-size: 18px;
  }
}
</style>