const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withMicrophonePermission(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const requireLine = `require File.join(File.dirname(\`node --print "require.resolve('react-native-permissions/package.json')"\`), "scripts/setup")`;
      const setupCall = `${requireLine}\nsetup_permissions([\n  'Microphone',\n])`;

      if (!podfile.includes("setup_permissions")) {
        podfile = podfile.replace(
          "target",
          `${setupCall}\n\ntarget`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
}

module.exports = withMicrophonePermission;
