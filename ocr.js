// ============================================================
//  routes/ocr.js
//  Khai báo các endpoint liên quan đến OCR hóa đơn
// ============================================================

const express       = require('express');
const router        = express.Router();
const upload        = require('../middleware/upload');       // Multer middleware
const { scanInvoice } = require('../controllers/ocrController');

// POST /api/ocr/scan
// Client gửi FormData với field tên là "invoice" chứa file ảnh
router.post(
  '/scan',
  upload.single('invoice'),   // Nhận 1 file, field name = "invoice"
  scanInvoice                 // Chạy controller OCR
);

module.exports = router;
