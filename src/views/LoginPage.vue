<template>
  <div class="login-container">
    <h2>人脸登录</h2>
    
    <!-- 登录界面 -->
    <div v-if="!showCamera" class="login-section">
      <p class="welcome-text">欢迎使用人脸识别登录系统</p>
      <button @click="startLogin" class="start-login-btn" :disabled="isInitializing">
        {{ isInitializing ? '初始化中...' : '开始人脸识别' }}
      </button>
      <div class="back-link-container">
        <router-link to="/" class="back-link">返回首页</router-link>
      </div>
    </div>

    <!-- 人脸识别界面 -->
    <div v-if="showCamera" class="camera-container">
      <div class="camera-section">
        <video ref="video" width="640" height="480" autoplay></video>
        <canvas ref="canvas" width="640" height="480" style="display: none;"></canvas>
      </div>
      
      <div class="status-section">
        <div class="status-indicator" :class="statusClass">
          <div class="status-dot"></div>
          <span>{{ statusMessage }}</span>
        </div>
        
        <div v-if="recognitionResult" class="result-section">
          <div v-if="recognitionResult.recognized" class="success-result">
            <h3>✅ 登录成功！</h3>
            <p>欢迎回来，{{ recognitionResult.username }}！</p>
            <p>置信度: {{ recognitionResult.confidence }}%</p>
          </div>
          <div v-else class="failure-result">
            <h3>❌ 识别失败</h3>
            <p>{{ recognitionResult.message }}</p>
          </div>
        </div>
        
        <div class="progress-bar" v-if="isRecognizing">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>

      <div class="control-buttons">
        <button @click="retryRecognition" v-if="!isRecognizing" class="retry-btn">
          重新识别
        </button>
        <button @click="cancelLogin" class="cancel-btn">
          取消登录
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  import loginpage from "../webmanage/js/loginpage/loginpage";
  export default loginpage;
</script>

<style scoped>
  @import '../webmanage/css/loginpage/loginpage.css'
</style>