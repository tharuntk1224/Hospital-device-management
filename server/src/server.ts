import app from './app';
import { config } from './config/env';
import { testConnection } from './config/database';
import { testRedisConnection } from './config/redis';

async function startServer(): Promise<void> {
  try {
    // Test database connection (required)
    await testConnection();

    // Test Redis connection (optional — caching disabled if unavailable)
    try {
      await testRedisConnection();
    } catch (redisErr) {
      console.warn('⚠️  Redis unavailable — caching disabled. App will still work.');
    }

    app.listen(config.port, () => {
      console.log(`\n🚀 Biomedical Device Management Server`);
      console.log(`   Environment: ${config.env}`);
      console.log(`   Port:        ${config.port}`);
      console.log(`   API:         http://localhost:${config.port}/api`);
      console.log(`   Docs:        http://localhost:${config.port}/api/docs`);
      console.log(`   Health:      http://localhost:${config.port}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
