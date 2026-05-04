import { useState, useEffect } from 'react';
import { fetchDashboardData, fetchWorkoutsData } from '../lib/api';

export function useDashboardData(date?: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        const [dashboardResponse, workoutsResponse] = await Promise.allSettled([
          fetchDashboardData(date),
          fetchWorkoutsData()
        ]);
        
        if (isMounted) {
          const mergedData: any = {};
          if (dashboardResponse.status === 'fulfilled') {
            mergedData.dashboard = dashboardResponse.value.data;
          }
          if (workoutsResponse.status === 'fulfilled') {
            mergedData.workouts = workoutsResponse.value.data;
          }
          setData(mergedData);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [date]);

  // Simplify access for components that used data?.health directly
  const computedData = data ? { ...data.dashboard, workouts: data.workouts } : null;

  return { data: computedData, isLoading, error };
}
