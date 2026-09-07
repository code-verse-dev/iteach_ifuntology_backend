import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from 'src/common/response';
import * as fs from 'fs';
import * as path from 'path';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (req.files) {
      const uploadedFiles: string[] = [];

      if (Array.isArray(req.files)) {
        req.files.forEach((file: Express.Multer.File) => {
          uploadedFiles.push(file.filename);
        });
      } else {
        Object.values(req.files).forEach((fileArray: any) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file: Express.Multer.File) => {
              uploadedFiles.push(file.filename);
            });
          }
        });
      }

      for (const filename of uploadedFiles) {
        const filePath = path.resolve('Uploads', filename);
        try {
          fs.unlinkSync(filePath);
        } catch (err: any) {
          console.error(`Failed to delete file ${filename}:`, err.message);
        }
      }
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res: any = exceptionResponse;
        console.log(exceptionResponse, 'exceptionResponse');
        if (Array.isArray(res.message)) {
          message = res.message[0];
        } else {
          message = res.message || res.error || message;
        }
      }
    } else if (exception?.message) {
      message = exception.message;
    }

    response.status(status).json(ApiResponse({}, message, false));
  }
}
