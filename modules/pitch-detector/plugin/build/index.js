"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_plugins_1 = require("expo/config-plugins");
var withPitchDetector = function (config) {
    // iOS: Add microphone usage description to Info.plist
    config = (0, config_plugins_1.withInfoPlist)(config, function (config) {
        config.modResults.NSMicrophoneUsageDescription =
            config.modResults.NSMicrophoneUsageDescription ||
                "FretNinja needs microphone access to detect the notes you play on your guitar.";
        return config;
    });
    // Android: Ensure RECORD_AUDIO permission is in the manifest
    config = (0, config_plugins_1.withAndroidManifest)(config, function (config) {
        var mainApplication = config.modResults.manifest;
        if (!mainApplication["uses-permission"]) {
            mainApplication["uses-permission"] = [];
        }
        var permissions = mainApplication["uses-permission"];
        var hasRecordAudio = permissions.some(function (p) { var _a; return ((_a = p.$) === null || _a === void 0 ? void 0 : _a["android:name"]) === "android.permission.RECORD_AUDIO"; });
        if (!hasRecordAudio) {
            permissions.push({
                $: { "android:name": "android.permission.RECORD_AUDIO" },
            });
        }
        return config;
    });
    return config;
};
exports.default = withPitchDetector;
