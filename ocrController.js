// ============================================================
//  controllers/ocrController.js
//  Logic chính: nhận ảnh → gọi Google Vision → parse → JSON
// ============================================================

const vision = require('@google-cloud/vision');
const fs     = require('fs');
const path   = require('path');

// Khởi tạo Google Vision client
// Credentials được đọc từ biến môi trường GOOGLE_APPLICATION_CREDENTIALS
const client = new vision.ImageAnnotatorClient();


// ─── HÀM XÓA FILE TẠM ────────────────────────────────────────
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Đã xóa file tạm: ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.error('⚠️  Không thể xóa file tạm:', err.message);
  }
}


// ─── PARSE SỐ TIỀN ────────────────────────────────────────────
// Lấy số tiền lớn nhất trong văn bản
// Hỗ trợ: 450.000đ | 1,200,000 | 1200000 | 450000đ
function parseAmount(text) {
  // Regex khớp nhiều định dạng số tiền Việt Nam
  const patterns = [
    /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?)\s*(?:đ|VND|vnđ|đồng)?/gi,  // 450.000đ hoặc 1,200,000
    /(\d{4,})\s*(?:đ|VND|vnđ|đồng)/gi,                                // 450000đ
  ];

  let amounts = [];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Loại bỏ dấu phân cách để chuyển thành số nguyên
      const cleaned = match[1].replace(/[.,]/g, '');
      const num = parseInt(cleaned, 10);
      if (!isNaN(num) && num > 0) {
        amounts.push(num);
      }
    }
  }

  if (amounts.length === 0) return null;

  // Trả về số tiền LỚN NHẤT (thường là tổng cộng cuối hóa đơn)
  return Math.max(...amounts);
}


// ─── PARSE NGÀY ───────────────────────────────────────────────
// Tìm ngày dạng dd/mm/yyyy hoặc dd-mm-yyyy
function parseDate(text) {
  const regex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const day   = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year  = match[3];
    // Kiểm tra hợp lệ cơ bản
    if (parseInt(day) <= 31 && parseInt(month) <= 12) {
      return `${day}/${month}/${year}`;
    }
  }
  return null;
}


// ─── PARSE VENDOR ─────────────────────────────────────────────
// Lấy dòng đầu tiên không rỗng của hóa đơn làm tên nhà cung cấp
function parseVendor(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  return lines.length > 0 ? lines[0] : 'Không xác định';
}


// ─── PARSE LINE ITEMS ─────────────────────────────────────────
// Cố gắng nhận diện từng dòng hàng hóa trong hóa đơn
// Pattern: Tên hàng   SL   Đơn giá   Thành tiền
function parseItems(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items = [];

  // Regex nhận diện dòng có số lượng + giá tiền
  // Ví dụ: "Cà phê sữa   2   45.000   90.000"
  const itemLineRegex = /^(.+?)\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;

  for (const line of lines) {
    const match = itemLineRegex.exec(line);
    if (match) {
      const qty      = parseInt(match[2], 10);
      const price    = parseInt(match[3].replace(/[.,]/g, ''), 10);
      const subtotal = parseInt(match[4].replace(/[.,]/g, ''), 10);

      if (qty > 0 && price > 0) {
        items.push({
          name    : match[1].trim(),
          qty,
          price,
          subtotal: subtotal || qty * price
        });
      }
    }
  }

  return items;
}


// ─── CONTROLLER CHÍNH ─────────────────────────────────────────
// POST /api/ocr/scan
const scanInvoice = async (req, res) => {
  // Kiểm tra có file không
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Không có file ảnh được upload'
    });
  }

  const filePath = req.file.path;   // Đường dẫn file tạm
  console.log(`📷 Nhận file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

  try {
    // ── BƯỚC 1: Gửi ảnh lên Google Vision API ──
    console.log('🔍 Đang gửi ảnh sang Google Vision OCR...');
    const [result] = await client.textDetection(filePath);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      deleteFile(filePath);
      return res.status(422).json({
        success: false,
        error  : 'Không nhận diện được chữ trong ảnh. Hãy chụp rõ hơn.'
      });
    }

    // detections[0].description chứa TOÀN BỘ text được nhận diện
    const rawText = detections[0].description;
    console.log('📝 OCR thô:', rawText.substring(0, 200) + '...');

    // ── BƯỚC 2: Parse dữ liệu từ raw text ──
    const vendor = parseVendor(rawText);
    const amount = parseAmount(rawText);
    const date   = parseDate(rawText);
    const items  = parseItems(rawText);

    // ── BƯỚC 3: Xóa file tạm ──
    deleteFile(filePath);

    // ── BƯỚC 4: Trả JSON về frontend ──
    return res.status(200).json({
      success: true,
      data: {
        vendor,                                               // Tên nhà cung cấp (dòng đầu)
        amount : amount || 0,                                 // Số tiền lớn nhất
        date   : date || null,                                // dd/mm/yyyy
        items  : items.length > 0 ? items : [               // Danh sách hàng hóa
          {
            name    : 'Hàng hóa / Dịch vụ',
            qty     : 1,
            price   : amount || 0,
            subtotal: amount || 0
          }
        ],
        rawText                                               // Text gốc để debug
      }
    });

  } catch (err) {
    // Dọn dẹp file dù có lỗi
    deleteFile(filePath);

    console.error('❌ Lỗi OCR:', err.message);
    return res.status(500).json({
      success: false,
      error  : 'OCR thất bại: ' + err.message
    });
  }
};

module.exports = { scanInvoice };
