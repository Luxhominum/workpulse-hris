import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hris.workpulse',
  appName: 'WorkPulse Attendance',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f8fafc',
    },
  },
};

export default config;
