import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.notebooklmbooth',
  appName: 'NotebookLM Booth',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
