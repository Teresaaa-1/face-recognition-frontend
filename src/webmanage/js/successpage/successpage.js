import axios from 'axios';

export default {
  name: 'SuccessPage',
  data() {
    return {
      username: this.$route.params.username || '用户',
      currentTime: new Date().toLocaleString(),
      clockRecord: null,
      routeClockInfo: null,
      loading: false,
      error: null,
      tokenMissing: false,
      hasValidToken: false,
      currentUserId: null, // 存储当前用户ID
      currentToken: null,  // 存储当前有效Token
      showDebug: process.env.NODE_ENV === 'development',
      tokenDebugInfo: {}
    }
  },
  async created() {
    // 首先获取路由传递的打卡信息
    this.getRouteClockInfo();
    
    // 检查Token并尝试获取详细记录
    await this.checkTokenAndGetRecord();
  },
  methods: {
    getRouteClockInfo() {
      // 从路由参数获取打卡成功信息
      const params = this.$route.params;
      
      if (params.record_id) {
        this.routeClockInfo = {
          record_id: params.record_id,
          clock_type: params.clock_type,
          clock_type_text: params.clock_type_text,
          user_id: params.user_id
        };
        console.log('从路由获取打卡信息:', this.routeClockInfo);
        
        // 如果路由参数中有用户ID，优先使用
        if (params.user_id) {
          this.currentUserId = params.user_id;
        }
      }
    },
    
    checkAllPossibleTokenKeys() {
      // 检查所有可能的Token存储键名
      const possibleKeys = [
        'token',        // 最常见的键名，优先检查
        'authToken',
        'accessToken',
        'access_token',
        'jwt_token',
        'bearer_token',
        'auth_token'
      ];
      
      const tokenInfo = {};
      let foundToken = null;
      
      // 首先检查 localStorage
      possibleKeys.forEach(key => {
        const token = localStorage.getItem(key);
        tokenInfo[`localStorage.${key}`] = token;
        if (token && !foundToken) {
          foundToken = token;
          console.log(`找到Token in localStorage.${key}:`, token.substring(0, 20) + '...');
        }
      });
      
      // 然后检查 sessionStorage
      possibleKeys.forEach(key => {
        const token = sessionStorage.getItem(key);
        const sessionKey = `sessionStorage.${key}`;
        tokenInfo[sessionKey] = token;
        if (token && !foundToken) {
          foundToken = token;
          console.log(`找到Token in ${sessionKey}:`, token.substring(0, 20) + '...');
        }
      });
      
      this.tokenDebugInfo = tokenInfo;
      
      if (this.showDebug) {
        console.log('Token调试信息:', tokenInfo);
      }
      
      return foundToken;
    },
    
    async checkTokenAndGetRecord() {
      // 检查所有可能的Token存储位置
      const token = this.checkAllPossibleTokenKeys();
      
      if (!token) {
        console.warn('未找到任何认证Token');
        this.tokenMissing = true;
        this.hasValidToken = false;
        return;
      }
      
      this.currentToken = token;
      console.log('找到Token，准备验证...');
      
      try {
        // 先验证Token是否有效并获取用户信息
        const profileResponse = await axios.get('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Token验证成功:', profileResponse.data);
        this.hasValidToken = true;
        
        // 从profile响应中获取用户ID
        if (profileResponse.data && profileResponse.data.profile) {
          this.currentUserId = profileResponse.data.profile.user_id;
          console.log('从profile API获取到用户ID:', this.currentUserId);
          
          // 更新用户名
          if (profileResponse.data.profile.username) {
            this.username = profileResponse.data.profile.username;
          }
        }
        
        // 如果profile中没有获取到用户ID，尝试从路由参数获取
        if (!this.currentUserId && this.$route.params.user_id) {
          this.currentUserId = this.$route.params.user_id;
          console.log('从路由参数获取到用户ID:', this.currentUserId);
        }
        
        // Token有效且有用户ID，尝试获取打卡记录
        if (this.currentUserId) {
          await this.getClockRecord(token, this.currentUserId);
        } else {
          console.warn('无法获取用户ID，跳过获取记录');
        }
        
      } catch (error) {
        console.error('Token验证失败:', error);
        this.hasValidToken = false;
        this.currentToken = null;
        
        if (error.response?.status === 401) {
          this.tokenMissing = true;
          this.error = 'Token已过期，请重新登录';
        } else {
          this.error = `Token验证失败: ${error.response?.data?.message || error.message}`;
        }
      }
    },
    
    async getClockRecord(token, userId) {
      if (!userId) {
        console.warn('未获取到用户ID，跳过获取记录');
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        console.log(`正在获取用户 ${userId} 的最新打卡记录...`);
        
        const response = await axios.get(`/api/clock/records/${userId}?limit=20`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('获取记录API响应:', response.data);
        
        if (response.data.success && response.data.records?.length > 0) {
          this.clockRecord = response.data.records[0];
          console.log('获取到最新打卡记录:', this.clockRecord);
        } else {
          console.warn('未获取到打卡记录');
        }
        
      } catch (error) {
        console.error('获取打卡记录失败:', error);
        
        if (error.response?.status === 401) {
          this.tokenMissing = true;
          this.hasValidToken = false;
          this.currentToken = null;
          this.error = '认证已过期';
        } else {
          this.error = `获取记录失败: ${error.response?.data?.message || error.message}`;
        }
        
      } finally {
        this.loading = false;
      }
    },
    
    async retryGetRecord() {
      await this.checkTokenAndGetRecord();
    },
    
    // 安全导航到首页
    navigateToHome() {
      this.safeNavigate('/');
    },
    
    // 安全导航到记录页面
    navigateToRecords() {
      if (!this.hasValidToken || !this.currentUserId) {
        console.warn('无有效Token或用户ID，无法查看记录');
        this.goToLogin();
        return;
      }
      
      // 确保Token存储正确
      if (this.currentToken) {
        // 统一使用 'token' 作为存储键名
        localStorage.setItem('token', this.currentToken);
        console.log('已确保Token存储在localStorage.token');
      }
      
      // 传递用户ID作为路由参数
      const routeConfig = {
        path: '/records',
        query: {
          user_id: this.currentUserId
        }
      };
      
      console.log('导航到记录页面，路由配置:', routeConfig);
      this.safeNavigate(routeConfig);
    },
    
    // 安全导航方法，避免重复导航错误
    safeNavigate(routeConfig) {
      // 如果传入的是字符串路径
      if (typeof routeConfig === 'string') {
        if (this.$route.path !== routeConfig) {
          this.$router.push(routeConfig).catch(err => {
            if (err.name !== 'NavigationDuplicated') {
              console.error('导航错误:', err);
            }
          });
        }
        return;
      }
      
      // 如果传入的是路由配置对象
      const targetPath = routeConfig.path || routeConfig.name;
      if (this.$route.path !== targetPath) {
        this.$router.push(routeConfig).catch(err => {
          if (err.name !== 'NavigationDuplicated') {
            console.error('导航错误:', err);
          }
        });
      }
    },
    
    goToLogin() {
      // 清除所有可能存在的无效Token
      const possibleKeys = ['token', 'authToken', 'accessToken', 'access_token', 'jwt_token', 'bearer_token', 'auth_token'];
      possibleKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // 清空当前状态
      this.currentToken = null;
      this.currentUserId = null;
      this.hasValidToken = false;
      
      console.log('已清除所有Token，准备跳转到登录页');
      this.safeNavigate('/login');
    },
    
    formatTime(timeString) {
      if (!timeString) return '';
      
      try {
        const date = new Date(timeString);
        return date.toLocaleString('zh-CN');
      } catch (error) {
        console.error('时间格式化失败:', error);
        return timeString;
      }
    }
  }
}