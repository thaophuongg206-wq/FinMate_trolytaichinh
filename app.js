// ============================================================
//  FinMate OCR Backend — app.js
//  Khởi động Express server, kết nối các route
// ============================================================

const express = require('express');
const cors    = require('cors');
require('dotenv').config();          // Đọc biến môi trường từ file .env

const ocrRouter = require('./routes/ocr');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARE TOÀN CỤC ─────────────────────────────────────
app.use(cors());                     // Cho phép frontend gọi API
app.use(express.json());             // Parse body JSON

// ─── ROUTE ───────────────────────────────────────────────────
app.use('/api/ocr', ocrRouter);

// Route mặc định để kiểm tra server còn sống không
app.get('/', (req, res) => {
  res.json({ message: '✅ FinMate OCR Backend đang chạy!', version: '1.0.0' });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Lỗi server:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 FinMate OCR Backend đang chạy trên http://localhost:${PORT}`);
});
