import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Alubond CRM",
  slug: "alubond-crm",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "alubond-crm",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.alubond.crm",
    // Universal links require Associated Domains on the Apple provisioning profile.
    // Re-enable after running: eas credentials:configure-build -p ios -e production
    // associatedDomains: ["applinks:crm.alubond.com"],
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Alubond CRM uses your location when logging site visits and showing projects on the map.",
      NSPhotoLibraryUsageDescription:
        "Alubond CRM needs photo access to attach images to project activities.",
      NSCameraUsageDescription:
        "Alubond CRM needs camera access to capture photos for project activities.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.alubond.crm",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "crm.alubond.com",
            pathPrefix: "/reset-password",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    "expo-secure-store",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Alubond CRM uses your location when logging site visits and showing projects on the map.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Alubond CRM to attach photos to project activities.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "8614ed3f-9c23-4d37-bc3b-c0f09213285b",
    },
  },
};

export default config;
