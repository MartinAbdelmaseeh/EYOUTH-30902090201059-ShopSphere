const multer = require('multer');
const { put, del } = require('@vercel/blob');


const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

async function uploadToBlob(file) {
  const ext = (file.originalname.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  const key = `products/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const blob = await put(key, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
  });

  return blob.url;
}

async function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.includes('.blob.vercel-storage.com')) return;

  try {
    await del(imageUrl);
  } catch (err) {
    console.error('⚠️  Failed to delete product image from Blob:', err.message);
  }
}

module.exports = { upload, uploadToBlob, deleteUploadedFile };