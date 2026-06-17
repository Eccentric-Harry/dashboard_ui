/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { FocusSession } from '../lib/api';
import {
  fetchCurrentSession,
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  cancelFocusSession,
  completeFocusSession,
} from '../lib/api';

type FocusContextType = {
  session: FocusSession | null;
  remainingSeconds: number;
  isFetching: boolean;
  isFocusMode: boolean;
  setFocusMode: (open: boolean) => void;
  start: (pursuit: string, duration: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
};

const FocusContext = createContext<FocusContextType | undefined>(undefined);

function calcRemaining(session: FocusSession): number {
  if (session.status === 'RUNNING' && session.endTime) {
    return Math.max(0, new Date(session.endTime).getTime() - Date.now());
  }
  if (session.status === 'PAUSED' && session.remainingSecondsOnPause != null) {
    return session.remainingSecondsOnPause * 1000;
  }
  return 0;
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [isFocusMode, setFocusMode] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    try {
      setIsFetching(true);
      const res = await fetchCurrentSession();
      setSession(res.data);
    } catch {
      setSession(null);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemainingSeconds(0);
      return;
    }

    if (session.status === 'RUNNING' && session.endTime) {
      const initial = calcRemaining(session);
      setRemainingSeconds(initial);

      if (initial <= 0) {
        completeFocusSession().then(() => {
          setSession(prev => prev ? { ...prev, status: 'COMPLETED', endTime: undefined } : null);
        }).catch(() => {});
        return;
      }

      const end = new Date(session.endTime).getTime();
      tickRef.current = setInterval(() => {
        const remaining = Math.max(0, end - Date.now());
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          clearInterval(tickRef.current);
          completeFocusSession().then(() => {
            setSession(prev => prev ? { ...prev, status: 'COMPLETED', endTime: undefined } : null);
          }).catch(() => {});
        }
      }, 200);

      return () => clearInterval(tickRef.current);
    }

    if (session.status === 'PAUSED') {
      setRemainingSeconds(calcRemaining(session));
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
     
    };
  }, [session, session?.id, session?.status, session?.endTime, session?.remainingSecondsOnPause]);

  const start = useCallback(async (pursuit: string, duration: number) => {
    const res = await startFocusSession(pursuit, duration);
    setSession(res.data);
    setRemainingSeconds(duration * 60 * 1000);
  }, []);

  const pause = useCallback(async () => {
    const res = await pauseFocusSession();
    setSession(res.data);
  }, []);

  const resume = useCallback(async () => {
    const res = await resumeFocusSession();
    setSession(res.data);
  }, []);

  const cancel = useCallback(async () => {
    await cancelFocusSession();
    setSession(null);
    setRemainingSeconds(0);
  }, []);

  return (
    <FocusContext.Provider
      value={{
        session,
        remainingSeconds,
        isFetching,
        isFocusMode,
        setFocusMode,
        start,
        pause,
        resume,
        cancel,
        refresh,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}
