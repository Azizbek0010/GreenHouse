const multer = require('multer')
const path   = require('path')

const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, path.join('/app/uploads', req.uploadFolder || '')),
  filename:    (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
})

module.exports = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })
