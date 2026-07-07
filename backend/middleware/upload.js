const multer    = require('multer')
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req) => ({
    folder:        `greenhouse/${req.uploadFolder || 'misc'}`,
    resource_type: 'image',
    transformation: [{ quality: 'auto:good', width: 1200, crop: 'limit' }],
  }),
})

module.exports = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Faqat rasm yuklash mumkin'), false)
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})
