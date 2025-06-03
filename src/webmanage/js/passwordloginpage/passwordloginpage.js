import { authAPI, authUtils } from '@/utils/api';

export default {
  name: 'PasswordLoginPage',
  data() {
    return {
      loginForm: {
        username: '',
        password: '',
        rememberMe: false
      },
      loading: false,
      showPassword: false,
      errorMessage: '',
      successMessage: '',
      loginAttempts: 0,
      maxAttempts: 5
    };
  },
  computed: {
    isFormValid() {
      return this.loginForm.username.trim() && this.loginForm.password.trim();
    }
  },
  mounted() {
    // 检查是否已经登录
    if (authUtils.isLoggedIn()) {
      this.$router.push('/');
      return;
    }

    // 从localStorage恢复用户名（如果选择了记住我）
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      this.loginForm.username = savedUsername;
      this.loginForm.rememberMe = true;
    }

    // 聚焦到第一个输入框
    this.$nextTick(() => {
      const usernameInput = document.getElementById('username');
      if (usernameInput) {
        usernameInput.focus();
      }
    });
  },
  methods: {
    async handleLogin() {
      if (!this.isFormValid) {
        this.showError('请填写完整的登录信息');
        return;
      }

      // 检查登录尝试次数
      if (this.loginAttempts >= this.maxAttempts) {
        this.showError('登录尝试次数过多，请稍后再试');
        return;
      }

      this.loading = true;
      this.clearMessages();

      try {
        console.log('开始密码登录...');
        
        const response = await authAPI.login(
          this.loginForm.username.trim(),
          this.loginForm.password
        );

        console.log('登录响应:', response);

        if (response.data && (response.data.success !== false)) {
          // 登录成功
          this.successMessage = '登录成功！正在跳转...';
          
          // 处理记住我功能
          if (this.loginForm.rememberMe) {
            localStorage.setItem('remembered_username', this.loginForm.username.trim());
          } else {
            localStorage.removeItem('remembered_username');
          }

          // 重置登录尝试次数
          this.loginAttempts = 0;

          // 延迟跳转，让用户看到成功消息
          setTimeout(() => {
            // 检查是否有跳转目标
            const redirectTo = this.$route.query.redirect || '/';
            this.$router.push(redirectTo);
          }, 1000);

        } else {
          // 登录失败
          this.loginAttempts++;
          const remainingAttempts = this.maxAttempts - this.loginAttempts;
          this.showError(
            response.data?.message || 
            `登录失败，还剩 ${remainingAttempts} 次尝试机会`
          );
        }

      } catch (error) {
        console.error('登录错误:', error);
        this.loginAttempts++;

        let errorMsg = '登录失败';
        
        if (error.response) {
          // 服务器返回错误
          if (error.response.status === 401) {
            errorMsg = '用户名或密码错误';
          } else if (error.response.status === 403) {
            errorMsg = '账户已被禁用，请联系管理员';
          } else if (error.response.status >= 500) {
            errorMsg = '服务器错误，请稍后重试';
          } else {
            errorMsg = error.response.data?.message || '登录失败，请检查网络连接';
          }
        } else if (error.request) {
          // 网络错误
          errorMsg = '网络连接失败，请检查网络设置';
        } else {
          // 其他错误
          errorMsg = error.message || '未知错误';
        }

        const remainingAttempts = this.maxAttempts - this.loginAttempts;
        if (remainingAttempts > 0) {
          errorMsg += `，还剩 ${remainingAttempts} 次尝试机会`;
        }

        this.showError(errorMsg);

      } finally {
        this.loading = false;
      }
    },

    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    },

    showError(message) {
      this.errorMessage = message;
      this.successMessage = '';
      
      // 3秒后自动清除错误信息
      setTimeout(() => {
        if (this.errorMessage === message) {
          this.errorMessage = '';
        }
      }, 5000);
    },

    showSuccess(message) {
      this.successMessage = message;
      this.errorMessage = '';
    },

    clearMessages() {
      this.errorMessage = '';
      this.successMessage = '';
    },

    resetForm() {
      this.loginForm.password = '';
      this.clearMessages();
      this.loginAttempts = 0;
    }
  }
};
