'use client';

import { useState, useEffect } from 'react';
import type { Transition, Variants } from 'framer-motion';
export { LazyMotion, domAnimation, MotionConfig, m } from 'framer-motion';

/**
 * CampusOS Motion System Tokens (Section 9.1 & 9.2)
 * Strictly animates transform and opacity for 60fps GPU performance.
 */
export const MOTION_DURATIONS = {
  instant: 0.08, // 80ms - toggles, tooltips, micro-interactions
  fast: 0.14,    // 140ms - dropdowns, badges, hover states
  base: 0.22,    // 220ms - cards, modest dialogs, accordion expands
  slow: 0.32,    // 320ms - full drawers, large modals, page crossfades
  chart: 0.60,   // 600ms - data visualization path draws
} as const;

export const MOTION_EASE = [0.16, 1, 0.3, 1] as const; // Fluid deceleration curve

export const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 25,
  mass: 0.8,
};

export const BASE_TRANSITION: Transition = {
  duration: MOTION_DURATIONS.base,
  ease: MOTION_EASE,
};

export const FAST_TRANSITION: Transition = {
  duration: MOTION_DURATIONS.fast,
  ease: MOTION_EASE,
};

export const INSTANT_TRANSITION: Transition = {
  duration: MOTION_DURATIONS.instant,
  ease: 'linear',
};

/**
 * Standard Accessible Motion Variants
 * When reduced motion is enabled, transforms are suppressed to eliminate vestibular discomfort.
 */
export const createFadeVariants = (reducedMotion = false): Variants => ({
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: reducedMotion ? { duration: 0.01 } : BASE_TRANSITION 
  },
  exit: { 
    opacity: 0, 
    transition: reducedMotion ? { duration: 0.01 } : FAST_TRANSITION 
  },
});

export const createSlideUpVariants = (reducedMotion = false): Variants => ({
  hidden: { 
    opacity: 0, 
    y: reducedMotion ? 0 : 8 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: reducedMotion ? { duration: 0.01 } : BASE_TRANSITION 
  },
  exit: { 
    opacity: 0, 
    y: reducedMotion ? 0 : 4, 
    transition: reducedMotion ? { duration: 0.01 } : FAST_TRANSITION 
  },
});

export const createScaleVariants = (reducedMotion = false): Variants => ({
  hidden: { 
    opacity: 0, 
    scale: reducedMotion ? 1 : 0.96 
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: reducedMotion ? { duration: 0.01 } : SPRING_TRANSITION 
  },
  exit: { 
    opacity: 0, 
    scale: reducedMotion ? 1 : 0.97, 
    transition: reducedMotion ? { duration: 0.01 } : FAST_TRANSITION 
  },
});

export const createDrawerVariants = (reducedMotion = false, side: 'right' | 'left' | 'bottom' = 'right'): Variants => {
  const getOffset = () => {
    if (reducedMotion) return {};
    if (side === 'right') return { x: '100%' };
    if (side === 'left') return { x: '-100%' };
    return { y: '100%' };
  };

  const getReset = () => {
    if (reducedMotion) return {};
    if (side === 'bottom') return { y: 0 };
    return { x: 0 };
  };

  return {
    hidden: { 
      opacity: reducedMotion ? 0 : 1, 
      ...getOffset() 
    },
    visible: { 
      opacity: 1, 
      ...getReset(), 
      transition: reducedMotion 
        ? { duration: 0.01 } 
        : { duration: MOTION_DURATIONS.slow, ease: MOTION_EASE } 
    },
    exit: { 
      opacity: reducedMotion ? 0 : 1, 
      ...getOffset(), 
      transition: reducedMotion 
        ? { duration: 0.01 } 
        : { duration: MOTION_DURATIONS.fast, ease: MOTION_EASE } 
    },
  };
};

export const createStaggerContainer = (staggerChildren = 0.05): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren: 0.02,
    },
  },
});

/**
 * Hook to read prefers-reduced-motion media query and optional application-level override
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const checkPreference = () => {
      // Check document root class as well (.reduced-motion override)
      const hasClassOverride = document.documentElement.classList.contains('reduced-motion');
      setPrefersReduced(mediaQuery.matches || hasClassOverride);
    };

    checkPreference();
    mediaQuery.addEventListener('change', checkPreference);

    // Observer for DOM class attribute changes (user manual toggle)
    const observer = new MutationObserver(checkPreference);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mediaQuery.removeEventListener('change', checkPreference);
      observer.disconnect();
    };
  }, []);

  return prefersReduced;
}
