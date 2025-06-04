<template>
    <Teleport to="body">
        <div class="modal-overlay" @click="handleOverlayClick">
            <div :class="['modal-content', `modal-${size}`, { 'modal-loading': loading }]" @click.stop>
                <!-- 模态框头部 -->
                <div class="modal-header">
                    <h3 class="modal-title">
                        <slot name="title">{{ title }}</slot>
                    </h3>
                    <button @click="$emit('close')" class="modal-close-btn" :disabled="loading" aria-label="关闭">
                        <i class="icon-x"></i>
                    </button>
                </div>

                <!-- 模态框内容 -->
                <div class="modal-body">
                    <slot></slot>
                </div>

                <!-- 加载遮罩 -->
                <div v-if="loading" class="modal-loading-overlay">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
export default {
    name: 'Modal',
    props: {
        title: {
            type: String,
            default: '模态框'
        },
        size: {
            type: String,
            default: 'medium',
            validator: (value) => ['small', 'medium', 'large'].includes(value)
        },
        loading: {
            type: Boolean,
            default: false
        },
        closeOnOverlay: {
            type: Boolean,
            default: true
        }
    },
    emits: ['close'],

    mounted() {
        // 阻止背景滚动
        document.body.style.overflow = 'hidden';

        // 添加ESC键监听
        document.addEventListener('keydown', this.handleEsc);

        // 焦点管理
        this.$nextTick(() => {
            const firstInput = this.$el.querySelector('input, select, textarea, button');
            if (firstInput) {
                firstInput.focus();
            }
        });
    },

    beforeUnmount() {
        // 恢复背景滚动
        document.body.style.overflow = '';

        // 移除ESC键监听
        document.removeEventListener('keydown', this.handleEsc);
    },

    methods: {
        handleOverlayClick() {
            if (this.closeOnOverlay && !this.loading) {
                this.$emit('close');
            }
        },

        handleEsc(event) {
            if (event.key === 'Escape' && !this.loading) {
                this.$emit('close');
            }
        }
    }
};
</script>

<style scoped>
/* ==================== 模态框遮罩 ==================== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* ==================== 模态框容器 ==================== */
.modal-content {
    background: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* ==================== 模态框尺寸 ==================== */
.modal-small {
    width: 100%;
    max-width: 400px;
}

.modal-medium {
    width: 100%;
    max-width: 600px;
}

.modal-large {
    width: 100%;
    max-width: 900px;
}

/* ==================== 模态框头部 ==================== */
.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px;
    border-bottom: 1px solid #e5e7eb;
    background: #f8fafc;
}

.modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 12px;
}

.modal-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 20px;
}

.modal-close-btn:hover:not(:disabled) {
    background: #e5e7eb;
    color: #374151;
}

.modal-close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ==================== 模态框内容 ==================== */
.modal-body {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
}

/* ==================== 加载状态 ==================== */
.modal-loading {
    pointer-events: none;
}

.modal-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
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
    .modal-overlay {
        padding: 16px;
        align-items: flex-end;
    }

    .modal-content {
        max-height: 85vh;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(100%);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .modal-small,
    .modal-medium,
    .modal-large {
        max-width: none;
        width: 100%;
    }

    .modal-header {
        padding: 20px 24px;
    }

    .modal-title {
        font-size: 1.25rem;
    }

    .modal-body {
        padding: 24px;
    }

    .modal-close-btn {
        width: 36px;
        height: 36px;
        font-size: 18px;
    }
}

@media (max-width: 480px) {
    .modal-header {
        padding: 16px 20px;
    }

    .modal-body {
        padding: 20px;
    }

    .modal-title {
        font-size: 1.125rem;
    }
}

/* ==================== 焦点样式 ==================== */
.modal-close-btn:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* ==================== 暗色主题支持 ==================== */
@media (prefers-color-scheme: dark) {
    .modal-content {
        background: #1f2937;
        color: #f9fafb;
    }

    .modal-header {
        background: #111827;
        border-bottom-color: #374151;
    }

    .modal-title {
        color: #f9fafb;
    }

    .modal-close-btn {
        color: #9ca3af;
    }

    .modal-close-btn:hover:not(:disabled) {
        background: #374151;
        color: #e5e7eb;
    }

    .modal-loading-overlay {
        background: rgba(31, 41, 55, 0.8);
    }

    .loading-spinner {
        border-color: #374151;
        border-top-color: #60a5fa;
    }
}

/* ==================== 动画性能优化 ==================== */
.modal-overlay,
.modal-content {
    will-change: transform, opacity;
}

/* ==================== 无障碍访问 ==================== */
.modal-content {
    outline: none;
}

.modal-content:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
}

/* 为屏幕阅读器隐藏装饰性元素 */
.modal-close-btn i {
    pointer-events: none;
}
</style>