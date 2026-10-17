import { STORAGE_KEY } from "./persistence";

/**
 * Downloads the raw localStorage workspace as a JSON backup file.
 * Returns false when there is nothing stored to export.
 */
export function downloadBackup(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "schedule-backup.json";
  link.click();
  URL.revokeObjectURL(url);
  return true;
}
