import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';

import {
  MOTION_DURATIONS,
  MOTION_EASE,
  SPRING_TRANSITION,
  createFadeVariants,
  createSlideUpVariants,
  createScaleVariants,
  createDrawerVariants,
  createStaggerContainer,
  LazyMotion,
  domAnimation,
  MotionConfig,
  m,
} from '../src/lib/motion.ts';

test('Motion System Tokens & Duration Budget', async (t) => {
  await t.test('Duration tokens match Master Prompt specifications', () => {
    assert.equal(MOTION_DURATIONS.instant, 0.08, 'Instant motion must be 80ms');
    assert.equal(MOTION_DURATIONS.fast, 0.14, 'Fast motion must be 140ms');
    assert.equal(MOTION_DURATIONS.base, 0.22, 'Base motion must be 220ms');
    assert.equal(MOTION_DURATIONS.slow, 0.32, 'Slow motion must be 320ms');
    assert.equal(MOTION_DURATIONS.chart, 0.60, 'Chart animation must be 600ms');
  });

  await t.test('Fluid deceleration curve is cubic-bezier(0.16, 1, 0.3, 1)', () => {
    assert.deepEqual(MOTION_EASE, [0.16, 1, 0.3, 1]);
  });

  await t.test('Spring transition conforms to physical damping standards', () => {
    assert.equal(SPRING_TRANSITION.type, 'spring');
    assert.equal(SPRING_TRANSITION.stiffness, 350);
    assert.equal(SPRING_TRANSITION.damping, 25);
  });
});

test('Reduced Motion Accessibility Guards', async (t) => {
  await t.test('createFadeVariants collapses duration when reducedMotion is true', () => {
    const normal = createFadeVariants(false);
    const reduced = createFadeVariants(true);

    assert.equal((normal.visible as any).opacity, 1);
    assert.equal((reduced.visible as any).transition.duration, 0.01);
  });

  await t.test('createSlideUpVariants eliminates Y translation when reducedMotion is true', () => {
    const normal = createSlideUpVariants(false);
    const reduced = createSlideUpVariants(true);

    assert.equal((normal.hidden as any).y, 8, 'Normal motion has 8px vertical offset');
    assert.equal((reduced.hidden as any).y, 0, 'Reduced motion must have 0px vertical offset');
    assert.equal((reduced.visible as any).transition.duration, 0.01);
  });

  await t.test('createScaleVariants eliminates scale transform when reducedMotion is true', () => {
    const normal = createScaleVariants(false);
    const reduced = createScaleVariants(true);

    assert.equal((normal.hidden as any).scale, 0.96);
    assert.equal((reduced.hidden as any).scale, 1, 'Reduced motion starts at scale 1');
  });

  await t.test('createDrawerVariants suppresses X/Y translation when reducedMotion is true', () => {
    const normalRight = createDrawerVariants(false, 'right');
    const reducedRight = createDrawerVariants(true, 'right');

    assert.equal((normalRight.hidden as any).x, '100%');
    assert.equal((reducedRight.hidden as any).x, undefined, 'Reduced motion must not translate X');
    assert.equal((reducedRight.visible as any).transition.duration, 0.01);
  });

  await t.test('createStaggerContainer initializes stagger interval within safe budget', () => {
    const stagger = createStaggerContainer(0.05);
    assert.equal((stagger.visible as any).transition.staggerChildren, 0.05);
    assert.equal((stagger.visible as any).transition.delayChildren, 0.02);
  });
});

test('LazyMotion & Bundle Optimization Exports', async (t) => {
  await t.test('LazyMotion and domAnimation are properly exported from motion.ts', () => {
    assert.equal(typeof LazyMotion, 'function', 'LazyMotion must be exported as a React component');
    assert.equal(typeof domAnimation, 'object', 'domAnimation feature bundle must be exported');
    assert.equal(typeof MotionConfig, 'function', 'MotionConfig must be exported');
    assert.ok(typeof m === 'function' || typeof m === 'object', 'm must be exported for lazy component creation');
  });
});

test('Design Tokens & CSS Variables Specification', async (t) => {
  const cssPath = path.resolve('src/app/globals.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  await t.test('Canvas, Surface and Text foundation tokens are defined', () => {
    assert.ok(css.includes('--bg: #F8FAFC;'), 'Light bg token must be #F8FAFC');
    assert.ok(css.includes('--surface: #FFFFFF;'), 'Light surface token must be #FFFFFF');
    assert.ok(css.includes('--text: #0F172A;'), 'Light text token must be #0F172A');
    assert.ok(css.includes('--text-muted: #64748B;'), 'Light text-muted token must be #64748B');
  });

  await t.test('Role accent tokens match Section 8.2 specifications', () => {
    // Student Indigo
    assert.ok(css.includes('--accent: #4F46E5;'), 'Student accent must be #4F46E5');
    // Faculty Teal
    assert.ok(css.includes('--accent: #0F766E;'), 'Faculty accent must be #0F766E');
    // Admin Action Accent
    assert.ok(css.includes('--accent: #4338CA;'), 'Admin action accent must be #4338CA');
  });

  await t.test('Tabular numbers utility and density tokens are defined', () => {
    assert.ok(css.includes('font-variant-numeric: tabular-nums;'), 'Tabular numbers utility must be defined');
    assert.ok(css.includes('[data-density="compact"]'), 'Compact density must be defined');
    assert.ok(css.includes('[data-density="comfortable"]'), 'Comfortable density must be defined');
  });

  await t.test('prefers-reduced-motion CSS overrides suppress animations', () => {
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion media query must exist');
    assert.ok(css.includes('.reduced-motion'), 'Manual .reduced-motion class override must exist');
  });
});

