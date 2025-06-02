<template>
  <div class="profile-container">
    <h2>个人设置</h2>
    
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载用户信息...</p>
    </div>

    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="fetchUserProfile" class="retry-btn">重试</button>
    </div>

    <div v-if="!loading && !error" class="profile-form">
      <form @submit.prevent="updateProfile">
        <div class="form-group">
          <label for="fullName">姓名</label>
          <input 
            type="text" 
            id="fullName" 
            v-model="profileForm.full_name" 
            required
          >
        </div>

        <div class="form-group">
          <label for="email">邮箱</label>
          <input 
            type="email" 
            id="email" 
            v-model="profileForm.email"
          >
        </div>

        <div class="form-group">
          <label for="phone">手机号</label>
          <input 
            type="tel" 
            id="phone" 
            v-model="profileForm.phone"
            placeholder="请输入11位手机号"
          >
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="updating" class="save-btn">
            {{ updating ? '保存中...' : '保存更改' }}
          </button>
          <button 
            type="button" 
            @click="goBack" 
            class="cancel-btn"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ProfilePage',
  data() {
    return {
      loading: true,
      error: null,
      updating: false,
      userId: null,
      profileForm: {
        full_name: '',
        email: '',
        phone: ''
      }
    }
  },
  async created() {
    await this.fetchUserProfile();
  },
  methods: {
    async fetchUserProfile() {
  this.loading = true;
  this.error = null;
  
  try {
    const token = this.findToken();
    if (!token) {
      this.error = '未登录，请先登录';
      return;
    }

    const response = await axios.get('/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.profile) {
      // 保存用户ID
      this.userId = response.data.profile.user_id || response.data.user_id;
      
      this.profileForm = {
        full_name: response.data.profile.full_name || '',
        email: response.data.profile.email || '',
        phone: response.data.profile.phone || ''
      };
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
    this.error = `获取用户信息失败: ${error.response?.data?.message || error.message}`;
  } finally {
    this.loading = false;
  }
},
    
   async updateProfile() {
  this.updating = true;
  this.error = null;
  
  try {
    const token = this.findToken();
    if (!token) {
      this.error = '未登录，请先登录';
      return;
    }

    if (!this.userId) {
      this.error = '无法获取用户ID，请重新登录';
      return;
    }

    const response = await axios.put(`/api/users/${this.userId}`, this.profileForm, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 修复成功判断逻辑
    // 方案1: 检查HTTP状态码
    if (response.status === 200 || response.status === 201) {
      if (this.$toast) {
        this.$toast.success('个人信息更新成功');
      } else {
        alert('个人信息更新成功');
      }
      this.$router.push('/');
      return;
    }

    // 方案2: 检查多种可能的成功标识
    if (response.data.success === true || 
        response.data.success === 'true' || 
        (response.data.message && response.data.message.includes('成功'))) {
      if (this.$toast) {
        this.$toast.success('个人信息更新成功');
      } else {
        alert('个人信息更新成功');
      }
      this.$router.push('/');
      return;
    }

    // 如果都不匹配，则抛出错误
    throw new Error(response.data.message || response.data.error || '更新失败');

  } catch (error) {
    console.error('更新个人信息失败:', error);
    
    // 检查是否是网络错误或HTTP错误
    if (error.response) {
      // HTTP错误状态码
      if (error.response.status >= 400) {
        this.error = `更新失败: ${error.response.data?.message || error.response.statusText}`;
      }
    } else if (error.request) {
      // 网络错误
      this.error = '网络错误，请检查网络连接';
    } else {
      // 其他错误
      this.error = `更新失败: ${error.message}`;
    }
  } finally {
    this.updating = false;
  }
},
    
    findToken() {
      // 复用HomePage中的方法
      const possibleKeys = [
        'token', 'authToken', 'accessToken', 'access_token', 
        'jwt_token', 'bearer_token', 'auth_token'
      ];
      
      for (const key of possibleKeys) {
        const token = localStorage.getItem(key);
        if (token) return token;
      }
      
      for (const key of possibleKeys) {
        const token = sessionStorage.getItem(key);
        if (token) return token;
      }
      
      return null;
    },
    
    goBack() {
      this.$router.go(-1);
    }
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h2 {
  color: #333;
  text-align: center;
  margin-bottom: 30px;
  font-weight: 300;
}

.profile-form {
  background: #fff;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #667eea;
  outline: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
}

.save-btn:disabled {
  background: #ccc;
  transform: none;
  box-shadow: none;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #ddd;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background: #e9ecef;
}

.loading {
  text-align: center;
  margin: 60px 0;
}

.loading-spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  margin: 40px 0;
  padding: 20px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background-color: #c82333;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 20px;
  }
  
  .profile-form {
    padding: 20px;
  }
}
</style>