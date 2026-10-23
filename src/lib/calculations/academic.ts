/**
 * Pure calculation functions for Academic Grading (SGPA / CGPA)
 * Strictly typed and property-tested for numerical stability and boundary conditions.
 */

export interface CourseGradeEntry {
  credits: number;
  gradePoints: number;
  subjectCode?: string;
  subjectName?: string;
  grade?: string;
}

export interface SemesterGradeEntry {
  credits: number;
  sgpa: number;
}

/**
 * Calculates Semester Grade Point Average (SGPA).
 * SGPA = Sum(credits_i * grade_points_i) / Sum(credits_i)
 * 
 * Invariants:
 * - Returns 0.00 if total credits is 0 or input array is empty
 * - Output is rounded to 2 decimal places
 * - Output is strictly bounded between 0.00 and 10.00 (or max possible grade point)
 */
export function calculateSGPA(courses: CourseGradeEntry[]): number {
  if (!courses || courses.length === 0) {
    return 0.00;
  }

  let totalCreditPoints = 0;
  let totalCredits = 0;

  for (const course of courses) {
    if (course.credits <= 0 || isNaN(course.credits)) {
      continue;
    }
    const points = Math.max(0, course.gradePoints || 0);
    totalCreditPoints += course.credits * points;
    totalCredits += course.credits;
  }

  if (totalCredits <= 0) {
    return 0.00;
  }

  const rawSgpa = totalCreditPoints / totalCredits;
  return Math.round((rawSgpa + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates Cumulative Grade Point Average (CGPA) across completed semesters.
 * CGPA = Sum(credits_sem * sgpa_sem) / Sum(credits_sem)
 * 
 * Invariants:
 * - Returns 0.00 if total credits is 0 or input array is empty
 * - Output is rounded to 2 decimal places
 */
export function calculateCGPA(semesters: SemesterGradeEntry[]): number {
  if (!semesters || semesters.length === 0) {
    return 0.00;
  }

  let totalPoints = 0;
  let totalCredits = 0;

  for (const sem of semesters) {
    if (sem.credits <= 0 || isNaN(sem.credits)) {
      continue;
    }
    const sgpa = Math.max(0, sem.sgpa || 0);
    totalPoints += sem.credits * sgpa;
    totalCredits += sem.credits;
  }

  if (totalCredits <= 0) {
    return 0.00;
  }

  const rawCgpa = totalPoints / totalCredits;
  return Math.round((rawCgpa + Number.EPSILON) * 100) / 100;
}

export type UGCGrade = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F';

export interface GradeCalculationResult {
  percentage: number;
  grade: UGCGrade;
  gradePoints: number;
  description: string;
}

/**
 * Maps raw marks to UGC 10-Point Scale grade and grade points.
 * Enforces boundary clamping [0, 100]% and standard UGC tiers.
 */
export function calculateGradeFromMarks(marksObtained: number, maxMarks: number): GradeCalculationResult {
  if (maxMarks <= 0 || isNaN(maxMarks) || isNaN(marksObtained)) {
    return { percentage: 0, grade: 'F', gradePoints: 0.0, description: 'Fail' };
  }
  const clampedMarks = Math.min(maxMarks, Math.max(0, marksObtained));
  const rawPct = (clampedMarks / maxMarks) * 100;
  const percentage = Math.round((rawPct + Number.EPSILON) * 100) / 100;

  if (percentage >= 90.0) return { percentage, grade: 'O', gradePoints: 10.0, description: 'Outstanding' };
  if (percentage >= 80.0) return { percentage, grade: 'A+', gradePoints: 9.0, description: 'Excellent' };
  if (percentage >= 70.0) return { percentage, grade: 'A', gradePoints: 8.0, description: 'Very Good' };
  if (percentage >= 60.0) return { percentage, grade: 'B+', gradePoints: 7.0, description: 'Good' };
  if (percentage >= 50.0) return { percentage, grade: 'B', gradePoints: 6.0, description: 'Above Average' };
  if (percentage >= 40.0) return { percentage, grade: 'C', gradePoints: 5.0, description: 'Pass' };
  return { percentage, grade: 'F', gradePoints: 0.0, description: 'Fail' };
}
