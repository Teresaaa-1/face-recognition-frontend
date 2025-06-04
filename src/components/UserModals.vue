<template>
    <div>
        <!-- 添加用户模态框 -->
        <Modal v-if="showAddUserModal" @close="$emit('close-add-user')" title="添加新用户" :loading="addingUser">
            <form @submit.prevent="$emit('add-user')" class="user-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            用户名 <span class="required">*</span>
                        </label>
                        <input v-model="newUser.username" type="text" required class="form-input" placeholder="请输入用户名">
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            全名 <span class="required">*</span>
                        </label>
                        <input v-model="newUser.full_name" type="text" required class="form-input" placeholder="请输入全名">
                    </div>

                    <div class="form-group">
                        <label class="form-label">邮箱</label>
                        <input v-model="newUser.email" type="email" class="form-input" placeholder="请输入邮箱地址">
                    </div>

                    <div class="form-group">
                        <label class="form-label">电话</label>
                        <input v-model="newUser.phone" type="tel" class="form-input" placeholder="请输入电话号码">
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            密码 <span class="required">*</span>
                        </label>
                        <input v-model="newUser.password" type="password" required class="form-input"
                            placeholder="请输入密码（至少6位）">
                    </div>

                    <div class="form-group">
                        <label class="form-label">用户组</label>
                        <select v-model="newUser.group_id" class="form-select">
                            <option v-for="group in userGroups" :key="group.group_id" :value="group.group_id">
                                {{ group.group_name }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" @click="$emit('close-add-user')" class="btn btn-secondary">
                        取消
                    </button>
                    <button type="submit" :disabled="addingUser" class="btn btn-primary">
                        <i v-if="addingUser" class="icon-loading spinning"></i>
                        {{ addingUser ? '添加中...' : '添加用户' }}
                    </button>
                </div>
            </form>
        </Modal>

        <!-- 编辑用户模态框 -->
        <Modal v-if="showEditUserModal" @close="$emit('close-edit-user')" title="编辑用户信息" :loading="updatingUser">
            <form @submit.prevent="$emit('update-user')" class="user-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">用户名</label>
                        <input v-model="editingUser.username" type="text" disabled class="form-input disabled">
                        <small class="form-hint">用户名不可修改</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            全名 <span class="required">*</span>
                        </label>
                        <input v-model="editingUser.full_name" type="text" required class="form-input"
                            placeholder="请输入全名">
                    </div>

                    <div class="form-group">
                        <label class="form-label">邮箱</label>
                        <input v-model="editingUser.email" type="email" class="form-input" placeholder="请输入邮箱地址">
                    </div>

                    <div class="form-group">
                        <label class="form-label">电话</label>
                        <input v-model="editingUser.phone" type="tel" class="form-input" placeholder="请输入电话号码">
                    </div>

                    <div class="form-group">
                        <label class="form-label">用户组</label>
                        <select v-model="editingUser.group_id" class="form-select">
                            <option v-for="group in userGroups" :key="group.group_id" :value="group.group_id">
                                {{ group.group_name }}
                            </option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">状态</label>
                        <select v-model="editingUser.status" class="form-select">
                            <option :value="1">正常</option>
                            <option :value="0">禁用</option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" @click="$emit('close-edit-user')" class="btn btn-secondary">
                        取消
                    </button>
                    <button type="submit" :disabled="updatingUser" class="btn btn-primary">
                        <i v-if="updatingUser" class="icon-loading spinning"></i>
                        {{ updatingUser ? '更新中...' : '更新用户' }}
                    </button>
                </div>
            </form>
        </Modal>

        <!-- 重置密码模态框 -->
        <Modal v-if="showResetPasswordModal" @close="$emit('close-reset-password')" title="重置密码"
            :loading="resettingPassword" size="small">
            <form @submit.prevent="$emit('reset-password')" class="user-form">
                <div class="reset-password-content">
                    <div class="user-info-display">
                        <div class="user-avatar-display">
                            {{ resetPasswordUser?.full_name?.charAt(0)?.toUpperCase() }}
                        </div>
                        <div class="user-details">
                            <h4>{{ resetPasswordUser?.full_name }}</h4>
                            <p>@{{ resetPasswordUser?.username }}</p>
                        </div>
                    </div>

                    <p class="reset-warning">
                        <i class="icon-warning"></i>
                        确定要重置此用户的密码吗？用户将需要使用新密码重新登录。
                    </p>

                    <div class="form-group">
                        <label class="form-label">
                            新密码 <span class="required">*</span>
                        </label>
                        <input v-model="newPassword" type="password" required class="form-input"
                            placeholder="请输入新密码（至少6位）">
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" @click="$emit('close-reset-password')" class="btn btn-secondary">
                        取消
                    </button>
                    <button type="submit" :disabled="resettingPassword" class="btn btn-danger">
                        <i v-if="resettingPassword" class="icon-loading spinning"></i>
                        {{ resettingPassword ? '重置中...' : '确认重置' }}
                    </button>
                </div>
            </form>
        </Modal>
    </div>
</template>

<script>
import Modal from './Modal.vue';

export default {
    name: 'UserModals',
    components: {
        Modal
    },
    props: {
        showAddUserModal: Boolean,
        showEditUserModal: Boolean,
        showResetPasswordModal: Boolean,
        newUser: Object,
        editingUser: Object,
        resetPasswordUser: Object,
        newPassword: String,
        userGroups: Array,
        addingUser: Boolean,
        updatingUser: Boolean,
        resettingPassword: Boolean
    },
    emits: [
        'close-add-user',
        'close-edit-user',
        'close-reset-password',
        'add-user',
        'update-user',
        'reset-password'
    ]
};
</script>

<style scoped>
/* ==================== 表单样式 ==================== */
.user-form {
    width: 100%;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-label {
    font-weight: 500;
    color: #374151;
    font-size: 14px;
}

.required {
    color: #ef4444;
}

.form-input,
.form-select {
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s ease;
    background: white;
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
}

.form-select {
    cursor: pointer;
}

.form-hint {
    color: #6b7280;
    font-size: 12px;
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
}

/* ==================== 重置密码特殊样式 ==================== */
.reset-password-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.user-info-display {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.user-avatar-display {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 18px;
}

.user-details h4 {
    margin: 0 0 4px 0;
    color: #1f2937;
    font-size: 16px;
}

.user-details p {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
}

.reset-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #fef3cd;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    color: #92400e;
    font-size: 14px;
    margin: 0;
}

.reset-warning i {
    color: #f59e0b;
    margin-top: 2px;
    flex-shrink: 0;
}

/* ==================== 按钮样式 ==================== */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
}

.btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.spinning {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }

    .form-actions {
        flex-direction: column-reverse;
    }

    .user-info-display {
        padding: 16px;
    }

    .user-avatar-display {
        width: 40px;
        height: 40px;
        font-size: 16px;
    }
}
</style>