import axios from 'axios';

export default {
  name: 'LoginPage',
  data() {
    return {
      // 状态控制
      isInitializing: false,
      showCamera: false,
      isRecognizing: false,
      
      // 摄像头相关
      stream: null,
      
      // 识别相关
      statusMessage: '准备开始人脸识别',
      statusClass: 'waiting',
      recognitionResult: null,
      progressPercent: 0,
      
      // 识别定时器
      recognitionInterval: null,
      timeoutTimer: null,
      recognitionTimeout: 15000, // 15秒超时
      recognitionStartTime: null
    };
  },
  methods: {
// 修复后的 startLogin 方法
async startLogin() {
  this.isInitializing = true;
  
  try {
    // 首先显示摄像头界面，确保DOM元素存在
    this.showCamera = true;
    
    // 等待Vue完成DOM更新
    await this.$nextTick();
    
    // 再次确认video元素是否存在
    if (!this.$refs.video) {
      console.error('视频元素仍然未找到，等待更长时间...');
      // 额外等待一点时间确保DOM完全渲染
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!this.$refs.video) {
        throw new Error('视频元素初始化失败，请刷新页面重试');
      }
    }
    
    console.log('视频元素已找到，开始初始化摄像头...');
    await this.initCamera();
    
    // 稍微延迟开始识别，确保摄像头完全就绪
    setTimeout(() => {
      this.startFaceRecognition();
    }, 1000);
    
  } catch (error) {
    console.error('初始化登录失败:', error);
    
    // 重置状态
    this.showCamera = false;
    
    // 显示具体的错误信息
    const errorMessage = error.message || '摄像头初始化失败';
    alert(`摄像头初始化失败：${errorMessage}\n\n请尝试以下解决方案：\n1. 刷新页面重试\n2. 检查浏览器权限设置\n3. 确保没有其他程序使用摄像头\n4. 尝试使用Chrome或Firefox浏览器`);
    
  } finally {
    this.isInitializing = false;
  }
},

// 改进的 initCamera 方法，增强视频元素检查
async initCamera() {
  console.log('开始初始化摄像头...');
  
  try {
    // 1. 检查浏览器支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('您的浏览器不支持摄像头访问功能，请使用Chrome、Firefox或Edge浏览器');
    }

    // 2. 检查是否为安全上下文
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      console.warn('非安全上下文，可能影响摄像头访问');
    }

    // 3. 首先检查权限状态（如果浏览器支持）
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        console.log('摄像头权限状态:', permission.state);
        
        if (permission.state === 'denied') {
          throw new Error('摄像头权限被拒绝，请在浏览器设置中允许摄像头访问，然后刷新页面重试');
        }
      } catch (permError) {
        console.log('无法查询权限状态，继续尝试访问摄像头');
      }
    }

    // 4. 检查可用的媒体设备
    let devices = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('发现摄像头设备:', videoDevices.length);
      videoDevices.forEach((device, index) => {
        console.log(`设备 ${index + 1}: ${device.label || '未知设备'} (${device.deviceId})`);
      });
      
      if (videoDevices.length === 0) {
        throw new Error('未检测到摄像头设备，请确保摄像头已正确连接并被系统识别');
      }
    } catch (enumError) {
      console.warn('无法枚举设备:', enumError);
      // 继续尝试，可能是权限问题
    }

    // 5. 获取摄像头流 - 使用简化的配置
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    };

    console.log('尝试获取摄像头流，配置:', JSON.stringify(constraints, null, 2));
    
    // 设置合理的超时时间
    const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('获取摄像头流超时，请检查设备连接')), 8000);
    });
    
    const stream = await Promise.race([streamPromise, timeoutPromise]);
    
    console.log('摄像头流获取成功:', {
      active: stream.active,
      id: stream.id,
      tracks: stream.getTracks().length
    });

    // 6. 检查流的有效性
    if (!stream || !stream.active) {
      throw new Error('获取的摄像头流无效');
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('摄像头流中没有视频轨道');
    }

    const track = videoTracks[0];
    console.log('视频轨道信息:', {
      enabled: track.enabled,
      kind: track.kind,
      label: track.label,
      readyState: track.readyState
    });

    // 7. 保存流引用
    this.stream = stream;

    // 8. 检查并设置视频元素 - 增强检查
    console.log('检查视频元素...');
    let video = this.$refs.video;
    
    // 如果视频元素不存在，等待一下再检查
    if (!video) {
      console.log('视频元素暂时未找到，等待DOM更新...');
      await this.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));
      video = this.$refs.video;
    }
    
    if (!video) {
      console.error('视频元素检查失败，当前refs:', Object.keys(this.$refs));
      throw new Error('视频元素未找到，请确保DOM已正确渲染');
    }

    console.log('视频元素已找到，设置视频流...');
    video.srcObject = stream;

    // 9. 等待视频准备就绪
    try {
      await new Promise((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reject(new Error('视频加载超时'));
          }
        }, 5000);

        const cleanup = () => {
          video.onloadedmetadata = null;
          video.onloadeddata = null;
          video.onerror = null;
        };

        const handleVideoReady = () => {
          if (!resolved && video.readyState >= 2) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            
            console.log('视频准备就绪:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
              currentTime: video.currentTime
            });
            
            resolve();
          }
        };
        
        video.onloadedmetadata = handleVideoReady;
        video.onloadeddata = handleVideoReady;
        
        video.onerror = (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            console.error('视频加载错误:', error);
            reject(new Error('视频加载失败'));
          }
        };
        
        // 如果视频已经准备好了，直接resolve
        if (video.readyState >= 2) {
          handleVideoReady();
        } else {
          // 手动触发播放
          video.play().catch(playError => {
            console.warn('自动播放失败，但不影响功能:', playError);
          });
        }
      });
    } catch (videoError) {
      console.error('视频准备失败:', videoError);
      // 即使视频元数据加载失败，如果流是活跃的，也可以继续
      if (stream.active && videoTracks[0].readyState === 'live') {
        console.log('虽然视频元数据加载失败，但流是活跃的，继续使用');
      } else {
        throw videoError;
      }
    }

    // 10. 最终验证
    if (!this.stream || !this.stream.active) {
      throw new Error('摄像头流不活跃');
    }

    const finalTracks = this.stream.getVideoTracks();
    if (finalTracks.length === 0 || finalTracks[0].readyState !== 'live') {
      throw new Error('摄像头视频轨道状态异常');
    }

    // 11. 成功完成
    this.statusMessage = '摄像头已就绪，准备开始识别';
    this.statusClass = 'ready';
    
    console.log('摄像头初始化完全成功!');
    
  } catch (error) {
    console.error('摄像头初始化失败:', error);
    
    // 清理资源
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // 根据错误类型提供具体的解决建议
    let errorMessage = error.message || '摄像头初始化失败';
    let suggestions = [];
    
    if (error.name === 'NotAllowedError' || error.message.includes('权限')) {
      suggestions = [
        '点击浏览器地址栏左侧的摄像头图标，选择"允许"',
        '检查浏览器设置中的摄像头权限',
        '刷新页面后重试'
      ];
    } else if (error.name === 'NotFoundError' || error.message.includes('设备')) {
      suggestions = [
        '检查摄像头是否正确连接',
        '确保摄像头驱动程序已安装',
        '尝试重新连接摄像头'
      ];
    } else if (error.name === 'NotReadableError' || error.message.includes('占用')) {
      suggestions = [
        '关闭其他使用摄像头的程序',
        '关闭其他浏览器标签页中的摄像头应用',
        '重启浏览器后重试'
      ];
    } else if (error.message.includes('超时')) {
      suggestions = [
        '检查摄像头连接是否稳定',
        '尝试重新连接摄像头',
        '重启浏览器后重试'
      ];
    } else if (error.message.includes('视频元素')) {
      suggestions = [
        '刷新页面重试',
        '确保没有其他程序干扰浏览器',
        '尝试重启浏览器'
      ];
    } else {
      suggestions = [
        '尝试刷新页面重试',
        '检查浏览器兼容性',
        '尝试使用Chrome或Firefox浏览器',
        '检查摄像头硬件连接'
      ];
    }
    
    const fullMessage = `${errorMessage}\n\n建议解决方案：\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    throw new Error(fullMessage);
  }
},


    startFaceRecognition() {
      this.isRecognizing = true;
      this.recognitionResult = null;
      this.statusMessage = '正在进行人脸识别，请保持面部清晰可见';
      this.statusClass = 'recognizing';
      this.recognitionStartTime = Date.now();
      this.progressPercent = 0;
      
      // 开始进度条动画
      this.updateProgress();
      
      // 每1秒尝试一次识别
      this.recognitionInterval = setInterval(() => {
        this.performRecognition();
      }, 1000);
      
      // 设置超时
      this.timeoutTimer = setTimeout(() => {
        this.handleRecognitionTimeout();
      }, this.recognitionTimeout);
    },

    updateProgress() {
      if (!this.isRecognizing) return;
      
      const elapsed = Date.now() - this.recognitionStartTime;
      this.progressPercent = Math.min((elapsed / this.recognitionTimeout) * 100, 100);
      
      if (this.progressPercent < 100) {
        setTimeout(() => this.updateProgress(), 100);
      }
    },

    async performRecognition() {
      if (!this.isRecognizing) return;
      
      const video = this.$refs.video;
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext('2d');
      
      // 将视频帧绘制到canvas上
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 获取图像数据
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      try {
        // 调用后端人脸识别API
        const response = await axios.post('/api/recognize_face', {
          image: imageData
        });

        if (response.data.success) {
          this.handleRecognitionResult(response.data);
        } else {
          console.error('识别API调用失败:', response.data.message);
        }
      } catch (error) {
        console.error('人脸识别请求错误:', error);
        // 不中断识别流程，继续尝试
      }
    },

async handleRecognitionResult(result) {
  this.stopRecognition();
  this.recognitionResult = result;
  
  if (result.recognized) {
    this.statusMessage = `识别成功！欢迎 ${result.username}`;
    this.statusClass = 'success';
    this.progressPercent = 100;
    
    try {
      console.log('开始创建打卡记录...');
      const clockResult = await this.recordClockIn(
        result.user_id, 
        result.confidence, 
        result.face_id
      );
      
      console.log('打卡记录创建完成:', clockResult);
      
      // 设置登录状态信息
      this.setLoginStatus(result);
      
      // 通知其他组件登录状态已改变
      this.notifyLoginStatusChange();
      
      // 修复：添加路由导航的重复检查
      const targetPath = `/success/${result.username}`;
      if (this.$route.path !== targetPath) {
        setTimeout(() => {
          this.$router.push({
            path: targetPath,
            params: { 
              username: result.username, 
              user_id: result.user_id,
              record_id: clockResult?.record_id,
              clock_type: 'check_in',
              clock_type_text: '上班打卡'
            }
          }).catch(err => {
            // 忽略导航重复错误
            if (!err.message.includes('redundant navigation') && 
                !err.message.includes('重复导航')) {
              console.error('导航错误:', err);
            }
          });
        }, 1000); // 缩短等待时间
      }
    } catch (error) {
      console.error('创建打卡记录失败:', error);
      this.statusMessage = `识别成功！但打卡记录可能未保存`;
      
      // 即使打卡失败，也要设置登录状态
      this.setLoginStatus(result);
      this.notifyLoginStatusChange();
      
      const targetPath = `/success/${result.username}`;
      if (this.$route.path !== targetPath) {
        setTimeout(() => {
          this.$router.push({
            path: targetPath,
            params: { 
              username: result.username, 
              user_id: result.user_id,
              clock_error: '打卡记录保存失败'
            }
          }).catch(err => {
            if (!err.message.includes('redundant navigation')) {
              console.error('导航错误:', err);
            }
          });
        }, 1000);
      }
    }
  } else {
    this.statusMessage = '未找到匹配的用户';
    this.statusClass = 'failure';
  }
},

setLoginStatus(result) {
  try {
    // 设置登录时间
    localStorage.setItem('loginTime', new Date().toISOString());
    
    // 设置登录方式
    localStorage.setItem('loginMethod', '人脸识别');
    
    // 设置最后活动时间
    localStorage.setItem('lastActivity', new Date().toISOString());
    
    // 可选：设置用户基本信息（避免敏感信息）
    const userInfo = {
      username: result.username,
      user_id: result.user_id,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    console.log('登录状态信息已保存');
  } catch (error) {
    console.error('保存登录状态信息失败:', error);
  }
},

notifyLoginStatusChange() {
  try {
    // 发送自定义事件通知其他组件
    window.dispatchEvent(new CustomEvent('loginStatusChanged', {
      detail: {
        type: 'login',
        method: 'face_recognition',
        timestamp: new Date().toISOString()
      }
    }));
    
    // 如果使用了 Vuex 或其他状态管理
    if (this.$store) {
      this.$store.dispatch('updateLoginStatus', true);
    }
    
    console.log('登录状态变化通知已发送');
  } catch (error) {
    console.error('发送登录状态变化通知失败:', error);
  }
},

async recordClockIn(userId, confidence, faceId) {
  try {
    console.log('准备创建打卡记录:', {
      user_id: userId,
      confidence_score: confidence,
      face_id: faceId
    });

    // 直接使用人脸识别结果进行认证
    const authResponse = await axios.post('/api/face-login', {
      user_id: userId,
      login_type: 'face_recognition'
    });

    if (!authResponse.data.success || !authResponse.data.token) {
      throw new Error('人脸认证失败');
    }

    const token = authResponse.data.token;
    
    // 确保token存储到正确的位置
    localStorage.setItem('authToken', token);
    
    // 也可以存储到其他可能需要的位置
    localStorage.setItem('token', token);
    
    console.log('认证token已保存');

    // 使用新获取的token创建打卡记录
    const response = await axios.post('/api/clock', {
      user_id: userId,
      clock_type: 'check_in',
      confidence_score: confidence,
      face_id: faceId,
      point_id: 1, // 默认打卡点
      notes: '人脸识别打卡'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('打卡记录创建成功:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('打卡记录创建失败:', error);
    throw error;
  }
},

getAuthToken() {
  // 检查多个可能的token存储位置
  const possibleKeys = [
    'authToken',
    'token', 
    'accessToken',
    'access_token',
    'jwt_token'
  ];
  
  for (const key of possibleKeys) {
    const token = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (token) {
      console.log(`找到token (键: ${key})`);
      return token;
    }
  }
  
  console.log('未找到任何token');
  return null;
},

// 新增：使用人脸识别结果进行认证
async authenticateWithFaceResult(userId) {
  try {
    const response = await axios.post('/api/face-login', {
      user_id: userId
    });
    
    if (response.data.success && response.data.token) {
      // 存储token到localStorage和Vuex
      localStorage.setItem('authToken', response.data.token);
      this.$store.commit('setAuthToken', response.data.token);
      return response.data.token;
    }
    throw new Error(response.data.message || '人脸认证失败');
  } catch (error) {
    console.error('人脸认证失败:', error);
    throw error;
  }
},

    handleRecognitionTimeout() {
      this.stopRecognition();
      this.statusMessage = '识别超时，请重试';
      this.statusClass = 'timeout';
      this.recognitionResult = {
        recognized: false,
        message: '识别超时，请重新尝试'
      };
    },

    stopRecognition() {
      this.isRecognizing = false;
      
      if (this.recognitionInterval) {
        clearInterval(this.recognitionInterval);
        this.recognitionInterval = null;
      }
      
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
    },

    retryRecognition() {
      this.recognitionResult = null;
      this.startFaceRecognition();
    },

    cancelLogin() {
  this.stopCamera();
  this.resetState();
  this.$router.push('/').catch(err => {
    if (!err.message.includes('redundant navigation')) {
      console.error('导航错误:', err);
    }
  });
},

    stopCamera() {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      this.stopRecognition();
    },

    resetState() {
      this.showCamera = false;
      this.isRecognizing = false;
      this.recognitionResult = null;
      this.statusMessage = '准备开始人脸识别';
      this.statusClass = 'waiting';
      this.progressPercent = 0;
    }
  },

  beforeDestroy() {
    this.stopCamera();
  }
};