const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

// ======= CONFIG =======
const PORT = process.env.PORT || 3000;
const MONGODB_URI = 'mongodb://localhost:27017/imagehosting'; // Change if using Atlas

// ======= SETUP =======
const app = express();
app.use(cors());
app.use(express.static('public')); // for static assets if needed
app.use('/uploads', express.static('uploads')); // serve images statically

// ======= MONGOOSE MODEL =======
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => console.log(err));

const imageSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  uploadDate: { type: Date, default: Date.now }
});

const Image = mongoose.model('Image', imageSchema);

// ======= MULTER SETUP =======
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Add timestamp prefix for uniqueness
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    console.log('Uploading file:', file.originalname, file.mimetype);

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg', 'image/webp'];
    const allowedExts = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Error: Images only!'));
    }
  }
}).single('image');

// ======= ROUTES =======

// Upload form
app.get('/', (req, res) => {
  res.send(`
    <h1>Image Hosting Upload</h1>
    <form method="POST" enctype="multipart/form-data" action="/upload">
      <input type="file" name="image" accept="image/*" required />
      <button type="submit">Upload Image</button>
    </form>
  `);
});

// Upload endpoint
app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.send(`<p>Error uploading file: ${err.message}</p><a href="/">Try again</a>`);
    }
    if (!req.file) {
      return res.send(`<p>No file selected</p><a href="/">Try again</a>`);
    }

    try {
      // Save metadata to MongoDB
      const newImage = new Image({
        filename: req.file.filename,
        originalName: req.file.originalname
      });
      await newImage.save();

      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      // Show uploaded image URL and preview
      res.send(`
        <h2>Upload successful!</h2>
        <p>Image URL: <a href="${imageUrl}" target="_blank">${imageUrl}</a></p>
        <img src="${imageUrl}" style="max-width:400px;" />
        <p><a href="/">Upload another image</a></p>
      `);
    } catch (dbErr) {
      res.send(`<p>Error saving image info: ${dbErr}</p><a href="/">Try again</a>`);
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
