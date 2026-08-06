const multer = require('multer');
const path = require('path');
const config = require('../config/config');

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.xls']);
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

/**
 * Spreadsheet upload, held in memory only.
 *
 * Nothing is written to disk, which removes the previous exposure entirely:
 * uploads used to land in `uploads/` under a client-supplied filename with no
 * type or size check, and that directory was served publicly by Express.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
      return cb(
        Object.assign(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés'), {
          status: 400,
        })
      );
    }
    return cb(null, true);
  },
});

module.exports = { uploadSpreadsheet: upload.single('file') };
