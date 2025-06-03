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