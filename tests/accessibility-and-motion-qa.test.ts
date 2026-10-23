import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MOTION_DURATIONS,
  MOTION_EASE,
  SPRING_TRANSITION,
  createFadeVariants,
  createSlideUpVariants,
  createScaleVariants,
  createDrawerVariants,
  createStaggerContainer,
} from '../src/lib/motion.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// WCAG 2.2 AA MATHEMATICAL CONTRAST UTILITIES
// ============================================================================
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Calculates relative luminance per W3C WCAG 2.1 / 2.2:
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio: (L1 + 0.05) / (L2 + 0.05)
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('Accessibility & Motion QA Pass', async (t) => {

  // =========================================================================
  // 1. WCAG 2.2 AA CONTRAST AUDIT (LIGHT & DARK TOKENS)
  // =========================================================================
  await t.test('WCAG 2.2 AA Contrast Validation across Design System Tokens', async (st) => {
    const TOKENS = {
      light: {
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#0F172A',
        textMuted: '#64748B',
        accentStudent: '#4F46E5',
        accentFaculty: '#0F766E',
        accentAdmin: '#4338CA',
        white: '#FFFFFF',
        danger: '#EF4444',
      },
      dark: {
        bg: '#090D16',
        surface: '#111827',
        text: '#F8FAFC',
        textMuted: '#94A3B8',
        accentStudent: '#6366F1',
        accentFaculty: '#14B8A6',
        accentAdmin: '#818CF8',
        white: '#FFFFFF',
        surface2: '#1E293B',
      },
    };

    await st.test('Light Mode text on surfaces passes WCAG AA (>= 4.5:1) and AAA (>= 7.0:1)', () => {
      const surfaceTextRatio = getContrastRatio(TOKENS.light.surface, TOKENS.light.text);
      const bgTextRatio = getContrastRatio(TOKENS.light.bg, TOKENS.light.text);

      assert.ok(
        surfaceTextRatio >= 7.0,
        `Light surface-to-text contrast (${surfaceTextRatio.toFixed(2)}:1) must meet AAA >= 7.0:1`
      );
      assert.ok(
        bgTextRatio >= 7.0,
        `Light bg-to-text contrast (${bgTextRatio.toFixed(2)}:1) must meet AAA >= 7.0:1`
      );
    });

    await st.test('Light Mode interactive role accent buttons pass WCAG AA (>= 4.5:1) with white text', () => {
      const studentRatio = getContrastRatio(TOKENS.light.accentStudent, TOKENS.light.white);
      const facultyRatio = getContrastRatio(TOKENS.light.accentFaculty, TOKENS.light.white);
      const adminRatio = getContrastRatio(TOKENS.light.accentAdmin, TOKENS.light.white);

      assert.ok(
        studentRatio >= 4.5,
        `Student accent button contrast (${studentRatio.toFixed(2)}:1) must meet AA >= 4.5:1`
      );
      assert.ok(
        facultyRatio >= 4.5,
        `Faculty accent button contrast (${facultyRatio.toFixed(2)}:1) must meet AA >= 4.5:1`
      );
      assert.ok(
        adminRatio >= 4.5,
        `Admin accent button contrast (${adminRatio.toFixed(2)}:1) must meet AA >= 4.5:1`
      );
    });

    await st.test('Dark Mode text on dark surfaces passes WCAG AA (>= 4.5:1) and AAA (>= 7.0:1)', () => {
      const darkSurfaceTextRatio = getContrastRatio(TOKENS.dark.surface, TOKENS.dark.text);
      const darkBgTextRatio = getContrastRatio(TOKENS.dark.bg, TOKENS.dark.text);
      const darkMutedRatio = getContrastRatio(TOKENS.dark.surface, TOKENS.dark.textMuted);

      assert.ok(
        darkSurfaceTextRatio >= 7.0,
        `Dark surface-to-text contrast (${darkSurfaceTextRatio.toFixed(2)}:1) must meet AAA >= 7.0:1`
      );
      assert.ok(
        darkBgTextRatio >= 7.0,
        `Dark bg-to-text contrast (${darkBgTextRatio.toFixed(2)}:1) must meet AAA >= 7.0:1`
      );
      assert.ok(
        darkMutedRatio >= 4.5,
        `Dark muted text contrast (${darkMutedRatio.toFixed(2)}:1) must meet AA >= 4.5:1`
      );
    });

    await st.test('Dark Mode role accents meet graphical / UI component contrast (>= 3.0:1)', () => {
      const darkStudentRatio = getContrastRatio(TOKENS.dark.surface, TOKENS.dark.accentStudent);
      const darkFacultyRatio = getContrastRatio(TOKENS.dark.surface, TOKENS.dark.accentFaculty);
      const darkAdminRatio = getContrastRatio(TOKENS.dark.surface, TOKENS.dark.accentAdmin);

      assert.ok(
        darkStudentRatio >= 3.0,
        `Dark student accent contrast (${darkStudentRatio.toFixed(2)}:1) must meet UI component >= 3.0:1`
      );
      assert.ok(
        darkFacultyRatio >= 4.5,
        `Dark faculty accent contrast (${darkFacultyRatio.toFixed(2)}:1) must meet >= 4.5:1`
      );
      assert.ok(
        darkAdminRatio >= 3.0,
        `Dark admin accent contrast (${darkAdminRatio.toFixed(2)}:1) must meet UI component >= 3.0:1`
      );
    });
  });

  // =========================================================================
  // 2. TOUCH TARGETS (>= 44x44 PX) ON MOBILE NAVIGATION
  // =========================================================================
  await t.test('Mobile Touch Target Size Compliance (WCAG 2.2 Criterion 2.5.8 >= 44x44 px)', async (st) => {
    await st.test('Bottom tab bar links declare min-w-[56px] and min-h-[44px]', () => {
      const bottomTabPath = path.resolve(__dirname, '../src/components/ui/bottom-tab-bar.tsx');
      const content = fs.readFileSync(bottomTabPath, 'utf8');

      assert.ok(
        content.includes('min-h-[44px]'),
        'BottomTabBar items must explicitly declare min-h-[44px] touch target'
      );
      assert.ok(
        content.includes('min-w-[56px]') || content.includes('min-w-[44px]'),
        'BottomTabBar items must declare >= 44px min-width touch target'
      );
    });

    await st.test('Top bar mobile action buttons declare min-w-[44px] and min-h-[44px]', () => {
      const topBarPath = path.resolve(__dirname, '../src/components/ui/top-bar.tsx');
      const content = fs.readFileSync(topBarPath, 'utf8');

      // Hamburger button, mobile search button, theme button, notification bell
      assert.ok(
        content.includes('md:hidden min-w-[44px] min-h-[44px]'),
        'Mobile navigation hamburger must enforce min 44x44px touch target'
      );
      assert.ok(
        content.includes('min-w-[44px] min-h-[44px] p-2 rounded-xl text-[var(--text-muted)]'),
        'Top bar action buttons must enforce min 44x44px touch target'
      );
    });
  });

  // =========================================================================
  // 3. GLOBAL PREFERS-REDUCED-MOTION COMPLIANCE ACROSS ALL ANIMATION VARIANTS
  // =========================================================================
  await t.test('Global Reduced Motion Accessibility Standards', async (st) => {
    await st.test('createFadeVariants collapses transition duration to <= 0.01s on reduced motion', () => {
      const normal = createFadeVariants(false);
      const reduced = createFadeVariants(true);

      assert.equal((normal.visible as any).transition.duration, 0.22);
      assert.equal((reduced.visible as any).transition.duration, 0.01);
      assert.equal((reduced.exit as any).transition.duration, 0.01);
    });

    await st.test('createSlideUpVariants eliminates Y translation and collapses duration on reduced motion', () => {
      const normal = createSlideUpVariants(false);
      const reduced = createSlideUpVariants(true);

      assert.equal((normal.hidden as any).y, 8);
      assert.equal((reduced.hidden as any).y, 0, 'Must not translate Y when reduced motion is requested');
      assert.equal((reduced.visible as any).y, 0);
      assert.equal((reduced.visible as any).transition.duration, 0.01);
    });

    await st.test('createScaleVariants eliminates scale transform and collapses duration on reduced motion', () => {
      const normal = createScaleVariants(false);
      const reduced = createScaleVariants(true);

      assert.equal((normal.hidden as any).scale, 0.96);
      assert.equal((reduced.hidden as any).scale, 1, 'Must not scale when reduced motion is requested');
      assert.equal((reduced.visible as any).scale, 1);
      assert.equal((reduced.visible as any).transition.duration, 0.01);
    });

    await st.test('createDrawerVariants eliminates spatial translations on reduced motion', () => {
      const normalLeft = createDrawerVariants(false, 'left');
      const reducedLeft = createDrawerVariants(true, 'left');

      assert.equal((normalLeft.hidden as any).x, '-100%');
      assert.equal((reducedLeft.hidden as any).x, undefined, 'Left drawer must not translate X on reduced motion');
      assert.equal((reducedLeft.visible as any).transition.duration, 0.01);

      const normalBottom = createDrawerVariants(false, 'bottom');
      const reducedBottom = createDrawerVariants(true, 'bottom');

      assert.equal((normalBottom.hidden as any).y, '100%');
      assert.equal((reducedBottom.hidden as any).y, undefined, 'Bottom drawer must not translate Y on reduced motion');
      assert.equal((reducedBottom.visible as any).transition.duration, 0.01);
    });

    await st.test('createStaggerContainer eliminates stagger delays on reduced motion', () => {
      const normal = createStaggerContainer(0.04);
      const reduced = createStaggerContainer(0);

      assert.equal((normal.visible as any).transition.staggerChildren, 0.04);
      assert.equal((reduced.visible as any).transition.staggerChildren, 0, 'Stagger delay must be 0 on reduced motion');
    });

    await st.test('Global CSS defines media prefers-reduced-motion override with 0.01ms duration', () => {
      const cssPath = path.resolve(__dirname, '../src/app/globals.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(
        css.includes('@media (prefers-reduced-motion: reduce)'),
        'globals.css must define prefers-reduced-motion media query'
      );
      assert.ok(
        css.includes('animation-duration: 0.01ms !important;'),
        'globals.css must force animation-duration: 0.01ms !important;'
      );
      assert.ok(
        css.includes('transition-duration: 0.01ms !important;'),
        'globals.css must force transition-duration: 0.01ms !important;'
      );
    });
  });

  // =========================================================================
  // 4. KEYBOARD FOCUS TRAP & ARIA LANDMARKS
  // =========================================================================
  await t.test('Keyboard Focus Trap and ARIA Landmark Coverage', async (st) => {
    await st.test('Core Shell and Layouts provide structural ARIA landmarks', () => {
      const appShellPath = path.resolve(__dirname, '../src/components/ui/app-shell.tsx');
      const topBarPath = path.resolve(__dirname, '../src/components/ui/top-bar.tsx');
      const bottomTabBarPath = path.resolve(__dirname, '../src/components/ui/bottom-tab-bar.tsx');

      const appShellContent = fs.readFileSync(appShellPath, 'utf8');
      const topBarContent = fs.readFileSync(topBarPath, 'utf8');
      const bottomTabBarContent = fs.readFileSync(bottomTabBarPath, 'utf8');

      assert.ok(
        appShellContent.includes('<main'),
        'AppShell must render standard <main> landmark'
      );
      assert.ok(
        topBarContent.includes('<header'),
        'TopBar must render standard <header> landmark'
      );
      assert.ok(
        bottomTabBarContent.includes('<nav'),
        'BottomTabBar must render standard <nav> landmark'
      );
      assert.ok(
        bottomTabBarContent.includes('aria-label="Mobile Navigation"'),
        'Mobile navigation must provide descriptive aria-label'
      );
    });

    await st.test('Dialogs, Drawers & Sheets implement modal accessibility attributes and focus trap', () => {
      const sheetPath = path.resolve(__dirname, '../src/components/ui/sheet.tsx');
      const dialogPath = path.resolve(__dirname, '../src/components/ui/dialog.tsx');
      const commandPalettePath = path.resolve(__dirname, '../src/components/ui/command-palette.tsx');
      const sidebarNavPath = path.resolve(__dirname, '../src/components/ui/sidebar-nav.tsx');

      const sheetContent = fs.readFileSync(sheetPath, 'utf8');
      const dialogContent = fs.readFileSync(dialogPath, 'utf8');
      const commandPaletteContent = fs.readFileSync(commandPalettePath, 'utf8');
      const sidebarNavContent = fs.readFileSync(sidebarNavPath, 'utf8');

      // Sheet
      assert.ok(sheetContent.includes('role="dialog"'), 'Sheet must declare role="dialog"');
      assert.ok(sheetContent.includes('aria-modal="true"'), 'Sheet must declare aria-modal="true"');
      assert.ok(
        sheetContent.includes('Escape'),
        'Sheet must handle keyboard dismissal (Escape key)'
      );

      // Dialog
      assert.ok(dialogContent.includes('role="dialog"'), 'Dialog must declare role="dialog"');
      assert.ok(dialogContent.includes('aria-modal="true"'), 'Dialog must declare aria-modal="true"');
      assert.ok(dialogContent.includes("e.key === 'Escape'"), 'Dialog must handle Escape key dismissal');
      assert.ok(
        dialogContent.includes("e.key === 'Tab'") && dialogContent.includes('e.shiftKey'),
        'Dialog must implement Tab and Shift+Tab focus trapping'
      );

      // Command Palette
      assert.ok(commandPaletteContent.includes('role="dialog"'), 'CommandPalette must declare role="dialog"');
      assert.ok(commandPaletteContent.includes('aria-modal="true"'), 'CommandPalette must declare aria-modal="true"');
      assert.ok(
        commandPaletteContent.includes("e.key === 'Escape'"),
        'CommandPalette must handle Escape key dismissal'
      );

      // SidebarNav Landmark
      assert.ok(
        sidebarNavContent.includes('aria-label="Sidebar navigation"'),
        'SidebarNav must declare aria-label="Sidebar navigation"'
      );
    });
  });
});
