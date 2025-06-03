// src/utils/api.js - 修复权限同步问题
import axios from 'axios';

// API基础配置
const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || '';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Token工具函数
function getToken() {
  const possibleKeys = [
    'token',
    'authToken', 
    'accessToken',
    'access_token',
    'jwt_token',
    'bearer_token',
    'auth_token'
  ];

  for (const key of possibleKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      console.log(`在localStorage.${key}中找到token`);
      return token;
    }
  }

  for (const key of possibleKeys) {
    const token = sessionStorage.getItem(key);
    if (token) {
      console.log(`在sessionStorage.${key}中找到token`);
      return token;
    }
  }

  return null;
}

function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
    console.log('Token已保存到localStorage');
  }
}

function removeToken() {
  const possibleKeys = [
    'token', 'authToken', 'accessToken', 'access_token', 
    'jwt_token', 'bearer_token', 'auth_token'
  ];
  
  possibleKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('所有Token已清除');
}

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('添加认证头:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.warn('警告: 没有找到访问token');
    }
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.data || config.params);
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log('API响应成功:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error('API响应错误:', error.config?.url, error.response?.status, error.response?.data);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('检测到401错误，尝试刷新token');

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          console.log('使用refresh token刷新访问token');
          const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken
          });

          if (response.data.access_token || (response.data.data && response.data.data.access_token)) {
            const newToken = response.data.access_token || response.data.data.access_token;
            setToken(newToken);
            console.log('Token刷新成功，重新发送原始请求');
            
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.error('刷新 token 失败:', refreshError);
          authUtils.clearAuth();
          if (window.location.pathname !== '/login') {
            console.log('跳转到登录页面');
          }
        }
      } else {
        console.warn('没有refresh token，清除数据');
        authUtils.clearAuth();
        if (window.location.pathname !== '/login') {
          console.log('跳转到登录页面');
        }
      }
    }

    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  // 登录 - 修复：登录后立即获取最新用户信息
  async login(username, password) {
    try {
      console.log('执行登录请求');
      const response = await apiClient.post('/api/login', { username, password });
      
      // 登录成功后保存token
      if (response.data && (response.data.success || response.data.token || response.data.access_token)) {
        const data = response.data.data || response.data;
        
        // 保存访问token
        const accessToken = data.access_token || data.token || response.data.token;
        if (accessToken) {
          setToken(accessToken);
          console.log('保存访问token');
        }
        
        // 保存刷新token
        const refreshToken = data.refresh_token;
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
          console.log('保存刷新token');
        }
        
        // 重要修复：登录成功后立即获取最新的用户信息（包含权限）
        try {
          console.log('登录成功，获取最新用户信息');
          await authUtils.refreshUserInfo();
        } catch (profileError) {
          console.warn('获取用户信息失败，使用登录返回的信息:', profileError);
          // 如果获取失败，使用登录返回的用户信息作为备选
          const userInfo = data.user_info || data.user || data.profile;
          if (userInfo) {
            authUtils.saveUserInfo(userInfo);
          }
        }
      }
      
      return response;
    } catch (error) {
      console.error('登录请求失败:', error);
      throw error;
    }
  },

  // 注册
  async register(userData) {
    try {
      const response = await apiClient.post('/api/auth/register', userData);
      return response;
    } catch (error) {
      console.error('注册请求失败:', error);
      throw error;
    }
  },

  // 刷新token
  async refresh(refreshToken) {
    try {
      const response = await apiClient.post('/api/auth/refresh', { refresh_token: refreshToken });
      return response;
    } catch (error) {
      console.error('刷新token失败:', error);
      throw error;
    }
  },

  // 登出
  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      authUtils.clearAuth();
    }
  },

  // 获取用户信息
  async getProfile() {
    try {
      const response = await apiClient.get('/api/profile');
      return response;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }
};

