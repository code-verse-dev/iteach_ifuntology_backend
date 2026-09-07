import './load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import corsOptions from './common/config/cors';
import * as cookieParser from 'cookie-parser';
import { existsSync, mkdirSync } from 'fs';
import credentials from './ssl';


async function bootstrap() {
  const { NODE_ENV, PORT } = process.env;
  const port = PORT || 3034;
  const isHttps = NODE_ENV === 'customdev';

  const server = express();
  const uploadRoot = join(process.cwd(), 'Uploads');
  if (!existsSync(uploadRoot)) {
    mkdirSync(uploadRoot, { recursive: true });
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      bodyParser: false,
      ...(isHttps ? { httpsOptions: credentials } : {}),
    },
  );

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors(corsOptions);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 1000000,
      message: 'Too many requests from this IP',
    }),
  );

  const allowStaticCors = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  };
  app.use('/uploads', allowStaticCors, express.static(uploadRoot));
  app.use('/Uploads', allowStaticCors, express.static(uploadRoot));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.init();
  await app.listen(port);

  if (isHttps) {
    console.log(`iTeach iFuntology Server running on HTTPS port ${port}`);
  } else {
    console.log(`iTeach iFuntology Server running on port ${port}`);
  }
}

bootstrap();
