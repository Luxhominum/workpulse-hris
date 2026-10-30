import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { EmployeesService } from './modules/employees/employees.service';

async function bootstrap() {
  try {
    // Verify database connection & enable robust WAL crash-resilient mode
    await prisma.$connect();
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    console.log('✅ Connected to database (SQLite WAL Mode Active)');

    // Ensure all employee PII is encrypted at rest (AES-256-GCM)
    await EmployeesService.migratePlaintextToEncrypted();

    const app = createApp();

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`🚀 HRIS Attendance API running on http://0.0.0.0:${env.PORT}`);
      console.log(`📡 Local Healthcheck: http://localhost:${env.PORT}/api/v1/health`);
      console.log(`📱 LAN Mobile Healthcheck: http://192.168.1.50:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
