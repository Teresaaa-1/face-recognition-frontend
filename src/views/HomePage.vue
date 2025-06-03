<template>
  <div class="home-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </div>

    <!-- 登录状态显示区域 -->
    <div v-if="isLoggedIn" class="user-status">
      <div class="status-card">
        <div class="user-avatar">
          <div class="avatar-ring"></div>
          <i class="user-icon">👤</i>
          <div class="online-indicator"></div>
        </div>
        <div class="user-info">
          <h3>欢迎回来，{{ userInfo.username || userInfo.full_name || '用户' }}！</h3>
          <p class="user-details">
            <span v-if="userInfo.full_name">
              <i class="detail-icon">👤</i>
              {{ userInfo.full_name }}
            </span>
            <span v-if="userInfo.email">
              <i class="detail-icon">📧</i>
              {{ userInfo.email }}
            </span>
          </p>
          <p class="user-role">
            <span class="role-badge" :class="getRoleBadgeClass()">
              <i class="role-icon">🏆</i>
              {{ getUserRoleText() }}
            </span>
            <span class="access-level">
              <i class="level-icon">🔐</i>
              权限等级：{{ userInfo.access_level || 1 }}
            </span>
          </p>
          <p class="login-time">
            <i class="time-icon">🕐</i>
            登录时间：{{ loginTime }}
          </p>
        </div>
        <div class="user-actions">
          <button @click="logout" class="logout-btn">
            <i class="logout-icon">🚪</i>
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 主标题 -->
    <div class="main-header">
      <div class="header-content">
        <div class="title-decoration">
        </div>
        <h2>{{ isLoggedIn ? '人脸识别系统' : '欢迎来到人脸识别系统' }}</h2>
        <p v-if="!isLoggedIn" class="subtitle">智能、安全、便捷的身份认证解决方案</p>
        <div class="title-underline"></div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="menu-container">
      <!-- 未登录用户菜单 -->
      <div v-if="!isLoggedIn" class="menu-grid">
        <router-link to="/register" class="menu-item register">
          <div class="menu-icon-wrapper">
            <div class="menu-icon">📝</div>
            <div class="icon-glow"></div>
          </div>
          <div class="menu-content">
            <h3>用户注册</h3>
            <p>创建新账户，开启智能体验</p>
            <div class="menu-arrow">→</div>
          </div>
        </router-link>
        
        <router-link to="/login" class="menu-item login">
          <div class="menu-icon-wrapper">
            <div class="menu-icon">🔍</div>
            <div class="icon-glow"></div>
          </div>
          <div class="menu-content">
            <h3>人脸识别登录</h3>
            <p>AI技术快速人脸打卡</p>
            <div class="menu-arrow">→</div>
          </div>
        </router-link>

        <router-link to="/password-login" class="menu-item password-login">
          <div class="menu-icon-wrapper">
            <div class="menu-icon">🔐</div>
            <div class="icon-glow"></div>
          </div>
          <div class="menu-content">
            <h3>密码登录</h3>
            <p>传统方式稳定可靠账号管理</p>
            <div class="menu-arrow">→</div>
          </div>
        </router-link>
      </div>

      <!-- 已登录用户菜单 -->
      <div v-else class="menu-grid">
        <router-link to="/records" class="menu-item records">
          <div class="menu-icon-wrapper">
            <div class="menu-icon">📋</div>
            <div class="icon-glow"></div>
          </div>
          <div class="menu-content">
            <h3>打卡记录</h3>
            <p>查看我的打卡历史</p>
            <div class="menu-arrow">→</div>
          </div>
        </router-link>

        <router-link to="/users" class="menu-item users" v-if="canViewUsers">
          <div class="menu-icon-wrapper">
            <div class="menu-icon">👥</div>
            <div class="icon-glow"></div>
          </div>
          <div class="menu-content">
            <h3>查看用户</h3>
            <p>管理用户信息</p>
            <div class="menu-arrow">→</div>
          </div>
          <span class="admin-badge">
            <i class="badge-icon">👑</i>
            管理员
          </span>
        </router-link>

        <router-link to="/profile" class="menu-item profile">
          <div class="menu-icon-wrapper">
            <div class="menu-icon">⚙️</div>
            <div class="icon-glow"></div>
          </div>
          <div class="menu-content">
            <h3>个人设置</h3>
            <p>修改个人信息</p>
            <div class="menu-arrow">→</div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- 系统状态 -->
    <div class="system-status" v-if="isLoggedIn">
      <div class="status-header">
        <h4>系统状态</h4>
        <div class="status-indicator"></div>
      </div>
      <div class="status-items">
        <div class="status-item">
          <div class="status-icon">🟢</div>
          <span class="status-label">系统状态：</span>
          <span class="status-value online">正常运行</span>
        </div>
        <div class="status-item">
          <div class="status-icon">🕐</div>
          <span class="status-label">当前时间：</span>
          <span class="status-value">{{ currentTime }}</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="loading-container">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <p>正在获取用户信息...</p>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="checkLoginStatus" class="retry-btn">
        <i class="retry-icon">🔄</i>
        <span>重试</span>
      </button>
    </div>
  </div>
</template>

<script>
  
  import homepage from "../webmanage/js/homepage/homepage";
  export default homepage;

</script>

<style scoped>
  @import '../webmanage/css/homepage/homepage.css';

  /* 为密码登录菜单项添加特殊样式 */
  .menu-item.password-login {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    border: none;
  }

  .menu-item.password-login:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(79, 70, 229, 0.3);
  }

  .menu-item.password-login .menu-icon {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 15px;
    font-size: 24px;
  }

  .menu-item.password-login h3 {
    color: white;
    margin: 15px 0 8px 0;
  }

  .menu-item.password-login p {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
  }

  /* 调整菜单网格，支持3个项目的布局 */
  .menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 25px;
    max-width: 900px;
    margin: 0 auto;
  }

  /* 响应式调整 */
  @media (max-width: 768px) {
    .menu-grid {
      grid-template-columns: 1fr;
      max-width: 400px;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    .menu-grid {
      grid-template-columns: repeat(2, 1fr);
      max-width: 600px;
    }
  }
</style>