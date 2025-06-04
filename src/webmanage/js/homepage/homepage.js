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
    // 生成粒子样式
    getParticleStyle(index) {
      const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#43e97b', '#38f9d7'];
      return {
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        backgroundColor: colors[index % colors.length],
        animationDelay: Math.random() * 10 + 's',
        animationDuration: (5 + Math.random() * 10) + 's'
      };
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