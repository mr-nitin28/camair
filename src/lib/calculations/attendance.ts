/**
 * Pure calculation functions for Attendance Engine
 * Strictly typed and property-tested for numerical stability and boundary conditions.
 */

export type AttendanceRecordStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceItem {
  status: AttendanceRecordStatus;
}

export interface AttendanceMetrics {
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  percentage: number;
  isShortage: boolean;
  thresholdPercent: number;
  classesNeededToRecover: number;
  classesAllowedToMiss: number;
}

/**
 * Calculates student attendance statistics and shortage alerts.
 * 
 * Invariants:
 * - Percentage is strictly bounded within [0.00, 100.00]
 * - If total is 0, percentage is 0.00 and isShortage is false
 * - Present, Late, and Excused count towards attended classes
 */
export function calculateAttendanceMetrics(
  records: AttendanceItem[],
  thresholdPercent: number = 75.00
): AttendanceMetrics {
  const threshold = Math.max(0, Math.min(100, thresholdPercent));

  if (!records || records.length === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      percentage: 0.00,
      isShortage: false,
      thresholdPercent: threshold,
      classesNeededToRecover: 0,
      classesAllowedToMiss: 0,
    };
  }

  let attended = 0;
  let absent = 0;

  for (const record of records) {
    if (record.status === 'Present' || record.status === 'Late' || record.status === 'Excused') {
      attended++;
    } else if (record.status === 'Absent') {
      absent++;
    }
  }

  const total = attended + absent;
  if (total === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      percentage: 0.00,
      isShortage: false,
      thresholdPercent: threshold,
      classesNeededToRecover: 0,
      classesAllowedToMiss: 0,
    };
  }

  const rawPercent = (attended / total) * 100;
  const percentage = Math.round((rawPercent + Number.EPSILON) * 100) / 100;
  const isShortage = percentage < threshold;

  // Calculate classes needed to recover to threshold: (attended + x) / (total + x) >= threshold / 100
  let classesNeededToRecover = 0;
  if (isShortage && threshold < 100) {
    const t = threshold / 100;
    const numerator = t * total - attended;
    const denominator = 1 - t;
    const rawNeeded = numerator / denominator;
    classesNeededToRecover = Math.max(0, Math.ceil(rawNeeded - 1e-9));
  } else if (isShortage && threshold >= 100) {
    // If threshold is 100% and we missed even one class, mathematically impossible without resetting
    classesNeededToRecover = Infinity;
  }

  // Calculate classes student can miss before falling below threshold: attended / (total + y) >= threshold / 100
  let classesAllowedToMiss = 0;
  if (!isShortage && threshold > 0) {
    const t = threshold / 100;
    const rawAllowed = (attended / t) - total;
    classesAllowedToMiss = Math.max(0, Math.floor(rawAllowed + 1e-9));
  } else if (!isShortage && threshold === 0) {
    classesAllowedToMiss = Infinity;
  }

  return {
    totalSessions: total,
    attendedSessions: attended,
    absentSessions: absent,
    percentage,
    isShortage,
    thresholdPercent: threshold,
    classesNeededToRecover,
    classesAllowedToMiss,
  };
}
