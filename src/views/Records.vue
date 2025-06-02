<template>
  <div class="records-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>打卡记录</h1>
      <div class="user-info" v-if="currentUser">
        <span>当前用户：{{ currentUser.username }}</span>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <div class="filter-item">
        <label>选择日期：</label>
        <input 
          type="date" 
          v-model="selectedDate" 
          @change="fetchRecords"
          class="date-input"
        >
      </div>
      <div class="filter-item">
        <label>显示条数：</label>
        <select v-model="recordLimit" @change="fetchRecords" class="limit-select">
          <option value="10">10条</option>
          <option value="20">20条</option>
          <option value="50">50条</option>
          <option value="0">全部</option>
        </select>
      </div>
      <button @click="fetchRecords" class="refresh-btn">刷新</button>
    </div>

    <!-- 加载状态 -->
    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>正在加载打卡记录...</p>
    </div>

    <!-- 错误提示 -->
    <div class="error-message" v-else-if="error">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="fetchRecords" class="retry-btn">重试</button>
    </div>

    <!-- 记录列表 -->
    <div class="records-list" v-else-if="records.length > 0">
      <div class="records-summary">
        <p>共找到 {{ totalCount }} 条记录，当前显示 {{ records.length }} 条</p>
      </div>
      
      <!-- 小卡片网格布局 -->
      <div class="records-grid">
        <div 
          class="record-card" 
          v-for="record in records" 
          :key="record.id"
          :class="getCardClass(record.clock_type)"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <div class="type-badge" :class="getTypeClass(record.clock_type)">
              <span class="type-icon">{{ getTypeIcon(record.clock_type) }}</span>
              <span class="type-text">{{ getTypeShortText(record.clock_type) }}</span>
            </div>
            <div class="status-indicator" :class="getStatusClass(record.status)">
              {{ getStatusIcon(record.status) }}
            </div>
          </div>

          <!-- 时间显示 -->
          <div class="card-time">
            <div class="time-main">{{ formatTime(record.clock_time) }}</div>
            <div class="date-sub">{{ formatDate(record.clock_time) }}</div>
          </div>

          <!-- 详细信息 -->
          <div class="card-details">
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <span class="detail-text">{{ record.point_name || '主入口' }}</span>
            </div>
            <div class="detail-item" v-if="record.notes">
              <span class="detail-icon">📝</span>
              <span class="detail-text">{{ record.notes }}</span>
            </div>
            <div class="detail-item record-id">
              <span class="detail-icon">#</span>
              <span class="detail-text">{{ record.id }}</span>
            </div>
          </div>

          <!-- 状态文字 -->
          <div class="card-status" :class="getStatusClass(record.status)">
            {{ getStatusText(record.status) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 无记录提示 -->
    <div class="no-records" v-else-if="!loading">
      <div class="no-records-icon">📋</div>
      <h3>暂无打卡记录</h3>
      <p>{{ selectedDate ? '选择的日期没有打卡记录' : '还没有任何打卡记录' }}</p>
      <button @click="goToClockIn" class="clock-btn">去打卡</button>
    </div>

    <!-- 返回按钮 -->
    <div class="action-buttons">
      <button @click="goBack" class="back-btn">返回</button>
      <button @click="goToHome" class="home-btn">回到首页</button>
    </div>

    <!-- 调试信息 (开发环境) -->
    <div class="debug-info" v-if="showDebug">
      <details>
        <summary>调试信息</summary>
        <div class="debug-content">
          <p><strong>当前用户ID：</strong> {{ currentUserId }}</p>
          <p><strong>路由参数：</strong> {{ JSON.stringify($route.params) }}</p>
          <p><strong>查询参数：</strong> {{ JSON.stringify($route.query) }}</p>
          <p><strong>选择日期：</strong> {{ selectedDate }}</p>
          <p><strong>记录限制：</strong> {{ recordLimit }}</p>
          <p><strong>总记录数：</strong> {{ totalCount }}</p>
          <p><strong>Token状态：</strong> {{ hasValidToken ? '有效' : '无效' }}</p>
        </div>
      </details>
    </div>
  </div>
</template>

<script>
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
</script>

<style scoped>
.records-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 28px;
}

.user-info span {
  color: #666;
  font-size: 16px;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-weight: bold;
  color: #333;
}

.date-input, .limit-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.refresh-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.refresh-btn:hover {
  background-color: #0056b3;
}

.loading {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  border-left: 4px solid #dc3545;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 20px;
}

.retry-btn:hover {
  background-color: #c82333;
}

.records-summary {
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.records-summary p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 新的小卡片网格布局 */
.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.record-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  transition: all 0.3s ease;
  border-left: 4px solid #007bff;
  position: relative;
  overflow: hidden;
}

.record-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-check-in {
  border-left-color: #28a745;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.02) 0%, rgba(255, 255, 255, 1) 100%);
}

.card-check-out {
  border-left-color: #ffc107;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.02) 0%, rgba(255, 255, 255, 1) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
}

.type-check-in {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.type-check-out {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.type-icon {
  font-size: 14px;
}

.status-indicator {
  font-size: 16px;
}

.card-time {
  text-align: center;
  margin-bottom: 16px;
  padding: 8px 0;
}

.time-main {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
}

.date-sub {
  font-size: 12px;
  color: #666;
}

.card-details {
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
}

.detail-text {
  color: #666;
  flex: 1;
  word-break: break-all;
}

.record-id .detail-text {
  color: #999;
  font-family: monospace;
}

.card-status {
  text-align: center;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-top: 8px;
}

.card-status.success {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.card-status.pending {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.card-status.failed {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.card-status.unknown {
  background: rgba(108, 117, 125, 0.1);
  color: #6c757d;
}

.no-records {
  background: white;
  padding: 60px 40px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.no-records-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-records h3 {
  color: #333;
  margin-bottom: 16px;
}

.no-records p {
  color: #666;
  margin-bottom: 30px;
}

.clock-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.clock-btn:hover {
  background-color: #1e7e34;
}

.action-buttons {
  margin-top: 30px;
  text-align: center;
  gap: 15px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.back-btn, .home-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.back-btn {
  background-color: #6c757d;
  color: white;
}

.back-btn:hover {
  background-color: #545b62;
}

.home-btn {
  background-color: #007bff;
  color: white;
}

.home-btn:hover {
  background-color: #0056b3;
}

.debug-info {
  margin-top: 30px;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.debug-info summary {
  cursor: pointer;
  font-weight: bold;
  color: #666;
  margin-bottom: 10px;
}

.debug-content {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.debug-content p {
  margin: 5px 0;
  font-family: monospace;
  font-size: 12px;
  color: #495057;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .records-container {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-item {
    justify-content: space-between;
  }
  
  .records-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .record-card {
    min-width: unset;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .records-grid {
    grid-template-columns: 1fr;
  }
  
  .record-card {
    padding: 12px;
  }
  
  .time-main {
    font-size: 20px;
  }
}</style>