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
      <button @click="goToClockIn" class="clock-btn">回到首页</button>
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
    import records from "../webmanage/js/records/records";
  export default records;
</script>

<style scoped>
  @import '../webmanage/css/records/records.css'
</style>