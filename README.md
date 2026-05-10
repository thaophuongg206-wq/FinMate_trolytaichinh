# 🧾 FinMate OCR Backend

Backend Node.js + Express để đọc hóa đơn bằng **Google Cloud Vision OCR**.

---

## 📁 Cấu trúc dự án

```
finmate-ocr-backend/
├── app.js                      # Entry point — khởi động Express server
├── package.json
├── .env.example                # Mẫu biến môi trường (copy thành .env)
├── routes/
│   └── ocr.js                  # Router: POST /api/ocr/scan
├── controllers/
│   └── ocrController.js        # Logic OCR + parse + response
├── middleware/
│   └── upload.js               # Multer — nhận & lưu file ảnh tạm
└── uploads/                    # Thư mục file tạm (tự xóa sau OCR)
```

---

## ⚙️ Cài đặt

### 1. Clone & cài package

```bash
cd finmate-ocr-backend
npm install
```

### 2. Tạo file .env

```bash
cp .env.example .env
```

Chỉnh nội dung `.env`:

```
PORT=3001
GOOGLE_APPLICATION_CREDENTIALS=./finmate-google-credentials.json
```

### 3. Lấy Google Cloud Credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project (hoặc dùng project có sẵn)
3. Bật **Cloud Vision API**: *APIs & Services → Library → Cloud Vision API → Enable*
4. Tạo Service Account: *IAM & Admin → Service Accounts → Create*
5. Tạo JSON Key → Tải về
6. Đặt file JSON vào thư mục gốc, đặt tên `finmate-google-credentials.json`

### 4. Chạy server

```bash
# Production
npm start

# Development (tự reload)
npm run dev
```

---

## 🔌 API

### `POST /api/ocr/scan`

Upload ảnh hóa đơn để OCR.

**Request** — `multipart/form-data`:
| Field     | Type | Mô tả |
|-----------|------|-------|
| `invoice` | File | File ảnh (JPEG/PNG/WEBP, tối đa 10MB) |

**Response thành công** `200`:
```json
{
  "success": true,
  "data": {
    "vendor": "Highlands Coffee",
    "amount": 450000,
    "date": "12/03/2026",
    "items": [
      { "name": "Cà phê sữa đá", "qty": 2, "price": 55000, "subtotal": 110000 },
      { "name": "Bánh mì", "qty": 3, "price": 25000, "subtotal": 75000 }
    ],
    "rawText": "Highlands Coffee\n12/03/2026\n..."
  }
}
```

**Response lỗi** `422` / `500`:
```json
{
  "success": false,
  "error": "Không nhận diện được chữ trong ảnh. Hãy chụp rõ hơn."
}
```

---

## 🧪 Test API bằng cURL

```bash
curl -X POST http://localhost:3001/api/ocr/scan \
  -F "invoice=@/path/to/hoa-don.jpg"
```

---

## 📌 Logic Parse

| Trường | Phương pháp |
|--------|-------------|
| **vendor** | Lấy dòng đầu tiên không rỗng của văn bản OCR |
| **date** | Regex `dd/mm/yyyy` hoặc `dd-mm-yyyy` |
| **amount** | Regex số tiền → lấy giá trị LỚN NHẤT (thường là tổng) |
| **items** | Regex dòng có pattern: `Tên SL Đơn_giá Thành_tiền` |

---

## 🔒 Bảo mật

- File tạm bị **xóa ngay** sau khi OCR xong hoặc khi có lỗi
- Không lưu trữ ảnh hóa đơn trên server
- CORS được bật để frontend có thể gọi API
