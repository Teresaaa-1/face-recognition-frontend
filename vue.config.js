module.exports = {
  devServer: {
    port: 3000, // 前端端口改为3000，避免与后端8080冲突
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // 后端Flask服务地址
        changeOrigin: true,
        // 确保不重写路径，保留完整的 /api 前缀
        pathRewrite: {
          '^/api': '/api' // 明确保留 /api 前缀
        }
      }
    }
  }
}