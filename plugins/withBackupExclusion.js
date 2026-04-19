/**
 * Expo Config Plugin: Backup-Exclusion
 *
 * Verhindert, dass sensible Daten (SQLite DB, Fotos) in
 * iCloud/Google-Backups landen (DSGVO Art. 32).
 *
 * Android: allowBackup=false + fullBackupContent=false
 * iOS: DB und Fotos liegen in Library/Application Support (auto-excluded)
 */

const { withAndroidManifest } = require("expo/config-plugins");

function withBackupExclusion(config) {
  return withAndroidManifest(config, (config) => {
    const application =
      config.modResults.manifest.application?.[0];

    if (application) {
      application.$["android:allowBackup"] = "false";
      application.$["android:fullBackupContent"] = "false";
    }

    return config;
  });
}

module.exports = withBackupExclusion;
