import { useRef } from "react";
import type { CourseEntry } from "../types";
import { parseIcs } from "../utils/gcal";
import { parseBackup, type RestoredBackup } from "../utils/persistence";

interface ImporterHandlers {
  onMergeCourses: (courses: CourseEntry[], label: string) => void;
  onRestoreBackup: (backup: RestoredBackup, fileName: string) => void;
}

/**
 * File-based importers (Google Calendar .ics + JSON backup), shared by the
 * desktop sidebar and the mobile FAB menu so both trigger the same pickers.
 */
export function useImporters({ onMergeCourses, onRestoreBackup }: ImporterHandlers) {
  const icsRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  const handleIcsFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const entries = parseIcs(String(reader.result));
        if (entries.length === 0) {
          alert("No weekly recurring classes found in that .ics file.");
          return;
        }
        onMergeCourses(entries, file.name);
      } catch {
        alert("Could not read this .ics file.");
      }
    };
    reader.readAsText(file);
  };

  const handleBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const backup = parseBackup(String(reader.result));
      if (!backup) {
        alert("This backup file is invalid or from an incompatible version.");
        return;
      }
      onRestoreBackup(backup, file.name);
    };
    reader.readAsText(file);
  };

  return {
    icsRef,
    backupRef,
    handleIcsFile,
    handleBackupFile,
    requestIcs: () => icsRef.current?.click(),
    requestBackup: () => backupRef.current?.click(),
  };
}
