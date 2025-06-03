import axios from 'axios';

export default {
  name: 'ClockRecords',
  data() {
    return {
      records: [],
      loading: true,
      error: null,
      currentUser: null,
      currentUserId: null,
      hasValidToken: false,
      selectedDate: '',
      recordLimit: 20,
      totalCount: 0,
      showDebug: process.env.NODE_ENV === 'development'
    }
  },
  async created() {
    await this.initializeComponent();
  },
  methods: {
    async initializeComponent() {
      try {
        // 1. 检查Token和用户信息
        await this.checkAuthentication();
        
        // 2. 获取用户ID
        this.getUserId();
        
        // 3. 获取打卡记录
        if (this.currentUserId) {
          await this.fetchRecords();
        } else {
          this.error = '无法获取用户ID';
          this.loading = false;
        }
      } catch (error) {
        console.error('组件初始化失败:', error);
        this.error = '页面初始化失败';
        this.loading = false;
      }
    },

    async checkAuthentication() {
      const token = localStorage.getItem('token');
      
      if (!token) {
        this.error = '未找到认证信息，请重新登录';
        this.loading = false;
        return;
      }

      try {
        const response = await axios.get('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.profile) {
          this.currentUser = response.data.profile;
          this.hasValidToken = true;
          console.log('用户认证成功:', this.currentUser);
        }
      } catch (error) {
        console.error('Token验证失败:', error);
        this.hasValidToken = false;
        
        if (error.response?.status === 401) {
          this.error = '登录已过期，请重新登录';
        } else {
          this.error = '认证验证失败';
        }
      }
    },

    getUserId() {
      // 优先从路由查询参数获取
      if (this.$route.query.user_id) {
        this.currentUserId = parseInt(this.$route.query.user_id);
        console.log('从路由查询参数获取用户ID:', this.currentUserId);
        return;
      }

      // 从路由路径参数获取
      if (this.$route.params.user_id) {
        this.currentUserId = parseInt(this.$route.params.user_id);
        console.log('从路由路径参数获取用户ID:', this.currentUserId);
        return;
      }

      // 从当前用户信息获取
      if (this.currentUser && this.currentUser.user_id) {
        this.currentUserId = this.currentUser.user_id;
        console.log('从当前用户信息获取用户ID:', this.currentUserId);
        return;
      }

      console.warn('未能获取到用户ID');
    },

    async fetchRecords() {
      if (!this.currentUserId || !this.hasValidToken) {
        this.error = '缺少必要的认证信息';
        this.loading = false;
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const token = localStorage.getItem('token');
        let url = `/api/clock/records/${this.currentUserId}`;
        
        // 构建查询参数
        const params = new URLSearchParams();
        if (this.selectedDate) {
          params.append('date', this.selectedDate);
        }
        if (this.recordLimit > 0) {
          params.append('limit', this.recordLimit);
        } else {
          params.append('limit', '0'); // 0表示获取全部
        }

        if (params.toString()) {
          url += '?' + params.toString();
        }

        console.log('请求URL:', url);

        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('API响应:', response.data);

        if (response.data.success) {
          this.records = response.data.records || [];
          this.totalCount = response.data.total_available || response.data.count || 0;
        } else {
          this.error = response.data.message || '获取记录失败';
        }

      } catch (error) {
        console.error('获取记录失败:', error);
        
        if (error.response?.status === 401) {
          this.error = '认证已过期，请重新登录';
          this.hasValidToken = false;
        } else if (error.response?.status === 403) {
          this.error = '权限不足，无法查看记录';
        } else {
          this.error = `获取记录失败: ${error.response?.data?.message || error.message}`;
        }
      } finally {
        this.loading = false;
      }
    },

    formatTime(dateTimeString) {
      if (!dateTimeString) return '';
      try {
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return '';
      }
    },

    formatDate(dateTimeString) {
      if (!dateTimeString) return '';
      try {
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit'
        });
      } catch (error) {
        return '';
      }
    },

    formatDateTime(dateTimeString) {
      if (!dateTimeString) return '';
      
      try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (error) {
        console.error('时间格式化失败:', error);
        return dateTimeString;
      }
    },

    getCardClass(clockType) {
      return clockType === 'check_in' ? 'card-check-in' : 'card-check-out';
    },

    getTypeClass(clockType) {
      return clockType === 'check_in' ? 'type-check-in' : 'type-check-out';
    },

    getTypeIcon(clockType) {
      return clockType === 'check_in' ? '🌅' : '🌇';
    },

    getTypeShortText(clockType) {
      return clockType === 'check_in' ? '上班' : '下班';
    },

    getStatusClass(status) {
      switch (status) {
        case 1: return 'success';
        case 0: return 'pending';
        case -1: return 'failed';
        default: return 'unknown';
      }
    },

    getStatusIcon(status) {
      switch (status) {
        case 1: return '✅';
        case 0: return '⏳';
        case -1: return '❌';
        default: return '❓';
      }
    },

    getStatusText(status) {
      switch (status) {
        case 1: return '成功';
        case 0: return '处理中';
        case -1: return '失败';
        default: return '未知';
      }
    },

    goBack() {
      this.$router.go(-1);
    },

    goToHome() {
      this.$router.push('/').catch(err => {
        if (err.name !== 'NavigationDuplicated') {
          console.error('导航错误:', err);
        }
      });
    },

    goToClockIn() {
      this.$router.push('/').catch(err => {
        if (err.name !== 'NavigationDuplicated') {
          console.error('导航错误:', err);
        }
      });
    }
  }
}