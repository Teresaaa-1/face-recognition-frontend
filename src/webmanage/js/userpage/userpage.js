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