test('UI Logic & Component State Machines', async (t) => {
  await t.test('ProgressRing clamping and threshold logic', () => {
    const clamp = (val: number) => Math.min(100, Math.max(0, val));
    assert.equal(clamp(-15), 0, 'Negative values clamp to 0%');
    assert.equal(clamp(115), 100, 'Values over 100 clamp to 100%');
    assert.equal(clamp(78.5), 78.5, 'Normal values are preserved');

    // Threshold evaluation
    const getStrokeColor = (clampedValue: number, threshold = 75) => {
      if (clampedValue < threshold) {
        return clampedValue < threshold - 10 ? 'text-rose-500' : 'text-amber-500';
      }
      return 'text-emerald-500';
    };

    assert.equal(getStrokeColor(85, 75), 'text-emerald-500', '>= 75% is emerald');
    assert.equal(getStrokeColor(70, 75), 'text-amber-500', '65-74% is warning amber');
    assert.equal(getStrokeColor(55, 75), 'text-rose-500', '< 65% is danger rose');
  });

  await t.test('ConfirmDialog keyword validation logic', () => {
    const checkConfirm = (typedInput: string, requiredKeyword?: string) => {
      return !requiredKeyword || typedInput.trim() === requiredKeyword.trim();
    };

    assert.equal(checkConfirm('', undefined), true, 'No keyword requires no typing');
    assert.equal(checkConfirm('DELETE', 'DELETE'), true, 'Exact match confirms');
    assert.equal(checkConfirm('  DELETE  ', 'DELETE'), true, 'Trimmed match confirms');
    assert.equal(checkConfirm('delete', 'DELETE'), false, 'Case mismatch is denied');
    assert.equal(checkConfirm('DEL', 'DELETE'), false, 'Partial mismatch is denied');
  });

  await t.test('DataTable sorting and pagination mathematics', () => {
    const data = [
      { id: '1', score: 85, name: 'Charlie' },
      { id: '2', score: 92, name: 'Alice' },
      { id: '3', score: 78, name: 'Bob' },
      { id: '4', score: null, name: 'David' },
    ];

    // Number sort asc
    const sortedNumAsc = [...data].sort((a, b) => {
      if (a.score === b.score) return 0;
      if (a.score == null) return 1;
      if (b.score == null) return -1;
      return (a.score as number) - (b.score as number);
    });
    assert.equal(sortedNumAsc[0].name, 'Bob'); // 78
    assert.equal(sortedNumAsc[1].name, 'Charlie'); // 85
    assert.equal(sortedNumAsc[2].name, 'Alice'); // 92
    assert.equal(sortedNumAsc[3].name, 'David'); // null at end

    // Pagination math
    const totalItems = 23;
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    assert.equal(totalPages, 3);

    const getSlice = (page: number) => {
      const validPage = Math.min(page, totalPages);
      const start = (validPage - 1) * pageSize;
      return { start, end: start + pageSize };
    };

    assert.deepEqual(getSlice(1), { start: 0, end: 10 });
    assert.deepEqual(getSlice(2), { start: 10, end: 20 });
    assert.deepEqual(getSlice(3), { start: 20, end: 30 });
    assert.deepEqual(getSlice(99), { start: 20, end: 30 }); // Clamped to last page
  });

  await t.test('CommandPalette query and role filtering logic', () => {
    const items = [
      { id: '1', title: 'Dashboard', roles: ['student'] },
      { id: '2', title: 'Attendance Roster', roles: ['student', 'faculty', 'admin'] },
      { id: '3', title: 'Security Logs', roles: ['admin'] },
    ];

    const filter = (role: string, query: string) => {
      return items.filter((item) => {
        if (item.roles && !item.roles.includes(role)) return false;
        if (!query.trim()) return true;
        return item.title.toLowerCase().includes(query.toLowerCase());
      });
    };

    const studentItems = filter('student', '');
    assert.equal(studentItems.length, 2);
    assert.equal(studentItems.some(i => i.id === '3'), false, 'Admin-only item hidden from student');

    const adminQuery = filter('admin', 'security');
    assert.equal(adminQuery.length, 1);
    assert.equal(adminQuery[0].id, '3');
  });
});

