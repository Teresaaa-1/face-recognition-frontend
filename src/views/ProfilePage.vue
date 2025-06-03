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
  import profilepage from "../webmanage/js/profilepage/profilepage";
  export default profilepage;
</script>

<style scoped>
  @import '../webmanage/css/profilepage/profilepage.css'
</style>