<template>
  <div class="register-container">
    <h2>用户注册</h2>
    
    <!-- 注册表单 -->
    <div v-if="!showCamera" class="form-container">
      <form @submit.prevent="register">
        <div class="form-group">
          <input v-model="username" type="text" placeholder="用户名" required />
        </div>
        <div class="form-group">
          <input v-model="full_name" type="text" placeholder="全名" required />
        </div>
        <div class="form-group">
          <input v-model="email" type="email" placeholder="邮箱" />
        </div>
        <div class="form-group">
          <input v-model="phone" type="text" placeholder="电话" />
        </div>
        <div class="form-group">
          <input v-model="password" type="password" placeholder="密码" required />
        </div>
        <button type="submit" :disabled="isRegistering">
          {{ isRegistering ? '注册中...' : '注册' }}
        </button>
      </form>
    </div>

    <!-- 人脸采集界面 -->
    <div v-if="showCamera" class="camera-container">
      <h3>人脸采集 - {{ username }}</h3>
      <div class="camera-section">
        <video ref="video" width="640" height="480" autoplay></video>
        <canvas ref="canvas" width="640" height="480" style="display: none;"></canvas>
      </div>
      
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <p>已采集: {{ capturedSamples }} / {{ totalSamples }} 个样本</p>
        <p class="status-message">{{ statusMessage }}</p>
      </div>

      <div class="control-buttons">
        <button @click="startFaceCapture" :disabled="isCapturing">
          {{ isCapturing ? '采集中...' : '开始采集' }}
        </button>
        <button @click="cancelRegistration">取消注册</button>
      </div>
    </div>
  </div>
</template>

<script>
    import registerpage from "../webmanage/js/registerpage/registerpage";
    export default registerpage;
</script>

<style scoped>
    @import '../webmanage/css/registerpage/registerpage.css'
</style>