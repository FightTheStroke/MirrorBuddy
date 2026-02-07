import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.fightthestroke.mirrorbuddy",
  appName: "MirrorBuddy",
  webDir: "out",
  server: {
    androidScheme: "https",
    // For dev mode: uncomment and set to your local dev server
    // url: "http://localhost:3000",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
