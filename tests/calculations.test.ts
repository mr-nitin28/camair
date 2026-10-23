import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { calculateSGPA, calculateCGPA } from '../src/lib/calculations/academic.ts';
import { calculateAttendanceMetrics, type AttendanceRecordStatus } from '../src/lib/calculations/attendance.ts';
import { calculateFeeBalance } from '../src/lib/calculations/finance.ts';

test('Calculations: Academic SGPA & CGPA', async (t) => {
  await t.test('SGPA returns 0.00 for empty or zero credit input', () => {
    assert.equal(calculateSGPA([]), 0.00);
    assert.equal(calculateSGPA([{ credits: 0, gradePoints: 9.0 }]), 0.00);
  });

  await t.test('SGPA handles standard UGC course list', () => {
    const courses = [
      { credits: 4, gradePoints: 9.0 }, // 36
      { credits: 4, gradePoints: 8.0 }, // 32
      { credits: 3, gradePoints: 10.0 }, // 30
      { credits: 3, gradePoints: 7.0 }, // 21
    ];
    // Total credits = 14, Total points = 119 -> 119 / 14 = 8.5
    assert.equal(calculateSGPA(courses), 8.50);
  });

  await t.test('Property Test: SGPA is always bounded within [0, 10]', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            credits: fc.integer({ min: 1, max: 6 }),
            gradePoints: fc.float({ min: 0, max: 10, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (courses) => {
          const sgpa = calculateSGPA(courses);
          return sgpa >= 0.00 && sgpa <= 10.00;
        }
      ),
      { numRuns: 500 }
    );
  });

  await t.test('Property Test: CGPA across semesters is strictly bounded', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            credits: fc.integer({ min: 15, max: 28 }),
            sgpa: fc.float({ min: 0, max: 10, noNaN: true }),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (semesters) => {
          const cgpa = calculateCGPA(semesters);
          return cgpa >= 0.00 && cgpa <= 10.00;
        }
      ),
      { numRuns: 500 }
    );
  });
});

test('Calculations: Attendance Engine', async (t) => {
  await t.test('Returns 0% for empty session list', () => {
    const res = calculateAttendanceMetrics([]);
    assert.equal(res.percentage, 0.00);
    assert.equal(res.totalSessions, 0);
    assert.equal(res.isShortage, false);
  });

  await t.test('Computes 100% when all present or excused', () => {
    const records = [
      { status: 'Present' as const },
      { status: 'Late' as const },
      { status: 'Excused' as const },
    ];
    const res = calculateAttendanceMetrics(records, 75);
    assert.equal(res.percentage, 100.00);
    assert.equal(res.isShortage, false);
    assert.equal(res.classesAllowedToMiss, 1);
  });

  await t.test('Calculates shortage and recovery classes correctly', () => {
    // 6 present, 4 absent = 60%, threshold 75%
    // To reach 75%: (6 + x) / (10 + x) >= 0.75 -> 6 + x >= 7.5 + 0.75x -> 0.25x >= 1.5 -> x >= 6
    const records = [
      ...Array(6).fill({ status: 'Present' as const }),
      ...Array(4).fill({ status: 'Absent' as const }),
    ];
    const res = calculateAttendanceMetrics(records, 75);
    assert.equal(res.percentage, 60.00);
    assert.equal(res.isShortage, true);
    assert.equal(res.classesNeededToRecover, 6);
  });

  await t.test('Property Test: Attendance percentage is always in [0.00, 100.00]', () => {
    const statusArb = fc.constantFrom<AttendanceRecordStatus>('Present', 'Absent', 'Late', 'Excused');
    fc.assert(
      fc.property(
        fc.array(fc.record({ status: statusArb }), { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 50, max: 90 }),
        (records, threshold) => {
          const res = calculateAttendanceMetrics(records, threshold);
          return (
            res.percentage >= 0.00 &&
            res.percentage <= 100.00 &&
            res.totalSessions === res.attendedSessions + res.absentSessions &&
            (res.isShortage ? res.classesNeededToRecover >= 0 : res.classesAllowedToMiss >= 0)
          );
        }
      ),
      { numRuns: 500 }
    );
  });
});

test('Calculations: Financial Engine (Minor Units)', async (t) => {
  await t.test('Exact fee balance with concessions and verified payments', () => {
    const assigned = 7500000; // 75,000 INR
    const concession = 500000; // 5,000 INR
    const payments = [
      { amountMinorUnits: 3000000, status: 'verified' as const }, // 30,000 INR
      { amountMinorUnits: 1000000, status: 'initiated' as const }, // 10,000 INR (pending)
      { amountMinorUnits: 2000000, status: 'failed' as const }, // Failed
    ];
    const res = calculateFeeBalance(assigned, concession, payments);
    // Net payable: 70,000 INR (7000000 paise)
    // Verified: 30,000 INR (3000000 paise)
    // Outstanding: 40,000 INR (4000000 paise)
    assert.equal(res.netPayableMinorUnits, 7000000);
    assert.equal(res.verifiedPaidMinorUnits, 3000000);
    assert.equal(res.pendingVerificationMinorUnits, 1000000);
    assert.equal(res.outstandingBalanceMinorUnits, 4000000);
    assert.equal(res.isFullyPaid, false);
  });

  await t.test('Property Test: Financial balance conservation invariant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 100000000 }), // Assigned: 100 to 1,000,000 INR
        fc.integer({ min: 0, max: 50000 }),         // Concession
        fc.array(
          fc.record({
            amountMinorUnits: fc.integer({ min: 1000, max: 5000000 }),
            status: fc.constantFrom('verified' as const, 'initiated' as const, 'failed' as const, 'refunded' as const),
          }),
          { maxLength: 10 }
        ),
        (assigned, concession, payments) => {
          const res = calculateFeeBalance(assigned, concession, payments);
          const expectedNet = Math.max(0, assigned - concession);
          const expectedVerified = payments
            .filter((p) => p.status === 'verified')
            .reduce((sum, p) => sum + p.amountMinorUnits, 0);

          return (
            res.outstandingBalanceMinorUnits >= 0 &&
            res.netPayableMinorUnits === expectedNet &&
            res.verifiedPaidMinorUnits === expectedVerified &&
            (expectedVerified >= expectedNet ? res.isFullyPaid : !res.isFullyPaid)
          );
        }
      ),
      { numRuns: 500 }
    );
  });
});
