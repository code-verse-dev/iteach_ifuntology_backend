import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as path from 'path';

export const imageFileFilter = (req: Request, file: any, cb: any) => {
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Image File Type not Allowed'), false);
  }
};

export const imageStorage = diskStorage({
  destination: path.resolve('Uploads'),
  filename: (req: Request, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileExtName = extname(file.originalname);
    const fileName = `${uniqueSuffix}${fileExtName}`;
    req.body.image = fileName;
    cb(null, fileName);
  },
});
