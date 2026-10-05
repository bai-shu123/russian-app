import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.baishu123.russianapp',
  appName: '俄语学习',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#f2f8fc'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#f2f8fc'
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#2f78b7'
    }
  }
};

export default config;
