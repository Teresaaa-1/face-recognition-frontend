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
    import successpage from "../webmanage/js/successpage/successpage";
    export default successpage;
</script>

<style scoped>
      @import '../webmanage/css/successpage/successpage.css'
</style>