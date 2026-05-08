import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardData, fetchWorkoutsData } from '../lib/api';

export function useDashboardData(date?: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashboardResponse, workoutsResponse] = await Promise.allSettled([
        fetchDashboardData(date),
        fetchWorkoutsData()
      ]);
      
      const mergedData: any = {};
      if (dashboardResponse.status === 'fulfilled') {
        mergedData.dashboard = dashboardResponse.value.data;
      }
      if (workoutsResponse.status === 'fulfilled') {
        mergedData.workouts = workoutsResponse.value.data;
      }
      setData(mergedData);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Simplify access for components that used data?.health directly
  const computedData = data ? { ...data.dashboard, workouts: data.workouts } : null;

  return { data: computedData, isLoading, error, refetch: loadData };
}
