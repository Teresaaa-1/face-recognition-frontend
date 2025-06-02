<template>
  <div class="success-container">
    <div class="success-card">
      <div class="success-icon">✓</div>
      <h1>打卡成功！</h1>
      <p class="welcome-message">欢迎回来，{{ username }}！</p>
      <p class="time-message">打卡时间：{{ currentTime }}</p>
      
      <!-- 从路由参数获取的打卡信息 -->
      <div class="clock-info" v-if="routeClockInfo">
        <p>打卡类型：{{ routeClockInfo.clock_type_text || (routeClockInfo.clock_type === 'check_in' ? '上班打卡' : '下班打卡') }}</p>
        <p>记录ID：{{ routeClockInfo.record_id }}</p>
      </div>
      
      <!-- API获取的详细打卡信息 -->
      <div class="clock-info" v-else-if="clockRecord">
        <p>打卡类型：{{ clockRecord.clock_type === 'check_in' ? '上班打卡' : '下班打卡' }}</p>
        <p>打卡地点：{{ clockRecord.point_name || '主入口' }}</p>
        <p v-if="clockRecord.clock_time">记录时间：{{ formatTime(clockRecord.clock_time) }}</p>
      </div>
      
      <!-- 加载状态 -->
      <div class="loading" v-else-if="loading">
        <p>正在获取打卡详情...</p>
      </div>
      
      <!-- Token问题提示 -->
      <div class="warning-info" v-else-if="tokenMissing">
        <p>⚠️ 认证信息已过期，无法获取详细记录</p>
        <p>但您的打卡已成功记录！</p>
      </div>
      
      <!-- 其他错误信息 -->
      <div class="error-info" v-else-if="error">
        <p class="error-message">{{ error }}</p>
        <button @click="retryGetRecord" class="retry-btn" v-if="!tokenMissing">重试获取</button>
      </div>
      
      <!-- Token调试信息 -->
      <div class="debug-info" v-if="showDebug">
        <details>
          <summary>Token调试信息</summary>
          <div class="token-debug">
            <p><strong>当前检查的Token键名：</strong></p>
            <ul>
              <li v-for="(value, key) in tokenDebugInfo" :key="key">
                {{ key }}: {{ value ? '✓ 存在' : '✗ 不存在' }}
                <span v-if="value" class="token-preview">({{ value.substring(0, 20) }}...)</span>
              </li>
            </ul>
            <p><strong>路由参数：</strong></p>
            <pre>{{ JSON.stringify($route.params, null, 2) }}</pre>
            <p><strong>用户ID：</strong> {{ currentUserId }}</p>
            <p><strong>Token 状态：</strong> {{ hasValidToken ? '有效' : '无效' }}</p>
          </div>
        </details>
      </div>
      
      <div class="action-buttons">
        <button @click="navigateToHome" class="home-link">返回首页</button>
        <button @click="navigateToRecords" class="records-link" v-if="hasValidToken && currentUserId">查看记录</button>
        <button @click="goToLogin" class="login-btn" v-else>重新登录</button>
      </div>
    </div>
  </div>
</template>

<script>
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
</script>

<style scoped>
.success-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.success-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 40px;
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.success-icon {
  font-size: 72px;
  color: #4CAF50;
  margin-bottom: 20px;
}

h1 {
  color: #333;
  margin-bottom: 16px;
}

.welcome-message {
  font-size: 18px;
  color: #555;
  margin-bottom: 8px;
}

.time-message {
  font-size: 16px;
  color: #777;
  margin-bottom: 30px;
}

.clock-info {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  border-left: 4px solid #4CAF50;
}

.clock-info p {
  margin: 8px 0;
  color: #333;
}

.loading {
  margin: 20px 0;
  color: #666;
}

.warning-info {
  margin: 20px 0;
  padding: 15px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.warning-info p {
  color: #856404;
  margin: 5px 0;
}

.error-info {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  border-left: 4px solid #dc3545;
}

.error-message {
  color: #721c24;
  margin-bottom: 10px;
}

.retry-btn {
  background-color: #ffc107;
  color: #212529;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background-color: #e0a800;
}

.debug-info {
  margin: 20px 0;
  text-align: left;
}

.debug-info details {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
}

.debug-info summary {
  cursor: pointer;
  font-weight: bold;
  color: #495057;
}

.token-debug {
  margin-top: 10px;
}

.token-debug ul {
  list-style-type: none;
  padding-left: 0;
}

.token-debug li {
  padding: 5px 0;
  font-family: monospace;
}

.token-preview {
  color: #6c757d;
  font-size: 0.85em;
}

.token-debug pre {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  overflow: auto;
  font-size: 12px;
}

.action-buttons {
  margin-top: 30px;
}

.home-link, .records-link, .login-btn {
  display: inline-block;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.3s;
  margin: 0 5px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.home-link {
  background-color: #007bff;
  color: white;
}

.home-link:hover {
  background-color: #0056b3;
}

.records-link {
  background-color: #28a745;
  color: white;
}

.records-link:hover {
  background-color: #1e7e34;
}

.login-btn {
  background-color: #dc3545;
  color: white;
}

.login-btn:hover {
  background-color: #c82333;
}

/* 禁用状态样式 */
.records-link:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
</style>