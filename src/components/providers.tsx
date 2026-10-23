'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, domAnimation } from 'framer-motion';
import { ToastProvider } from '@/components/ui/toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
            refetchOnWindowFocus: false, // Prevent focus refetching to reduce API noise
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LazyMotion>
    </QueryClientProvider>
  );
}
