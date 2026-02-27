import app from './app.js';
import prisma from './config/database.js';
import { config } from './config/env.js';
import { initializeFirebase } from './config/firebase.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    await initializeFirebase();
    logger.info('Firebase initialized successfully');

    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('Failed to start server');
    console.error(error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
