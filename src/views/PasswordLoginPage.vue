<template>
  <div class="password-login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">🔐</div>
        <h2>欢迎回来</h2>
        <p>使用您的账户信息登录系统</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">
            <i class="input-icon">👤</i>
            用户名
          </label>
          <input
            type="text"
            id="username"
            v-model="loginForm.username"
            placeholder="请输入您的用户名"
            required
            :disabled="loading"
            autocomplete="username"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">
            <i class="input-icon">🔒</i>
            密码
          </label>
          <div class="password-input-wrapper">
            <input
              :type="showPassword ? 'text' : 'password'"
              id="password"
              v-model="loginForm.password"
              placeholder="请输入您的密码"
              required
              :disabled="loading"
              autocomplete="current-password"
              class="form-input password-field"
            />
            <button
              type="button"
              class="password-toggle"
              @click="togglePasswordVisibility"
              :disabled="loading"
              :title="showPassword ? '隐藏密码' : '显示密码'"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="form-options">
          <label class="checkbox-container">
            <input
              type="checkbox"
              v-model="loginForm.rememberMe"
              :disabled="loading"
            />
            <span class="checkmark"></span>
            <span class="checkbox-text">记住登录状态</span>
          </label>
          <a href="#" class="forgot-password">忘记密码？</a>
        </div>

        <button
          type="submit"
          class="login-button"
          :disabled="loading || !isFormValid"
          :class="{ 'loading': loading }"
        >
          <span v-if="loading" class="loading-spinner"></span>
          <span class="button-text">{{ loading ? '登录中...' : '立即登录' }}</span>
        </button>
      </form>

      <!-- 消息提示 -->
      <transition name="message-fade">
        <div v-if="errorMessage" class="message error-message">
          <div class="message-icon">⚠️</div>
          <div class="message-content">
            <span class="message-text">{{ errorMessage }}</span>
          </div>
        </div>
      </transition>

      <transition name="message-fade">
        <div v-if="successMessage" class="message success-message">
          <div class="message-icon">✅</div>
          <div class="message-content">
            <span class="message-text">{{ successMessage }}</span>
          </div>
        </div>
      </transition>

      <!-- 分割线和其他选项 -->
      <div class="login-divider">
        <div class="divider-line"></div>
        <span class="divider-text">其他登录方式</span>
        <div class="divider-line"></div>
      </div>
      
      <div class="alternative-login">
        <router-link to="/login" class="alt-login-button face-login">
          <div class="alt-icon">👥</div>
          <div class="alt-text">
            <span class="alt-title">人脸识别</span>
            <span class="alt-desc">快速安全登录</span>
          </div>
          <div class="alt-arrow">→</div>
        </router-link>
      </div>

      <!-- 底部链接 -->
      <div class="footer-links">
        <div class="register-prompt">
          <span class="prompt-text">还没有账户？</span>
          <router-link to="/register" class="register-link">免费注册</router-link>
        </div>
        
        <div class="back-home">
          <router-link to="/" class="home-link">
            <i class="home-icon">🏠</i>
            <span>返回首页</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>
  </div>
</template>

<script>
  import passwordloginpage from "../webmanage/js/passwordloginpage/passwordloginpage";
  export default passwordloginpage;
</script>

<style scoped>
  @import '../webmanage/css/passwordloginpage/passwordloginpage.css'
</style>