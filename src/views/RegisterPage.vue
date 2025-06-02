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
import axios from 'axios';

export default {
  name: 'RegisterPage',
  data() {
    return {
      // 表单数据
      username: '',
      full_name: '',
      email: '',
      phone: '',
      password: '',
      
      // 状态控制
      isRegistering: false,
      showCamera: false,
      isCapturing: false,
      
      // 摄像头相关
      stream: null,
      
      // 人脸采集相关
      capturedSamples: 0,
      totalSamples: 5,
      statusMessage: '请面向摄像头，保持面部清晰可见',
      faceEncodings: [],
      
      // 采集定时器
      captureInterval: null,
      captureTimer: null
    };
  },
  computed: {
    progressPercent() {
      return (this.capturedSamples / this.totalSamples) * 100;
    }
  },
  methods: {
    async register() {
      this.isRegistering = true;
      
      try {
        // 使用 /api 前缀，通过代理转发到后端
        const response = await axios.post('/api/register', {
          username: this.username,
          full_name: this.full_name,
          email: this.email,
          phone: this.phone,
          password: this.password
        });
        
        console.log('注册响应:', response.data);
        
        // 注册成功，开启摄像头进行人脸采集
        this.showCamera = true;
        await this.initCamera();
        
      } catch (error) {
        console.error('注册错误:', error);
        let errorMessage = '注册失败';
        
        if (error.response) {
          errorMessage = error.response.data?.message || `注册失败 (${error.response.status})`;
        } else if (error.request) {
          errorMessage = '无法连接到服务器，请检查网络连接';
        } else {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
        this.isRegistering = false;
      }
    },

    async initCamera() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });
        
        this.$refs.video.srcObject = this.stream;
        this.statusMessage = '摄像头已就绪，点击"开始采集"按钮开始采集人脸样本';
        
      } catch (error) {
        console.error('无法访问摄像头:', error);
        this.statusMessage = '无法访问摄像头，请检查权限设置';
        alert('无法访问摄像头，请检查浏览器权限设置');
      }
    },

    startFaceCapture() {
      if (this.isCapturing) return;
      
      this.isCapturing = true;
      this.capturedSamples = 0;
      this.faceEncodings = [];
      this.statusMessage = '正在采集人脸样本，请保持面部稳定...';
      
      // 每1.5秒采集一个样本
      this.captureInterval = setInterval(() => {
        this.captureFaceSample();
      }, 1500);
    },

    async captureFaceSample() {
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      
      // 将视频帧绘制到canvas上
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 获取图像数据
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      try {
        // 调用后端人脸检测API
        const response = await axios.post('/api/detect_face', {
          image: imageData
        });

        if (response.data.success && response.data.face_detected) {
          this.capturedSamples++;
          this.statusMessage = `已采集第 ${this.capturedSamples} 个样本`;
          
          // 保存人脸编码
          this.faceEncodings.push({
            sample: this.capturedSamples,
            data: imageData,
            timestamp: Date.now()
          });
          
          if (this.capturedSamples >= this.totalSamples) {
            this.completeFaceCapture();
          }
        } else {
          this.statusMessage = '未检测到清晰人脸，请调整位置和角度';
        }
      } catch (error) {
        console.error('人脸检测错误:', error);
        this.statusMessage = '人脸检测失败，请重试';
      }
    },

    async completeFaceCapture() {
      clearInterval(this.captureInterval);
      this.isCapturing = false;
      this.statusMessage = '正在保存人脸数据...';
      
      try {
        // 发送人脸数据到后端保存
        await this.saveFaceData();
        
        this.statusMessage = '人脸采集完成！';
        setTimeout(() => {
          alert('注册成功！人脸数据已保存');
          this.$router.push('/');
        }, 1500);
        
      } catch (error) {
        this.statusMessage = '保存人脸数据失败';
        alert('保存人脸数据失败: ' + error.message);
      }
    },

    async saveFaceData() {
      try {
        const response = await axios.post('/api/save_face_data', {
          username: this.username,
          samples: this.faceEncodings
        });
        
        console.log('保存人脸数据响应:', response.data);
        return response.data;
      } catch (error) {
        console.error('保存人脸数据错误:', error);
        throw error;
      }
    },

    cancelRegistration() {
      if (confirm('确定要取消注册吗？已填写的信息将丢失。')) {
        this.stopCamera();
        this.resetForm();
        this.$router.push('/');
      }
    },

    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = null;
      }
    },

    resetForm() {
      this.username = '';
      this.full_name = '';
      this.email = '';
      this.phone = '';
      this.password = '';
      this.isRegistering = false;
      this.showCamera = false;
      this.isCapturing = false;
      this.capturedSamples = 0;
      this.faceEncodings = [];
    }
  },

  beforeDestroy() {
    this.stopCamera();
  }
};
</script>

<style scoped>
.register-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.form-container {
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 15px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
}

button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin: 5px 0;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.camera-container {
  text-align: center;
}

.camera-section {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

video {
  border: 2px solid #007bff;
  border-radius: 8px;
  background-color: #000;
}

.progress-section {
  margin: 20px 0;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.3s ease;
}

.status-message {
  color: #007bff;
  font-weight: bold;
  margin: 10px 0;
}

.control-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
}

.control-buttons button {
  flex: 1;
}

h2, h3 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .register-container {
    padding: 10px;
  }
  
  video {
    width: 100%;
    max-width: 480px;
    height: auto;
  }
  
  .control-buttons {
    flex-direction: column;
  }
}
</style>