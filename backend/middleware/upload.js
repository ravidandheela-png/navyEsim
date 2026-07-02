/**
 * Multer configuration for vendor sheet uploads (M7.3).
 *
 * Saves files to:
 *   <UPLOAD_DIR>/<vendorSlug>_<timestamp>.<ext>
 *
 * Where:
 *   UPLOAD_DIR defaults to <project-root>/backend/uploads/vendor-sheets
 *   vendorSlug comes from req.params.id (vendor DB id) — used as a safe prefix.
 *
 * Allowed types : .csv, .xlsx, .xls
 * Max file size : UPLOAD_MAX_SIZE_MB env var (default 10 MB)
 *
 * Exports:
 *   upload          — multer instance (use upload.single('file') in routes)
 *   handleUploadError — Express error middleware to convert multer errors to JSON
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Upload directory ──────────────────────────────────────────────────────────
// Resolve to an absolute path so it works regardless of cwd at runtime.
const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'vendor-sheets');
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : DEFAULT_UPLOAD_DIR;

// Ensure the directory exists at startup (sync is fine — runs once at require time)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Allowed extensions ────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

// ── Storage ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    // Use vendor id from route param as a safe slug prefix.
    // Falls back to "vendor" if the route doesn't have :id.
    const vendorSlug = req.params && req.params.id
      ? String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'vendor';

    const ext       = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    cb(null, `${vendorSlug}_${timestamp}${ext}`);
  },
});

// ── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Unsupported file type "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`
    ));
  }
};

// ── Multer instance ───────────────────────────────────────────────────────────
const maxSizeMB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

// ── Error handler middleware ──────────────────────────────────────────────────
/**
 * Express error-handling middleware for multer errors.
 * Must be registered AFTER the upload middleware in the route.
 *
 * Usage in a route:
 *   router.post('/upload', upload.single('file'), handleUploadError, controller)
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function handleUploadError(err, req, res, next) {
  if (!err) return next();

  // multer v2 uses MulterError class
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `File too large. Maximum allowed size is ${maxSizeMB} MB.`,
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected field name. Use "file" as the form field name.',
    });
  }

  // File filter rejection or other multer error
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }

  return next(err);
}

module.exports = { upload, handleUploadError };
