<template>
  <div class="users-container">
    <div class="header">
      <h2>用户管理</h2>
      <div class="header-actions" v-if="hasAdminPermission">
        <button @click="showAddUserModal = true" class="add-user-btn">
          <i class="icon-plus"></i> 添加用户
        </button>
        <button @click="loadUsers" :disabled="loading" class="refresh-btn">
          <i class="icon-refresh"></i> {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filters" v-if="hasPermission">
      <div class="search-box">
        <input v-model="searchQuery" type="text" placeholder="搜索用户名、姓名或邮箱..." @input="filterUsers" class="search-input">
      </div>
      <div class="filter-box">
        <select v-model="statusFilter" @change="filterUsers" class="filter-select">
          <option value="">全部状态</option>
          <option value="1">正常</option>
          <option value="0">禁用</option>
        </select>
        <select v-model="groupFilter" @change="filterUsers" class="filter-select">
          <option value="">全部用户组</option>
          <option v-for="group in userGroups" :key="group.group_id" :value="group.group_id">
            {{ group.group_name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 权限检查提示 -->
    <div v-if="!hasPermission" class="permission-warning">
      <p>您没有权限查看用户列表。请联系管理员或使用管理员账户登录。</p>
      <router-link to="/login" class="login-link">重新登录</router-link>
    </div>

    <div v-else-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载用户列表...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadUsers" class="retry-btn">重试</button>
      <router-link to="/login" v-if="isAuthError" class="login-link">去登录</router-link>
    </div>

    <div v-else-if="filteredUsers.length === 0" class="no-users">
      <p v-if="searchQuery || statusFilter || groupFilter">没有找到符合条件的用户</p>
      <p v-else>暂无注册用户</p>
      <router-link to="/register" v-if="!searchQuery && !statusFilter && !groupFilter"
        class="register-link">立即注册</router-link>
    </div>

    <!-- 用户列表 -->
    <div v-else class="users-table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>头像</th>
            <th>用户信息</th>
            <th>联系方式</th>
            <th>用户组</th>
            <th>状态</th>
            <th>注册时间</th>
            <th v-if="hasAdminPermission">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.user_id" class="user-row">
            <td class="avatar-cell">
              <div class="user-avatar">
                {{ user.full_name.charAt(0).toUpperCase() }}
              </div>
            </td>
            <td class="user-info-cell">
              <div class="user-info">
                <h4>{{ user.full_name }}</h4>
                <p class="username">@{{ user.username }}</p>
                <span class="user-id">ID: {{ user.user_id }}</span>
              </div>
            </td>
            <td class="contact-cell">
              <div class="contact-info">
                <p v-if="user.email" class="email">
                  <i class="icon-email"></i> {{ user.email }}
                </p>
                <p v-if="user.phone" class="phone">
                  <i class="icon-phone"></i> {{ user.phone }}
                </p>
                <p v-if="!user.email && !user.phone" class="no-contact">未设置</p>
              </div>
            </td>
            <td class="group-cell">
              <div class="group-info">
                <span class="group-name">{{ user.group_name || '未分组' }}</span>
                <span class="access-level">权限等级: {{ user.access_level || 1 }}</span>
              </div>
            </td>
            <td class="status-cell">
              <span :class="['status-badge', user.status === 1 ? 'status-active' : 'status-inactive']">
                {{ user.status === 1 ? '正常' : '禁用' }}
              </span>
            </td>
            <td class="time-cell">
              <span class="register-time">{{ formatDate(user.created_at) }}</span>
              <span v-if="user.updated_at && user.updated_at !== user.created_at" class="update-time">
                更新: {{ formatDate(user.updated_at) }}
              </span>
            </td>
            <td v-if="hasAdminPermission" class="actions-cell">
              <div class="action-buttons">
                <button @click="editUser(user)" class="edit-btn" title="编辑用户">
                  <i class="icon-edit"></i>
                </button>
                <button @click="resetPassword(user)" class="reset-btn" title="重置密码">
                  <i class="icon-key"></i>
                </button>
                <button @click="toggleUserStatus(user)"
                  :class="['toggle-btn', user.status === 1 ? 'disable-btn' : 'enable-btn']"
                  :title="user.status === 1 ? '禁用用户' : '启用用户'">
                  <i :class="user.status === 1 ? 'icon-disable' : 'icon-enable'"></i>
                </button>
                <button @click="deleteUser(user)" class="delete-btn" title="删除用户" v-if="user.user_id !== currentUserId">
                  <i class="icon-delete"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button @click="currentPage = Math.max(1, currentPage - 1)" :disabled="currentPage === 1" class="page-btn">
        上一页
      </button>

      <span class="page-info">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>

      <button @click="currentPage = Math.min(totalPages, currentPage + 1)" :disabled="currentPage === totalPages"
        class="page-btn">
        下一页
      </button>
    </div>

    <!-- 添加用户模态框 -->
    <div v-if="showAddUserModal" class="modal-overlay" @click="closeAddUserModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>添加新用户</h3>
          <button @click="closeAddUserModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="addUser" class="user-form">
          <div class="form-group">
            <label>用户名 *</label>
            <input v-model="newUser.username" type="text" required class="form-input">
          </div>
          <div class="form-group">
            <label>全名 *</label>
            <input v-model="newUser.full_name" type="text" required class="form-input">
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="newUser.email" type="email" class="form-input">
          </div>
          <div class="form-group">
            <label>电话</label>
            <input v-model="newUser.phone" type="tel" class="form-input">
          </div>
          <div class="form-group">
            <label>密码 *</label>
            <input v-model="newUser.password" type="password" required class="form-input">
          </div>
          <div class="form-group">
            <label>用户组</label>
            <select v-model="newUser.group_id" class="form-select">
              <option v-for="group in userGroups" :key="group.group_id" :value="group.group_id">
                {{ group.group_name }}
              </option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeAddUserModal" class="cancel-btn">取消</button>
            <button type="submit" :disabled="addingUser" class="submit-btn">
              {{ addingUser ? '添加中...' : '添加用户' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑用户模态框 -->
    <div v-if="showEditUserModal" class="modal-overlay" @click="closeEditUserModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑用户信息</h3>
          <button @click="closeEditUserModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="updateUser" class="user-form">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="editingUser.username" type="text" disabled class="form-input disabled">
          </div>
          <div class="form-group">
            <label>全名 *</label>
            <input v-model="editingUser.full_name" type="text" required class="form-input">
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="editingUser.email" type="email" class="form-input">
          </div>
          <div class="form-group">
            <label>电话</label>
            <input v-model="editingUser.phone" type="tel" class="form-input">
          </div>
          <div class="form-group">
            <label>用户组</label>
            <select v-model="editingUser.group_id" class="form-select">
              <option v-for="group in userGroups" :key="group.group_id" :value="group.group_id">
                {{ group.group_name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="editingUser.status" class="form-select">
              <option :value="1">正常</option>
              <option :value="0">禁用</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeEditUserModal" class="cancel-btn">取消</button>
            <button type="submit" :disabled="updatingUser" class="submit-btn">
              {{ updatingUser ? '更新中...' : '更新用户' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 重置密码模态框 -->
    <div v-if="showResetPasswordModal" class="modal-overlay" @click="closeResetPasswordModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>重置密码</h3>
          <button @click="closeResetPasswordModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="confirmResetPassword" class="user-form">
          <p>确定要重置用户 <strong>{{ resetPasswordUser?.full_name }}</strong> 的密码吗？</p>
          <div class="form-group">
            <label>新密码 *</label>
            <input v-model="newPassword" type="password" required class="form-input">
          </div>
          <div class="form-actions">
            <button type="button" @click="closeResetPasswordModal" class="cancel-btn">取消</button>
            <button type="submit" :disabled="resettingPassword" class="submit-btn">
              {{ resettingPassword ? '重置中...' : '确认重置' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="actions" v-if="hasPermission">
      <router-link to="/" class="back-link">返回首页</router-link>
    </div>
  </div>
</template>

<!-- <script>
export default {
  name: 'UsersPage',
  data() {
    return {
      users: [],
      filteredUsers: [],
      userGroups: [],
      loading: false,
      error: null,
      isAuthError: false,
      hasPermission: false,
      hasAdminPermission: false,
      currentUserId: null,

      // 搜索和筛选
      searchQuery: '',
      statusFilter: '',
      groupFilter: '',

      // 分页
      currentPage: 1,
      pageSize: 10,
      totalPages: 0,

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
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredUsers.slice(start, end);
    }
  },

  async mounted() {
    await this.checkPermissions();
    if (this.hasPermission) {
      await this.loadUsers();
      await this.loadUserGroups();
    }
  },

  methods: {
    async checkPermissions() {
      const token = localStorage.getItem('token');
      const currentUser = localStorage.getItem('currentUser');

      if (!token || !currentUser) {
        this.hasPermission = false;
        this.isAuthError = true;
        return;
      }

      try {
        const user = JSON.parse(currentUser);
        this.currentUserId = user.user_id;

        // 检查用户权限
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.hasPermission = true;
          this.hasAdminPermission = data.profile.access_level >= 5;
        } else {
          this.hasPermission = false;
          this.isAuthError = true;
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        this.hasPermission = false;
        this.isAuthError = true;
      }
    },

    async loadUsers() {
      this.loading = true;
      this.error = null;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          this.users = await response.json();
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

    async loadUserGroups() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/groups', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          this.userGroups = await response.json();
        }
      } catch (error) {
        console.error('加载用户组失败:', error);
      }
    },

    filterUsers() {
      let filtered = [...this.users];

      // 搜索过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(user =>
          user.username.toLowerCase().includes(query) ||
          user.full_name.toLowerCase().includes(query) ||
          (user.email && user.email.toLowerCase().includes(query))
        );
      }

      // 状态过滤
      if (this.statusFilter !== '') {
        filtered = filtered.filter(user => user.status == this.statusFilter);
      }

      // 用户组过滤
      if (this.groupFilter) {
        filtered = filtered.filter(user => user.group_id == this.groupFilter);
      }

      this.filteredUsers = filtered;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
      this.currentPage = 1;
    },

    // 添加用户
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
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.newUser)
        });

        const data = await response.json();

        if (response.ok) {
          this.$toast?.success('用户添加成功');
          this.closeAddUserModal();
          await this.loadUsers();
        } else {
          this.$toast?.error(data.message || '添加用户失败');
        }
      } catch (error) {
        console.error('添加用户失败:', error);
        this.$toast?.error('网络错误，请重试');
      } finally {
        this.addingUser = false;
      }
    },

    // 编辑用户
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
          this.$toast?.success('用户信息更新成功');
          this.closeEditUserModal();
          await this.loadUsers();
        } else {
          this.$toast?.error(data.message || '更新用户信息失败');
        }
      } catch (error) {
        console.error('更新用户失败:', error);
        this.$toast?.error('网络错误，请重试');
      } finally {
        this.updatingUser = false;
      }
    },

    // 重置密码
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
        const response = await fetch(`/api/user/users/${this.resetPasswordUser.user_id}/change-password`, {
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
          this.$toast?.success('密码重置成功');
          this.closeResetPasswordModal();
        } else {
          this.$toast?.error(data.message || '密码重置失败');
        }
      } catch (error) {
        console.error('重置密码失败:', error);
        this.$toast?.error('网络错误，请重试');
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
        const response = await fetch(`/api/user/users/${user.user_id}`, {
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
          this.$toast?.success(`用户${action}成功`);
          await this.loadUsers();
        } else {
          this.$toast?.error(data.message || `${action}用户失败`);
        }
      } catch (error) {
        console.error(`${action}用户失败:`, error);
        this.$toast?.error('网络错误，请重试');
      }
    },

    // 删除用户
    async deleteUser(user) {
      if (!confirm(`确定要删除用户 ${user.full_name} 吗？此操作不可恢复！`)) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/user/users/${user.user_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok) {
          this.$toast?.success('用户删除成功');
          await this.loadUsers();
        } else {
          this.$toast?.error(data.message || '删除用户失败');
        }
      } catch (error) {
        console.error('删除用户失败:', error);
        this.$toast?.error('网络错误，请重试');
      }
    },

    formatDate(dateString) {
      if (!dateString) return '未知';
      return new Date(dateString).toLocaleString('zh-CN');
    }
  }
}
</script>
 -->


<script>
import userpage from "../webmanage/js/userpage/userpage";
    export default userpage;
</script>

<style scoped>
@import '../webmanage/css/userpage/userpage.css'
</style>