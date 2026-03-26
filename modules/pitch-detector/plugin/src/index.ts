import {
  ConfigPlugin,
  withInfoPlist,
  withAndroidManifest,
} from "expo/config-plugins";

const withPitchDetector: ConfigPlugin = (config) => {
  // iOS: Add microphone usage description to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSMicrophoneUsageDescription =
      config.modResults.NSMicrophoneUsageDescription ||
      "FretNinja needs microphone access to detect the notes you play on your guitar.";
    return config;
  });

  // Android: Ensure RECORD_AUDIO permission is in the manifest
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest;
    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }
    const permissions = mainApplication["uses-permission"];
    const hasRecordAudio = permissions.some(
      (p) => p.$?.["android:name"] === "android.permission.RECORD_AUDIO"
    );
    if (!hasRecordAudio) {
      permissions.push({
        $: { "android:name": "android.permission.RECORD_AUDIO" },
      });
    }
    return config;
  });

  return config;
};

export default withPitchDetector;
