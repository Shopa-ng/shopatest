import { registerAs } from '@nestjs/config';

export default registerAs('flutterwave', () => ({
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
}));
