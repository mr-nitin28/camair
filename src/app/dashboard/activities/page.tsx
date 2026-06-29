'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivitiesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/camai?chat=activities');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-slate-500 text-xs animate-pulse">Redirecting to CamAI activities...</p>
    </div>
  );
}
