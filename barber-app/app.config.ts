import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BarberFlow',
  slug: 'barber-flow',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'barberflow',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.barberflow.app',
    infoPlist: {
      NSCameraUsageDescription: 'Permitir acesso à câmera para fotos de produtos',
      NSPhotoLibraryUsageDescription: 'Permitir acesso à galeria para selecionar imagens',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1a1a',
    },
    package: 'com.barberflow.app',
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'NOTIFICATIONS',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-asset',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ffffff',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Permitir acesso às fotos para uploads',
        cameraPermission: 'Permitir acesso à câmera',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
