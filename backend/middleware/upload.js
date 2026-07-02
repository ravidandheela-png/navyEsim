/**
 * Multer configuration for vendor sheet uploads.
 * Saves files to /uploads/vendor-sheets/<vendorSlug>_<timestamp>.<ext>
 * Max file size: UPLOAD_MAX_SIZE_MB env var (default 10MB).
 * Allowed types: CSV, XLSX.
 */
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads/vendor-sheets');
  },
  filename: (req, file, cb) => {
    // TODO: use vendor slug from req.params.id lookup
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `vendor_${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.csv', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and XLSX files are allowed'));
  }
};

const maxSizeMB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

module.exports = upload;
