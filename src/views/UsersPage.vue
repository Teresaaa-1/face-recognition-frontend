<template>
  <div class="users-container">
    <h2>已注册用户</h2>
    
    <!-- 添加权限检查提示 -->
    <div v-if="!hasPermission" class="permission-warning">
      <p>您没有权限查看用户列表。请联系管理员或使用管理员账户登录。</p>
      <router-link to="/login" class="login-link">重新登录</router-link>
    </div>
    
    <div v-else-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载用户列表...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadUsers" class="retry-btn">重试</button>
      <router-link to="/login" v-if="isAuthError" class="login-link">去登录</router-link>
    </div>
    
    <div v-else-if="users.length === 0" class="no-users">
      <p>暂无注册用户</p>
      <router-link to="/register" class="register-link">立即注册</router-link>
    </div>
    
    <div v-else class="users-list">
      <div class="user-card" v-for="user in users" :key="user.user_id || user.username">
        <div class="user-info">
          <h3>{{ user.full_name }}</h3>
          <p><strong>用户名:</strong> {{ user.username }}</p>
          <p><strong>邮箱:</strong> {{ user.email || '未设置' }}</p>
          <p><strong>电话:</strong> {{ user.phone || '未设置' }}</p>
          <p><strong>用户组:</strong> {{ user.group_name || '默认组' }}</p>
          <p><strong>权限等级:</strong> {{ user.access_level || 1 }}</p>
          <p><strong>状态:</strong> 
            <span :class="user.status === 1 ? 'status-active' : 'status-inactive'">
              {{ user.status === 1 ? '正常' : '禁用' }}
            </span>
          </p>
          <p class="register-time"><strong>注册时间:</strong> {{ formatDate(user.created_at) }}</p>
        </div>
      </div>
    </div>
    
    <div class="actions" v-if="hasPermission">
      <button @click="loadUsers" :disabled="loading" class="refresh-btn">
        {{ loading ? '刷新中...' : '刷新列表' }}
      </button>
      <router-link to="/" class="back-link">返回首页</router-link>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UsersPage',
  data() {
    return {
      users: [],
      loading: false,
      error: null,
      isAuthError: false,
      hasPermission: false,
      userInfo: {}
    };
  },
  async mounted() {
    await this.checkPermissionAndLoad();
  },
  methods: {
    async checkPermissionAndLoad() {
      // 检查用户是否已登录并获取用户信息
      const loginResult = await this.checkLoginStatus();
      if (!loginResult) {
        this.isAuthError = true;
        this.error = '请先登录';
        return;
      }

      // 使用与HomePage.vue相同的权限检查逻辑
      this.hasPermission = this.canViewUsers();

      if (this.hasPermission) {
        await this.loadUsers();
      }
    },

    async checkLoginStatus() {
      try {
        // 检查所有可能的token存储位置
        const token = this.findToken();
        
        if (!token) {
          return false;
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
          this.userInfo = response.data.profile;
          
          // 确保token存储在标准位置
          localStorage.setItem('token', token);
          
          console.log('用户登录状态已确认:', this.userInfo);
          return true;
        } else {
          throw new Error('用户信息格式错误');
        }

      } catch (error) {
        console.error('检查登录状态失败:', error);
        
        if (error.response?.status === 401) {
          // Token过期或无效
          this.clearAuthData();
        }
        
        return false;
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

    // 使用与HomePage.vue相同的权限检查逻辑
    canViewUsers() {
      if (!this.userInfo) return false;
      
      // 管理员权限检查：优先检查组名，然后检查权限等级
      return (
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
    },

    async loadUsers() {
      // 再次检查token
      const token = this.findToken();
      if (!token) {
        this.isAuthError = true;
        this.error = 'Token已失效，请重新登录';
        return;
      }

      this.loading = true;
      this.error = null;
      this.isAuthError = false;
      
      try {
        console.log('开始加载用户列表...');
        
        // 直接使用axios调用API
        const response = await axios.get('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('API响应:', response);
        
        // 处理不同的响应格式
        if (response.data.success === false) {
          throw new Error(response.data.message || '获取用户列表失败');
        }
        
        // 提取用户数据
        if (response.data.success === true && response.data.data) {
          this.users = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        } else if (Array.isArray(response.data)) {
          this.users = response.data;
        } else {
          this.users = response.data.users || [];
        }
        
        console.log('用户列表加载完成:', this.users);
        
      } catch (error) {
        console.error('获取用户列表错误:', error);
        this.handleError(error);
      } finally {
        this.loading = false;
      }
    },

    handleError(error) {
      let errorMessage = '获取用户列表失败';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        console.log('错误响应:', { status, data });
        
        if (status === 401) {
          this.isAuthError = true;
          errorMessage = data?.message || '登录已过期，请重新登录';
          // 清除过期的认证信息
          this.clearAuthData();
        } else if (status === 403) {
          errorMessage = data?.message || '没有权限查看用户列表';
          this.hasPermission = false;
        } else if (status === 500) {
          errorMessage = '服务器内部错误，请稍后重试';
        } else {
          errorMessage = data?.message || `请求失败 (${status})`;
        }
      } else if (error.request) {
        errorMessage = '无法连接到服务器，请检查网络连接';
      } else {
        errorMessage = error.message;
      }
      
      this.error = errorMessage;
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
    },

    formatDate(dateString) {
      if (!dateString) return '未知';
      try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return dateString;
      }
    }
  }
};
</script>

<style scoped>
.users-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h2 {
  color: #333;
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 300;
}

.permission-warning {
  text-align: center;
  margin: 50px 0;
  padding: 30px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
}

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
  margin: 50px 0;
  padding: 30px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

.retry-btn, .login-link {
  margin: 10px 5px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
}

.retry-btn:hover {
  background-color: #c82333;
  transform: translateY(-1px);
}

.login-link, .register-link {
  background-color: #007bff;
  color: white;
}

.login-link:hover, .register-link:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.no-users {
  text-align: center;
  margin: 60px 0;
  padding: 40px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.users-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 25px;
  margin: 40px 0;
}

.user-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 25px;
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.user-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #007bff, #28a745);
}

.user-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.user-info h3 {
  color: #007bff;
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.user-info p {
  margin: 10px 0;
  color: #555;
  font-size: 14px;
  line-height: 1.5;
}

.user-info p strong {
  color: #333;
  font-weight: 600;
}

.status-active {
  color: #28a745;
  font-weight: bold;
  padding: 2px 8px;
  background-color: #d4edda;
  border-radius: 12px;
  font-size: 12px;
}

.status-inactive {
  color: #dc3545;
  font-weight: bold;
  padding: 2px 8px;
  background-color: #f8d7da;
  border-radius: 12px;
  font-size: 12px;
}

.register-time {
  color: #6c757d;
  font-size: 13px;
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-top: 15px;
}

.actions {
  text-align: center;
  margin: 50px 0;
  padding: 30px 0;
  border-top: 1px solid #eee;
}

.refresh-btn, .back-link {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  margin: 0 10px;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  cursor: pointer;
}

.refresh-btn {
  background-color: #28a745;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #218838;
  transform: translateY(-2px);
}

.refresh-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.back-link {
  background-color: #6c757d;
  color: white;
}

.back-link:hover {
  background-color: #545b62;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .users-container {
    padding: 15px;
  }
  
  .users-list {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .user-card {
    padding: 20px;
  }
  
  .actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .refresh-btn, .back-link {
    margin: 0;
  }
  
  h2 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .users-container {
    padding: 10px;
  }
  
  .user-card {
    padding: 15px;
  }
  
  .user-info h3 {
    font-size: 18px;
  }
}
</style>