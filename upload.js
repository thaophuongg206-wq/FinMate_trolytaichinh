// ============================================================
//  middleware/upload.js
//  Cấu hình Multer để nhận file ảnh từ client
// ============================================================

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Thư mục lưu file tạm (sẽ xóa sau khi OCR xong)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Tạo thư mục nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Cấu hình nơi lưu file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  // Đặt tên file: timestamp + tên gốc để tránh trùng lặp
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Chỉ chấp nhận file ảnh
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);   // Chấp nhận file
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh: JPEG, PNG, WEBP'), false);
  }
};

// Giới hạn kích thước 10MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;
