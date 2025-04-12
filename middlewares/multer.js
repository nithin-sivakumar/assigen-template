import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(file.size);
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.originalname + "-" + uniqueSuffix + ".zip");
  },
});

export const upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    const ext = path.extname(file.originalname);
    if (ext !== ".zip") {
      return callback(new Error("Only .zip files are allowed"));
    }
    callback(null, true);
  },
  limits: { fileSize: 1024 * 1024 * 6 }, // 6 mb limit to avoid uploading large files
});
