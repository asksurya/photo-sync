/**
 * API Gateway server entry point
 */
import express from 'express';
import { Config } from './config';

const config = new Config();
export const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`API Gateway listening on port ${config.port}`);
  });
}
