const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Capacitor Static Export Build...');

// Clean any APKs from public, out, and assets to prevent recursive nesting bloat
const cleanApks = () => {
  const targets = [
    path.resolve(__dirname, '../public/app-debug.apk'),
    path.resolve(__dirname, '../out/app-debug.apk'),
    path.resolve(__dirname, '../android/app/src/main/assets/public/app-debug.apk'),
  ];
  for (const t of targets) {
    if (fs.existsSync(t)) {
      try {
        fs.unlinkSync(t);
        console.log(`🧹 Cleaned nested APK from: ${path.relative(path.resolve(__dirname, '..'), t)}`);
      } catch (e) {}
    }
  }
};

try {
  cleanApks();

  // 1. Build Next.js with static export
  console.log('📦 Step 1: Compiling static Next.js export into /out...');
  execSync('npx next build', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, BUILD_TARGET: 'capacitor' },
    stdio: 'inherit',
  });

  cleanApks();

  // 2. Sync web assets into Android project
  console.log('🔄 Step 2: Syncing static assets to Android native project...');
  execSync('npx cap sync android', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  cleanApks();

  console.log('✅ Capacitor Android sync complete! Native Android assets are up to date.');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}
