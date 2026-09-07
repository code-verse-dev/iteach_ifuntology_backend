import { diskStorage } from 'multer';
import { extname } from 'path';
import * as multer from 'multer';

const fileTypes = {
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  video: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-flv',
    'video/x-matroska',
    'video/webm',
  ],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/pdf',
  ],
};

export const fileStorage = diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let cleanOriginalName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '');

    cleanOriginalName = cleanOriginalName.replace(
      extname(cleanOriginalName),
      '',
    );

    const fileName = `${uniqueSuffix}.${cleanOriginalName}${extname(file.originalname)}`;
    cb(null, fileName);
  },
});

export const fileFilter = (req, file, cb: multer.FileFilterCallback) => {
  const { fieldname, mimetype } = file;
  if (
    (fieldname === 'image' && fileTypes.image.includes(mimetype)) ||
    (fieldname === 'images' && fileTypes.image.includes(mimetype)) ||
    (fieldname === 'file' && fileTypes.document.includes(mimetype)) ||
    (fieldname === 'video' && fileTypes.video.includes(mimetype)) ||
    (fieldname === 'videoThumbnail' && fileTypes.image.includes(mimetype))
  ) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};
