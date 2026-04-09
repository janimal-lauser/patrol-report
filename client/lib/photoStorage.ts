/**
 * Foto-Sandbox fuer PatrolReport
 *
 * Speichert Fotos in einem geschuetzten App-Verzeichnis, das:
 * - Persistent ist (ueberlebt App-Neustarts und Cache-Clearing)
 * - Von iCloud/Google-Backup ausgeschlossen wird (via Config-Plugin in Session 2)
 * - Nur fuer die App zugaenglich ist (Sandboxing)
 *
 * Nutzt die neue expo-file-system API (Expo 54): File, Directory, Paths Klassen.
 *
 * Loest den bekannten Foto-Bug im PDF-Generator:
 * Vorher: photoUri zeigte auf temporaeren ImagePicker-Cache -> Datei weg nach Neustart
 * Nachher: photoUri zeigt auf permanenten Sandbox-Pfad -> Datei immer verfuegbar
 */

import { File, Directory, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { generateId } from "./storage";

// ── Foto-Verzeichnis ───────────────────────────────────────

// Liegt in documentDirectory/patrol_photos/
// Backup-Exclusion wird in Session 2 per Config-Plugin konfiguriert
const PHOTO_DIR = new Directory(Paths.document, "patrol_photos");

// ── Public API ─────────────────────────────────────────────

/**
 * Stellt sicher, dass das Foto-Verzeichnis existiert.
 * Wird automatisch von savePhotoToSandbox() aufgerufen.
 */
export async function ensurePhotoDirectory(): Promise<void> {
  if (!PHOTO_DIR.exists) {
    PHOTO_DIR.create();
    console.log("[PhotoStorage] Directory created:", PHOTO_DIR.uri);
  }
}

/**
 * Kopiert ein Foto aus dem temporaeren ImagePicker-Cache in die Sandbox.
 * Gibt den permanenten Pfad zurueck, der in der Datenbank gespeichert wird.
 *
 * @param tempUri - Temporaere URI aus ImagePicker (result.assets[0].uri)
 * @returns Permanenter URI-Pfad in der Sandbox
 */
export async function savePhotoToSandbox(tempUri: string): Promise<string> {
  if (Platform.OS === "web") return tempUri;

  ensurePhotoDirectory();

  const extension = tempUri.toLowerCase().includes(".png") ? "png" : "jpg";
  const fileName = `${generateId()}.${extension}`;

  const sourceFile = new File(tempUri);
  const destinationFile = new File(PHOTO_DIR, fileName);

  sourceFile.copy(destinationFile);
  console.log("[PhotoStorage] Photo saved to sandbox:", fileName);

  return destinationFile.uri;
}

/**
 * Loescht ein einzelnes Foto aus der Sandbox.
 * Sicherheits-Check: Loescht nur Dateien aus dem eigenen Verzeichnis.
 */
export function deletePhoto(uri: string): void {
  if (!uri) return;

  try {
    const file = new File(uri);
    // Sicherheits-Check: nur Dateien aus unserem Verzeichnis loeschen
    if (uri.includes("patrol_photos/")) {
      file.delete();
    }
  } catch (error) {
    console.warn("[PhotoStorage] Failed to delete photo:", error);
  }
}

/**
 * Loescht alle Fotos aus der Sandbox.
 * Wird von clearAllData() in storage.ts aufgerufen.
 */
export function deleteAllPhotos(): void {
  try {
    if (PHOTO_DIR.exists) {
      PHOTO_DIR.delete();
      console.log("[PhotoStorage] All photos deleted");
    }
  } catch (error) {
    console.warn("[PhotoStorage] Failed to delete photo directory:", error);
  }
}

/**
 * Gibt den URI des Foto-Verzeichnisses zurueck.
 */
export function getPhotoDirectoryUri(): string {
  return PHOTO_DIR.uri;
}
