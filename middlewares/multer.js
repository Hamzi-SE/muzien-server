import multer from 'multer'

const storage = multer.memoryStorage()

const singleUpload = multer({ storage }).single('file')
const multipleUploads = multer({ storage }).array('files', 10)

export { singleUpload, multipleUploads }
