// 修复后的用户管理页面JavaScript逻辑
export default {
  name: 'UsersPage',
  data() {
    return {
      users: [],
      filteredUsers: [],
      userGroups: [],
      groupsMap: {},
      loading: false,
      error: null,
      isAuthError: false,
      hasPermission: false,
      hasAdminPermission: false,
      currentUserId: null,

      // 数据加载状态
      groupsLoaded: false,
      usersLoaded: false,

      // 搜索和筛选
      searchQuery: '',
      statusFilter: '',
      groupFilter: '',

      // 分页
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,

      // 显示模式：'list' 或 'group'
      viewMode: 'list',

      // 组展开状态
      expandedGroups: {},

      // 添加用户
      showAddUserModal: false,
      newUser: {
        username: '',
        full_name: '',
        email: '',
        phone: '',
        password: '',
        group_id: 2
      },
      addingUser: false,

      // 编辑用户
      showEditUserModal: false,
      editingUser: {},
      updatingUser: false,

      // 重置密码
      showResetPasswordModal: false,
      resetPasswordUser: null,
      newPassword: '',
      resettingPassword: false,
    }
  },

  computed: {
    paginatedUsers() {
      if (this.viewMode === 'group') {
        return this.filteredUsers;
      }
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredUsers.slice(start, end);
    },

    // 修复：按组分组的用户列表
    usersByGroup() {
      console.log('计算usersByGroup，当前状态:', {
        groupsLoaded: this.groupsLoaded,
        usersLoaded: this.usersLoaded,
        userGroups: this.userGroups,
        groupsMap: this.groupsMap,
        filteredUsers: this.filteredUsers
      });

      if (!this.groupsLoaded || !this.usersLoaded) {
        console.log('数据未完全加载，返回空数组');
        return [];
      }

      const grouped = {};

      // 为所有已知的用户组创建空分组
      this.userGroups.forEach(group => {
        grouped[group.group_id] = {
          groupId: group.group_id,
          groupName: group.group_name,
          users: [],
          accessLevel: group.access_level || 1,
          expanded: this.expandedGroups[group.group_id] !== false,
          description: group.description || ''
        };
      });

      // 创建"未分组"组
      grouped['unassigned'] = {
        groupId: 'unassigned',
        groupName: '未分组',
        users: [],
        accessLevel: 0,
        expanded: this.expandedGroups['unassigned'] !== false,
        description: '没有分配用户组的用户'
      };

      // 将用户分配到对应的组中
      this.filteredUsers.forEach(user => {
        // 修复：从用户数据中正确获取group_id
        let groupId = null;

        // 首先尝试从user.group_id获取
        if (user.group_id && user.group_id !== 0) {
          groupId = parseInt(user.group_id);
        }
        // 如果没有group_id，尝试从group_name推断
        else if (user.group_name) {
          // 根据group_name查找对应的group_id
          const matchedGroup = this.userGroups.find(g => g.group_name === user.group_name);
          if (matchedGroup) {
            groupId = matchedGroup.group_id;
          }
        }

        // 如果还是没有找到，设为未分组
        if (!groupId) {
          groupId = 'unassigned';
        }

        console.log(`用户 ${user.username} 的组ID: ${groupId} (原始: ${user.group_id}, 组名: ${user.group_name})`);

        if (grouped[groupId]) {
          grouped[groupId].users.push(user);
        } else {
          console.warn(`用户 ${user.username} 的用户组 ${groupId} 不存在，添加到未分组`);
          grouped['unassigned'].users.push(user);
        }
      });

      // 过滤掉没有用户的组（可选）
      const nonEmptyGroups = Object.values(grouped).filter(group => group.users.length > 0);

      // 按权限级别排序（管理员组在前）
      const sortedGroups = nonEmptyGroups.sort((a, b) => {
        return (b.accessLevel || 0) - (a.accessLevel || 0);
      });

      console.log('计算完成的分组数据:', sortedGroups);
      return sortedGroups;
    },

    // 统计信息
    groupStats() {
      if (!this.groupsLoaded || !this.usersLoaded) {
        return {};
      }

      const stats = {};

      // 初始化所有用户组的统计
      this.userGroups.forEach(group => {
        stats[group.group_id] = {
          groupName: group.group_name,
          total: 0,
          active: 0,
          inactive: 0
        };
      });

      // 添加未分组统计
      stats['unassigned'] = {
        groupName: '未分组',
        total: 0,
        active: 0,
        inactive: 0
      };

      // 统计用户
      this.filteredUsers.forEach(user => {
        // 修复：正确获取用户的组ID
        let groupId = null;

        if (user.group_id && user.group_id !== 0) {
          groupId = parseInt(user.group_id);
        } else if (user.group_name) {
          const matchedGroup = this.userGroups.find(g => g.group_name === user.group_name);
          if (matchedGroup) {
            groupId = matchedGroup.group_id;
          }
        }

        if (!groupId) {
          groupId = 'unassigned';
        }

        if (!stats[groupId]) {
          stats[groupId] = {
            groupName: this.getGroupName(groupId),
            total: 0,
            active: 0,
            inactive: 0
          };
        }

        stats[groupId].total++;
        if (user.status === 1) {
          stats[groupId].active++;
        } else {
          stats[groupId].inactive++;
        }
      });

      return stats;
    }
  },

  async mounted() {
    console.log('组件挂载，开始初始化');
    await this.checkPermissions();
    if (this.hasPermission) {
      // 确保按顺序加载，用户组先加载完成后再加载用户
      await this.loadUserGroups();
      await this.loadUsers();
    }
  },

  methods: {
    // 检查用户权限
async checkPermissions() {
  console.log('开始权限检查...');
  
  const token = localStorage.getItem('token');
  let currentUser = localStorage.getItem('currentUser');

  console.log('Token存在:', !!token);
  console.log('CurrentUser存在:', !!currentUser);

  if (!token) {
    console.log('缺少Token');
    this.hasPermission = false;
    this.isAuthError = true;
    return;
  }

  // 如果本地没有用户信息，先通过API获取
  if (!currentUser) {
    console.log('本地没有用户信息，通过API获取...');
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile API返回数据:', data);
        
        if (data.success && data.profile) {
          // 将用户信息保存到localStorage
          currentUser = JSON.stringify(data.profile);
          localStorage.setItem('currentUser', currentUser);
          console.log('用户信息已保存到localStorage');
        }
      } else {
        console.log('获取用户信息失败，状态码:', response.status);
        this.hasPermission = false;
        this.isAuthError = true;
        return;
      }
    } catch (error) {
      console.error('获取用户信息异常:', error);
      this.hasPermission = false;
      this.isAuthError = true;
      return;
    }
  }

  // 现在处理用户信息
  try {
    const user = JSON.parse(currentUser);
    console.log('当前用户信息:', user);
    this.currentUserId = user.user_id;

    // 获取权限级别
    let accessLevel = 0;
    if (user.access_level !== undefined) {
      accessLevel = parseInt(user.access_level);
      console.log('从用户信息获取权限级别:', accessLevel);
    } else {
      console.log('用户信息中没有access_level，尝试其他方式判断...');
      
      // 根据用户组判断
      if (user.group_name === '管理员' || user.group_id === 1) {
        accessLevel = 10;
        console.log('根据用户组判断为管理员，设置权限级别为10');
      } else if (user.username === 'admin') {
        accessLevel = 10;
        console.log('根据用户名判断为管理员，设置权限级别为10');
      } else {
        accessLevel = 1;
        console.log('判断为普通用户，设置权限级别为1');
      }
    }

    this.hasPermission = true;
    this.hasAdminPermission = accessLevel >= 5;
    
    console.log('权限检查完成:', {
      hasPermission: this.hasPermission,
      hasAdminPermission: this.hasAdminPermission,
      accessLevel: accessLevel
    });

  } catch (parseError) {
    console.error('解析用户信息失败:', parseError);
    this.hasPermission = false;
    this.isAuthError = true;
  }
},
debugAuth() {
  console.log('=== 认证调试信息 ===');
  console.log('Token:', localStorage.getItem('token'));
  console.log('CurrentUser:', localStorage.getItem('currentUser'));
  console.log('hasPermission:', this.hasPermission);
  console.log('hasAdminPermission:', this.hasAdminPermission);
  console.log('isAuthError:', this.isAuthError);
  console.log('currentUserId:', this.currentUserId);
  
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    console.log('解析的用户信息:', user);
  } catch (e) {
    console.log('用户信息解析失败:', e);
  }
  console.log('==================');
},

    // 修复：优化用户组加载逻辑
    async loadUserGroups() {
      console.log('开始加载用户组数据');
      this.groupsLoaded = false;

      try {
        const token = localStorage.getItem('token');

        // 使用正确的API端点
        const response = await fetch('/api/groups', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('用户组API返回数据:', data);

          // 处理返回的数据格式
          let groups = [];
          if (Array.isArray(data)) {
            groups = data;
          } else if (data.groups && Array.isArray(data.groups)) {
            groups = data.groups;
          } else if (data.data && Array.isArray(data.data)) {
            groups = data.data;
          } else {
            console.warn('用户组数据格式异常:', data);
            groups = [];
          }

          // 标准化用户组数据格式
          this.userGroups = groups.map(group => ({
            group_id: parseInt(group.group_id || group.id),
            group_name: group.group_name || group.name || '未知组',
            description: group.description || '',
            access_level: parseInt(group.access_level || 1),
            created_at: group.created_at,
            updated_at: group.updated_at
          }));

          console.log('处理后的用户组数据:', this.userGroups);

        } else if (response.status === 404) {
          console.warn('用户组API不存在，使用默认数据');
          this.userGroups = this.getDefaultGroups();
        } else {
          console.error('加载用户组失败，状态码:', response.status);
          this.userGroups = this.getDefaultGroups();
        }

        // 如果没有获取到任何用户组，使用默认组
        if (!this.userGroups || this.userGroups.length === 0) {
          console.warn('未获取到用户组数据，使用默认用户组');
          this.userGroups = this.getDefaultGroups();
        }

        // 创建映射表并设置加载完成标志
        this.createGroupsMap();
        this.groupsLoaded = true;

        console.log('用户组加载完成:', {
          groups: this.userGroups,
          map: this.groupsMap
        });

      } catch (error) {
        console.error('加载用户组异常:', error);
        this.userGroups = this.getDefaultGroups();
        this.createGroupsMap();
        this.groupsLoaded = true;
      }
    },

    // 获取默认用户组
    getDefaultGroups() {
      return [
        {
          group_id: 1,
          group_name: '管理员',
          description: '系统管理员组，拥有所有权限',
          access_level: 10
        },
        {
          group_id: 2,
          group_name: '普通用户',
          description: '普通用户组，基础权限',
          access_level: 1
        },
        {
          group_id: 3,
          group_name: '访客',
          description: '访客用户组，只读权限',
          access_level: 0
        }
      ];
    },

    // 创建用户组映射表
    createGroupsMap() {
      this.groupsMap = {};
      if (this.userGroups && this.userGroups.length > 0) {
        this.userGroups.forEach(group => {
          this.groupsMap[group.group_id] = {
            name: group.group_name,
            access_level: group.access_level,
            description: group.description
          };
        });
      }
      console.log('创建用户组映射表:', this.groupsMap);
    },

    // 修复：加载用户列表时正确处理group_id
    async loadUsers() {
      console.log('开始加载用户数据');
      this.loading = true;
      this.error = null;
      this.usersLoaded = false;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('用户API返回数据:', data);

          // 处理用户数据，修复group_id字段
          this.users = Array.isArray(data) ? data.map(user => {
            // 修复：正确处理group_id
            let groupId = null;

            // 优先使用group_id字段
            if (user.group_id && user.group_id !== 0) {
              groupId = parseInt(user.group_id);
            }
            // 如果没有group_id，尝试从group_name推断
            else if (user.group_name && this.groupsLoaded) {
              const matchedGroup = this.userGroups.find(g => g.group_name === user.group_name);
              if (matchedGroup) {
                groupId = matchedGroup.group_id;
              }
            }

            return {
              ...user,
              group_id: groupId,
              status: parseInt(user.status || 1)
            };
          }) : [];

          console.log('处理后的用户数据:', this.users);
          this.usersLoaded = true;
          this.filterUsers();

        } else if (response.status === 401) {
          this.error = '认证失败，请重新登录';
          this.isAuthError = true;
        } else {
          this.error = '加载用户列表失败';
        }
      } catch (error) {
        console.error('加载用户列表失败:', error);
        this.error = '网络错误，请检查网络连接';
      } finally {
        this.loading = false;
      }
    },

    // 根据用户组ID获取用户组名称
    getGroupName(groupId) {
      if (!groupId || groupId === 'unassigned') return '未分组';

      // 确保映射表已创建
      if (!this.groupsMap || Object.keys(this.groupsMap).length === 0) {
        this.createGroupsMap();
      }

      const group = this.groupsMap[groupId];
      return group ? group.name : `未知组(ID:${groupId})`;
    },

    // 根据用户组ID获取权限级别
    getGroupAccessLevel(groupId) {
      if (!groupId || groupId === 'unassigned') return 0;

      // 确保映射表已创建
      if (!this.groupsMap || Object.keys(this.groupsMap).length === 0) {
        this.createGroupsMap();
      }

      const group = this.groupsMap[groupId];
      return group ? group.access_level : 0;
    },

    // 根据用户组ID获取权限级别描述
    getAccessLevelDescription(groupId) {
      const accessLevel = this.getGroupAccessLevel(groupId);

      if (accessLevel >= 10) return '超级管理员';
      if (accessLevel >= 5) return '管理员';
      if (accessLevel >= 1) return '普通用户';
      return '访客';
    },

    // 过滤用户
    filterUsers() {
      if (!this.usersLoaded) {
        return;
      }

      let filtered = [...this.users];

      // 搜索过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(user =>
          (user.username && user.username.toLowerCase().includes(query)) ||
          (user.full_name && user.full_name.toLowerCase().includes(query)) ||
          (user.email && user.email.toLowerCase().includes(query)) ||
          this.getGroupName(user.group_id).toLowerCase().includes(query)
        );
      }

      // 状态过滤
      if (this.statusFilter !== '') {
        filtered = filtered.filter(user => user.status == this.statusFilter);
      }

      // 用户组过滤
      if (this.groupFilter) {
        if (this.groupFilter === 'unassigned') {
          filtered = filtered.filter(user => !user.group_id);
        } else {
          filtered = filtered.filter(user => user.group_id == this.groupFilter);
        }
      }

      this.filteredUsers = filtered;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
      this.currentPage = 1;

      console.log('过滤完成:', {
        原始用户数: this.users.length,
        过滤后用户数: this.filteredUsers.length,
        搜索条件: this.searchQuery,
        状态筛选: this.statusFilter,
        组筛选: this.groupFilter
      });
    },

    // 切换显示模式
    toggleViewMode(mode) {
      console.log('切换显示模式:', mode);
      this.viewMode = mode;
      this.currentPage = 1;
    },

    // 展开/折叠组
    toggleGroup(groupId) {
      console.log('切换组展开状态:', groupId);
      this.$set(this.expandedGroups, groupId, !this.expandedGroups[groupId]);
    },

    // 检查组是否展开
    isGroupExpanded(groupId) {
      return this.expandedGroups[groupId] !== false; // 默认展开
    },

    // 显示成功消息
    showSuccessMessage(message) {
      if (this.$message) {
        this.$message.success(message);
      } else {
        alert(message);
      }
    },

    // 显示错误消息
    showErrorMessage(message) {
      if (this.$message) {
        this.$message.error(message);
      } else {
        alert(message);
      }
    },

    // 刷新数据
    async refreshData() {
      console.log('刷新数据');
      this.groupsLoaded = false;
      this.usersLoaded = false;
      await this.loadUserGroups();
      await this.loadUsers();
    },

    // 重置筛选
    resetFilters() {
      this.searchQuery = '';
      this.statusFilter = '';
      this.groupFilter = '';
      this.filterUsers();
    },

    // 调试方法：打印当前状态
    debugGroupData() {
      console.log('=== 调试信息 ===');
      console.log('groupsLoaded:', this.groupsLoaded);
      console.log('usersLoaded:', this.usersLoaded);
      console.log('userGroups:', this.userGroups);
      console.log('groupsMap:', this.groupsMap);
      console.log('users:', this.users);
      console.log('filteredUsers:', this.filteredUsers);
      console.log('usersByGroup:', this.usersByGroup);
      console.log('expandedGroups:', this.expandedGroups);
      console.log('viewMode:', this.viewMode);
      console.log('===============');
    },

    // 测试用户组分组功能
    testGroupFunction() {
      console.log('测试用户组分组功能');
      this.viewMode = 'group';
      this.debugGroupData();

      // 强制触发计算属性重新计算
      this.$nextTick(() => {
        console.log('nextTick后的usersByGroup:', this.usersByGroup);
      });
    },

    // 添加用户相关方法
    closeAddUserModal() {
      this.showAddUserModal = false;
      this.newUser = {
        username: '',
        full_name: '',
        email: '',
        phone: '',
        password: '',
        group_id: 2
      };
    },

    async addUser() {
      this.addingUser = true;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.newUser)
        });

        const data = await response.json();

        if (response.ok) {
          this.showSuccessMessage('用户添加成功');
          this.closeAddUserModal();
          await this.loadUsers();
        } else {
          this.showErrorMessage(data.message || '添加用户失败');
        }
      } catch (error) {
        console.error('添加用户失败:', error);
        this.showErrorMessage('网络错误，请重试');
      } finally {
        this.addingUser = false;
      }
    },

    // 编辑用户相关方法
    editUser(user) {
      this.editingUser = { ...user };
      this.showEditUserModal = true;
    },

    closeEditUserModal() {
      this.showEditUserModal = false;
      this.editingUser = {};
    },

    async updateUser() {
      this.updatingUser = true;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${this.editingUser.user_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            full_name: this.editingUser.full_name,
            email: this.editingUser.email,
            phone: this.editingUser.phone,
            group_id: this.editingUser.group_id,
            status: this.editingUser.status
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.showSuccessMessage('用户信息更新成功');
          this.closeEditUserModal();
          await this.loadUsers();
        } else {
          this.showErrorMessage(data.message || '更新用户信息失败');
        }
      } catch (error) {
        console.error('更新用户失败:', error);
        this.showErrorMessage('网络错误，请重试');
      } finally {
        this.updatingUser = false;
      }
    },

    // 重置密码相关方法
    resetPassword(user) {
      this.resetPasswordUser = user;
      this.newPassword = '';
      this.showResetPasswordModal = true;
    },

    closeResetPasswordModal() {
      this.showResetPasswordModal = false;
      this.resetPasswordUser = null;
      this.newPassword = '';
    },

    async confirmResetPassword() {
      this.resettingPassword = true;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${this.resetPasswordUser.user_id}/change-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            new_password: this.newPassword
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.showSuccessMessage('密码重置成功');
          this.closeResetPasswordModal();
        } else {
          this.showErrorMessage(data.message || '密码重置失败');
        }
      } catch (error) {
        console.error('重置密码失败:', error);
        this.showErrorMessage('网络错误，请重试');
      } finally {
        this.resettingPassword = false;
      }
    },

    // 切换用户状态
    async toggleUserStatus(user) {
      const newStatus = user.status === 1 ? 0 : 1;
      const action = newStatus === 1 ? '启用' : '禁用';

      if (!confirm(`确定要${action}用户 ${user.full_name} 吗？`)) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${user.user_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: newStatus
          })
        });

        const data = await response.json();

        if (response.ok) {
          this.showSuccessMessage(`用户${action}成功`);
          await this.loadUsers();
        } else {
          this.showErrorMessage(data.message || `${action}用户失败`);
        }
      } catch (error) {
        console.error(`${action}用户失败:`, error);
        this.showErrorMessage('网络错误，请重试');
      }
    },

    // 删除用户
    async deleteUser(user) {
      if (!confirm(`确定要删除用户 ${user.full_name} 吗？此操作不可恢复！`)) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${user.user_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok) {
          this.showSuccessMessage('用户删除成功');
          await this.loadUsers();
        } else {
          this.showErrorMessage(data.message || '删除用户失败');
        }
      } catch (error) {
        console.error('删除用户失败:', error);
        this.showErrorMessage('网络错误，请重试');
      }
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return '未知';
      return new Date(dateString).toLocaleString('zh-CN');
    },

    // 格式化用户状态
    formatStatus(status) {
      return status === 1 ? '正常' : '禁用';
    },

    // 获取状态样式类
    getStatusClass(status) {
      return status === 1 ? 'status-active' : 'status-inactive';
    }
  }
}