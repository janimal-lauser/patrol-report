/**
 * PDF Report Generator for Patrol Report
 *
 * Generates professional shift reports as PDF files.
 * Uses expo-print for HTML-to-PDF rendering and expo-sharing for export.
 *
 * Usage:
 *   import { generateAndSharePDF } from "@/lib/pdfGenerator";
 *   await generateAndSharePDF({ shift, summary });
 */

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Platform, Alert } from "react-native";
import { Shift, ShiftSummary, ShiftEvent } from "@/types/shift";

// ── Types ──────────────────────────────────────────────────

export interface PDFGeneratorOptions {
  shift: Shift;
  summary: ShiftSummary;
  includePhotos?: boolean;
}

export interface PDFResult {
  uri: string;
  fileName: string;
}

// ── German Formatters ──────────────────────────────────────

function formatDateDE(timestamp: number): string {
  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateLongDE(timestamp: number): string {
  const days = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];
  const months = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];
  const d = new Date(timestamp);
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTimeDE(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m} Uhr`;
}

function formatDurationDE(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} Min.`;
  if (minutes === 0) return `${hours} Std.`;
  return `${hours} Std. ${minutes} Min.`;
}

function formatDistanceDE(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Photo Handling ─────────────────────────────────────────

async function loadPhotoAsBase64(uri: string): Promise<string | null> {
  try {
    if (!uri || uri.trim() === "") return null;
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return null;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const extension = uri.toLowerCase().endsWith(".png") ? "png" : "jpeg";
    return `data:image/${extension};base64,${base64}`;
  } catch (error) {
    console.warn("Could not load photo for PDF:", uri, error);
    return null;
  }
}

// ── Event Rendering ────────────────────────────────────────

async function renderEventHtml(
  event: ShiftEvent,
  index: number,
  includePhotos: boolean
): Promise<string> {
  const isIrregularity = event.type === "irregularity";
  const typeName = isIrregularity ? "Unregelmäßigkeit" : "Kontrollpunkt";
  const typeColor = isIrregularity ? "#EF4444" : "#10B981";
  const typeIcon = isIrregularity ? "⚠" : "✓";
  const bgColor = isIrregularity
    ? "rgba(239,68,68,0.06)"
    : "rgba(16,185,129,0.06)";

  let photoHtml = "";
  if (includePhotos && event.photoUri) {
    const base64 = await loadPhotoAsBase64(event.photoUri);
    if (base64) {
      photoHtml = `<img src="${base64}" class="event-photo" />`;
    } else {
      photoHtml = `<div class="photo-placeholder">[Foto konnte nicht geladen werden]</div>`;
    }
  }

  return `
    <div class="event" style="background:${bgColor}; border-left-color:${typeColor};">
      <div class="event-header">
        <span class="event-badge" style="background:${typeColor};">${typeIcon}</span>
        <span class="event-type">${typeName}</span>
        <span class="event-time">${formatTimeDE(event.timestamp)}</span>
      </div>
      ${event.note ? `<p class="event-note">${escapeHtml(event.note)}</p>` : ""}
      <p class="event-coords">GPS: ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}</p>
      ${photoHtml}
    </div>
  `;
}

// ── HTML Template ──────────────────────────────────────────

async function buildReportHtml(options: PDFGeneratorOptions): Promise<string> {
  const { shift, summary, includePhotos = true } = options;

  const trackingModeLabel =
    shift.trackingMode === "event-only"
      ? "Nur Ereignisse"
      : "Kontinuierlich";

  // Render all events
  const eventHtmlParts: string[] = [];
  for (let i = 0; i < shift.events.length; i++) {
    const html = await renderEventHtml(shift.events[i], i, includePhotos);
    eventHtmlParts.push(html);
  }
  const eventsHtml = eventHtmlParts.join("");

  const eventsSection =
    shift.events.length > 0
      ? `
    <div class="section">
      <div class="section-title">Ereignisprotokoll (${shift.events.length})</div>
      ${eventsHtml}
    </div>
  `
      : `
    <div class="section">
      <div class="section-title">Ereignisprotokoll</div>
      <p class="no-events">Keine Ereignisse in dieser Schicht dokumentiert.</p>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Patrol Report – ${formatDateDE(summary.startTime)}</title>
  <style>
    @page {
      margin: 20mm 15mm 20mm 15mm;
      size: A4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1E40AF;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .report-brand {
      display: flex;
      flex-direction: column;
    }
    .report-title {
      font-size: 26px;
      font-weight: 800;
      color: #1E40AF;
      letter-spacing: -0.5px;
    }
    .report-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }
    .report-meta strong {
      color: #1e293b;
      display: block;
      font-size: 14px;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 22px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1E40AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }

    /* ── Info Grid ── */
    .info-grid {
      display: flex;
      gap: 12px;
    }
    .info-item {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2px;
    }

    /* ── Stats Grid ── */
    .stats-grid {
      display: flex;
      gap: 12px;
    }
    .stat {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: #1E40AF;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }

    /* ── Events ── */
    .event {
      border-left: 4px solid;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .event-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .event-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
    }
    .event-type {
      font-weight: 700;
      font-size: 13px;
      flex: 1;
    }
    .event-time {
      font-size: 12px;
      color: #64748b;
    }
    .event-note {
      font-size: 13px;
      color: #334155;
      margin: 4px 0;
    }
    .event-coords {
      font-size: 11px;
      color: #94a3b8;
    }
    .event-photo {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: 6px;
      margin-top: 8px;
    }
    .photo-placeholder {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
      margin-top: 4px;
    }
    .no-events {
      color: #94a3b8;
      font-style: italic;
      padding: 12px 0;
    }

    /* ── Tracking Mode Badge ── */
    .tracking-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      color: #1E40AF;
      background: rgba(30,64,175,0.08);
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
    }

    /* ── Footer ── */
    .report-footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <div class="report-header">
    <div class="report-brand">
      <div class="report-title">PATROL REPORT</div>
      <div class="report-subtitle">Schichtbericht</div>
      <span class="tracking-badge">${trackingModeLabel}</span>
    </div>
    <div class="report-meta">
      <strong>${escapeHtml(summary.userName)}</strong>
      ${formatDateLongDE(summary.startTime)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Schicht-Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Datum</div>
        <div class="info-value">${formatDateDE(summary.startTime)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Beginn</div>
        <div class="info-value">${formatTimeDE(summary.startTime)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Ende</div>
        <div class="info-value">${formatTimeDE(summary.endTime)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Dauer</div>
        <div class="info-value">${formatDurationDE(summary.duration)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Statistiken</div>
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${formatDistanceDE(summary.drivingDistance)}</div>
        <div class="stat-label">Fahrstrecke</div>
      </div>
      <div class="stat">
        <div class="stat-value">${formatDistanceDE(summary.walkingDistance)}</div>
        <div class="stat-label">Fussweg</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.fieldCheckCount}</div>
        <div class="stat-label">Kontrollpunkte</div>
      </div>
      <div class="stat">
        <div class="stat-value">${summary.irregularityCount}</div>
        <div class="stat-label">Unregelm.</div>
      </div>
    </div>
  </div>

  ${eventsSection}

  <div class="report-footer">
    Erstellt mit Patrol Report &middot; ${formatDateDE(Date.now())} um ${formatTimeDE(Date.now())}
  </div>

</body>
</html>
  `;
}

// ── Public API ─────────────────────────────────────────────

/**
 * Generates a PDF report and returns the file URI.
 */
export async function generatePDFReport(
  options: PDFGeneratorOptions
): Promise<PDFResult> {
  const html = await buildReportHtml(options);
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595, // A4 width in points
    height: 842, // A4 height in points
  });

  const fileName = `PatrolReport_${formatDateDE(options.summary.startTime).replace(/\./g, "-")}_${options.summary.userName.replace(/\s+/g, "_")}.pdf`;

  return { uri, fileName };
}

/**
 * Generates a PDF report and opens the native share dialog.
 * Handles platform differences and errors with user-facing alerts.
 */
export async function generateAndSharePDF(
  options: PDFGeneratorOptions
): Promise<void> {
  try {
    const { uri, fileName } = await generatePDFReport(options);

    if (Platform.OS === "web") {
      Alert.alert("Erfolg", "PDF-Report wurde erstellt.");
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Patrol Report – ${formatDateDE(options.summary.startTime)}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("Erfolg", `PDF gespeichert: ${uri}`);
    }
  } catch (error: any) {
    console.error("PDF generation error:", error);

    // Retry without photos if the error might be photo-related
    if (options.includePhotos !== false && options.shift.events.some((e) => e.photoUri)) {
      Alert.alert(
        "PDF-Fehler",
        "Report konnte nicht mit Fotos erstellt werden. Soll ein Report ohne Fotos erstellt werden?",
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Ohne Fotos",
            onPress: () =>
              generateAndSharePDF({ ...options, includePhotos: false }),
          },
        ]
      );
    } else {
      Alert.alert(
        "PDF-Fehler",
        `Report konnte nicht erstellt werden: ${error?.message || "Unbekannter Fehler"}`
      );
    }
  }
}
