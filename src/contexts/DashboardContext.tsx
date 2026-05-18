import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { ServerColdStartConsole } from '../components/ui/ServerColdStartConsole';

type DashboardContextType = {
  data: any;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children, date }: { children: ReactNode; date?: string }) {
  const dashboardState = useDashboardData(date);

  return (
    <DashboardContext.Provider value={dashboardState}>
      {children}
      <ServerColdStartConsole 
        isLoading={dashboardState.isLoading} 
        error={dashboardState.error} 
        refetch={dashboardState.refetch} 
      />
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