// 用户管理API
export const userAPI = {
  // 获取所有用户列表
  async getAllUsers() {
    try {
      console.log('请求获取所有用户');
      const response = await apiClient.get('/api/users');
      return response;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  },

  // 获取用户详情
  async getUserById(userId) {
    try {
      const response = await apiClient.get(`/api/users/${userId}`);
      return response;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw error;
    }
  },

  // 获取当前用户信息
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/api/profile');
      return response;
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      throw error;
    }
  },

  // 获取用户统计
  async getUserStats() {
    try {
      const response = await apiClient.get('/api/users/stats');
      return response;
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw error;
    }
  },

  // 更新用户信息
  async updateUser(userId, userData) {
    try {
      const response = await apiClient.put(`/api/users/${userId}`, userData);
      return response;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  },

  // 删除用户
  async deleteUser(userId) {
    try {
      const response = await apiClient.delete(`/api/users/${userId}`);
      return response;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  },

  // 修改密码
  async changePassword(userId, newPassword) {
    try {
      const response = await apiClient.post(`/api/users/${userId}/change-password`, { 
        new_password: newPassword 
      });
      return response;
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  },

  // 批量操作用户
  async batchUpdateUsers(userIds, updateData) {
    try {
      const response = await apiClient.post('/api/users/batch-update', {
        user_ids: userIds,
        update_data: updateData
      });
      return response;
    } catch (error) {
      console.error('批量更新用户失败:', error);
      throw error;
    }
  },

  // 搜索用户
  async searchUsers(query) {
    try {
      const response = await apiClient.get('/api/users/search', {
        params: { q: query }
      });
      return response;
    } catch (error) {
      console.error('搜索用户失败:', error);
      throw error;
    }
  }
};

// 权限和认证工具函数 - 重要修复
export const authUtils = {
  // 检查是否已登录
  isLoggedIn() {
    const token = getToken();
    const result = !!token;
    console.log('检查登录状态:', result);
    return result;
  },

  // 获取当前用户信息
  getCurrentUser() {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  },

  // 保存用户信息
  saveUserInfo(userInfo) {
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    console.log('用户信息已保存:', userInfo);
  },

  // 新增：刷新用户信息 - 从服务器获取最新信息
  async refreshUserInfo() {
    try {
      console.log('从服务器刷新用户信息');
      const response = await authAPI.getProfile();
      
      if (response.data && response.data.success && response.data.profile) {
        const userInfo = response.data.profile;
        this.saveUserInfo(userInfo);
        console.log('用户信息刷新成功，最新权限等级:', userInfo.access_level);
        return userInfo;
      } else {
        console.warn('刷新用户信息失败，响应格式不正确');
        return null;
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      throw error;
    }
  },

  // 新增：强制同步用户权限信息
  async syncUserPermissions() {
    if (!this.isLoggedIn()) {
      console.log('用户未登录，无法同步权限');
      return false;
    }

    try {
      const userInfo = await this.refreshUserInfo();
      if (userInfo) {
        console.log('权限同步成功，当前权限等级:', userInfo.access_level);
        // 触发权限更新事件，通知其他组件
        window.dispatchEvent(new CustomEvent('userPermissionUpdated', { 
          detail: userInfo 
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('同步用户权限失败:', error);
      return false;
    }
  },

  // 清除所有认证数据
  clearAuth() {
    console.log('清除所有认证数据');
    removeToken();
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  },

  // 获取访问token
  getAccessToken() {
    return getToken();
  },

  // 验证token有效性 - 修复：同时更新用户信息
  async validateToken() {
    try {
      const response = await authAPI.getProfile();
      if (response.data && (response.data.success === true || response.data.profile)) {
        // 验证成功时同时更新本地用户信息
        if (response.data.profile) {
          this.saveUserInfo(response.data.profile);
          console.log('Token验证成功，用户信息已更新');
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token验证失败:', error);
      return false;
    }
  },

  // 权限检查相关方法 - 修复：增加实时检查选项
  
  // 检查用户权限等级
  hasPermission(requiredLevel, forceRefresh = false) {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('权限检查: 用户未登录');
      return false;
    }
    
    // 如果需要强制刷新或者用户信息缺少权限字段，尝试同步
    if (forceRefresh || !user.access_level) {
      console.log('权限信息可能过期，建议调用 syncUserPermissions() 方法');
    }
    
    const userLevel = user.access_level || 1;
    const hasAccess = userLevel >= requiredLevel;
    console.log(`权限检查: 需要等级${requiredLevel}, 当前等级${userLevel}, 结果:${hasAccess}`);
    return hasAccess;
  },

  // 异步权限检查 - 确保使用最新权限信息
  async hasPermissionAsync(requiredLevel) {
    // 先同步最新权限信息
    await this.syncUserPermissions();
    return this.hasPermission(requiredLevel);
  },

  // 检查是否为管理员 (access_level >= 3)
  isAdmin() {
    return this.hasPermission(3);
  },

  // 异步检查是否为管理员
  async isAdminAsync() {
    return await this.hasPermissionAsync(3);
  },

  // 检查是否为超级管理员 (access_level >= 5)
  isSuperAdmin() {
    return this.hasPermission(5);
  },

  // 异步检查是否为超级管理员
  async isSuperAdminAsync() {
    return await this.hasPermissionAsync(5);
  },

  // 检查是否可以查看用户列表 - 修复权限判断逻辑
  canViewUsers() {
    const user = this.getCurrentUser();
    if (!user) return false;

    // 主要依据 access_level，其他条件作为备选
    const accessLevel = user.access_level || 1;
    
    // access_level >= 3 的用户可以查看用户列表
    if (accessLevel >= 3) {
      console.log('用户具有查看用户列表的权限，权限等级:', accessLevel);
      return true;
    }

    // 备选检查：组名或角色包含管理员关键词
    const groupCheck = user.group_name && user.group_name.includes('管理员');
    const roleCheck = user.role && (user.role.includes('admin') || user.role.includes('manager'));
    
    const result = groupCheck || roleCheck;
    console.log('权限检查结果:', { accessLevel, groupCheck, roleCheck, result });
    return result;
  },

  // 异步检查是否可以查看用户列表
  async canViewUsersAsync() {
    await this.syncUserPermissions();
    return this.canViewUsers();
  },

  // 检查是否可以编辑用户
  canEditUsers() {
    return this.hasPermission(3);
  },

  // 检查是否可以删除用户
  canDeleteUsers() {
    return this.hasPermission(4);
  },

  // 检查是否可以管理用户权限
  canManagePermissions() {
    return this.hasPermission(5);
  },

  // 检查是否可以执行打卡操作
  canClock() {
    return this.isLoggedIn();
  },

  // 检查是否可以查看打卡记录
  canViewRecords() {
    return this.isLoggedIn();
  },

  // 检查是否可以查看所有用户的打卡记录
  canViewAllRecords() {
    return this.hasPermission(3);
  },

  // 获取用户角色文本 - 修复显示逻辑
  getUserRoleText() {
    const user = this.getCurrentUser();
    if (!user) return '未知';

    // 优先使用group_name
    if (user.group_name) {
      return user.group_name;
    }
    
    // 根据access_level确定角色
    const level = user.access_level || 1;
    if (level >= 5) return '超级管理员';
    if (level >= 4) return '高级管理员';
    if (level >= 3) return '管理员';
    if (level >= 2) return '高级用户';
    return '普通用户';
  },

  // 获取角色徽章样式类
  getRoleBadgeClass() {
    const user = this.getCurrentUser();
    if (!user) return 'normal';

    const level = user.access_level || 1;
    if (level >= 5) return 'super-admin';
    if (level >= 4) return 'senior-admin';
    if (level >= 3) return 'admin';
    if (level >= 2) return 'advanced';
    return 'normal';
  },

  // 检查是否可以访问指定路由
  canAccessRoute(routeName) {
    const routePermissions = {
      'users': () => this.canViewUsers(),
      'admin': () => this.isAdmin(),
      'super-admin': () => this.isSuperAdmin(),
      'clock': () => this.canClock(),
      'records': () => this.canViewRecords(),
      'profile': () => this.isLoggedIn(),
      'settings': () => this.isAdmin()
    };

    const permissionCheck = routePermissions[routeName];
    return permissionCheck ? permissionCheck() : true;
  },

  // 异步检查路由访问权限
  async canAccessRouteAsync(routeName) {
    const routePermissions = {
      'users': () => this.canViewUsersAsync(),
      'admin': () => this.isAdminAsync(),
      'super-admin': () => this.isSuperAdminAsync(),
      'clock': () => Promise.resolve(this.canClock()),
      'records': () => Promise.resolve(this.canViewRecords()),
      'profile': () => Promise.resolve(this.isLoggedIn()),
      'settings': () => this.isAdminAsync()
    };

    const permissionCheck = routePermissions[routeName];
    return permissionCheck ? await permissionCheck() : true;
  },

  // 获取用户可用的菜单项 - 支持异步权限检查
  async getAvailableMenusAsync() {
    if (!this.isLoggedIn()) {
      return ['login', 'register'];
    }

    // 先同步权限信息
    await this.syncUserPermissions();

    const menus = ['clock', 'records', 'profile'];
    
    if (this.canViewUsers()) {
      menus.push('users');
    }
    
    if (this.isAdmin()) {
      menus.push('settings');
    }

    return menus;
  },

  // 获取用户可用的菜单项 - 同步版本
  getAvailableMenus() {
    if (!this.isLoggedIn()) {
      return ['login', 'register'];
    }

    const menus = ['clock', 'records', 'profile'];
    
    if (this.canViewUsers()) {
      menus.push('users');
    }
    
    if (this.isAdmin()) {
      menus.push('settings');
    }

    return menus;
  },

  // 新增：调试用户权限信息
  debugUserPermissions() {
    const user = this.getCurrentUser();
    console.log('=== 用户权限调试信息 ===');
    console.log('完整用户信息:', user);
    if (user) {
      console.log('用户ID:', user.user_id);
      console.log('用户名:', user.username);
      console.log('组名:', user.group_name);
      console.log('权限等级:', user.access_level);
      console.log('角色:', user.role);
      console.log('状态:', user.status);
      console.log('是否管理员:', this.isAdmin());
      console.log('是否超级管理员:', this.isSuperAdmin());
      console.log('可查看用户:', this.canViewUsers());
    }
    console.log('========================');
  }
};

// 权限装饰器工具
export const permissionDecorator = {
  // 需要登录的方法装饰器
  requireAuth(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function(...args) {
      if (!authUtils.isLoggedIn()) {
        console.warn('需要登录才能执行此操作');
        throw new Error('请先登录');
      }
      return method.apply(this, args);
    };
  },

  // 需要管理员权限的方法装饰器
  requireAdmin(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function(...args) {
      if (!authUtils.isAdmin()) {
        console.warn('需要管理员权限才能执行此操作');
        throw new Error('权限不足');
      }
      return method.apply(this, args);
    };
  },

  // 需要指定权限等级的方法装饰器
  requirePermission(level) {
    return function(target, propertyName, descriptor) {
      const method = descriptor.value;
      descriptor.value = function(...args) {
        if (!authUtils.hasPermission(level)) {
          console.warn(`需要权限等级${level}才能执行此操作`);
          throw new Error('权限不足');
        }
        return method.apply(this, args);
      };
    };
  }
};

// 导出API客户端实例
export { apiClient };
export default apiClient;