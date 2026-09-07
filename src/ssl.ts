import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const { NODE_ENV } = process.env;
let credentials: any = {};

if (NODE_ENV === 'customdev') {
  const key = fs.readFileSync(
    '/etc/apache2/ssl/onlinetestingserver.key',
    'utf8',
  );
  const cert = fs.readFileSync(
    '/etc/apache2/ssl/onlinetestingserver.crt',
    'utf8',
  );
  const ca = fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.ca');
  credentials = { key, cert, ca };
}

export default credentials;
