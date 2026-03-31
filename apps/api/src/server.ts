import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const start = async () => {
  try {
    await prisma.$connect();

    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Gym API ready');
    });
  } catch (error) {
    logger.error({ err: error }, 'Unable to start server');
    process.exit(1);
  }
};

void start();
