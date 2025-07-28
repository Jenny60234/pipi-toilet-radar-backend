// 廁所雷達LINE Bot - 除錯版本
console.log('🚀 程式開始啟動...');

const express = require('express');
const app = express();

console.log('✅ Express 初始化完成');

// 基本路由測試
app.get('/', (req, res) => {
  console.log('📥 收到根路徑請求');
  res.json({
    message: '🚽 廁所雷達 API - 除錯版本',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('📥 收到健康檢查請求');
  res.json({ 
    status: 'OK', 
    message: '🚽 廁所雷達運行中！',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8080,
    node_env: process.env.NODE_ENV
  });
});

// 測試 POST 路由
app.post('/test', express.json(), (req, res) => {
  console.log('📥 收到測試POST請求:', req.body);
  res.json({ received: true, data: req.body });
});

// 錯誤處理
app.use((error, req, res, next) => {
  console.error('❌ Express 錯誤:', error);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// 全域錯誤處理
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled Rejection:', error);
});

// 啟動服務器
const port = process.env.PORT || 8080;

console.log(`🔧 準備啟動服務器在 Port: ${port}`);
console.log(`🌍 環境變數 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`📦 可用環境變數:`, Object.keys(process.env).filter(key => key.includes('PORT') || key.includes('LINE')));

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🎉 服務器成功啟動！`);
  console.log(`🚽 廁所雷達測試版運行在 Port ${port}`);
  console.log(`🔗 可以訪問: http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('🚨 服務器啟動錯誤:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} 已被占用!`);
  }
});

console.log('✅ 初始化完成，等待請求...');
