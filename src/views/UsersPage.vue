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
    import userpage from "../webmanage/js/userpage/userpage";
    export default userpage;
</script>

<style scoped>
      @import '../webmanage/css/userpage/userpage.css'
</style>