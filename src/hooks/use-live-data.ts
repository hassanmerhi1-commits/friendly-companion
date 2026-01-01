/**
 * React hooks for live database access
 * 
 * These hooks automatically refresh data when changes are detected
 * from other clients on the network.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { liveGetAll, liveQuery, onDataChange } from '@/lib/db-live';

/**
 * Hook to get live data from a table
 * Automatically refreshes when data changes are detected
 */
export function useLiveTable<T>(
  table: string,
  mapper: (row: any) => T,
  dependencies: any[] = []
): {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await liveGetAll<any>(table);
      if (mountedRef.current) {
        setData(rows.map(mapper));
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [table, mapper, ...dependencies]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Subscribe to data changes
  useEffect(() => {
    const unsubscribe = onDataChange((changedTable) => {
      if (changedTable === table) {
        refresh();
      }
    });
    return unsubscribe;
  }, [table, refresh]);

  return { data, loading, error, refresh };
}

/**
 * Hook to run a live SQL query
 * Automatically refreshes when relevant tables change
 */
export function useLiveQuery<T>(
  sql: string,
  params: any[],
  tables: string[],
  mapper: (row: any) => T,
  dependencies: any[] = []
): {
  data: T[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await liveQuery<any>(sql, params);
      if (mountedRef.current) {
        setData(rows.map(mapper));
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [sql, JSON.stringify(params), mapper, ...dependencies]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Subscribe to data changes for all relevant tables
  useEffect(() => {
    const unsubscribe = onDataChange((changedTable) => {
      if (tables.includes(changedTable)) {
        refresh();
      }
    });
    return unsubscribe;
  }, [tables.join(','), refresh]);

  return { data, loading, error, refresh };
}

/**
 * Hook to trigger a refresh on specific tables
 */
export function useRefreshTrigger(tables: string[]): {
  refreshKey: number;
} {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = onDataChange((changedTable) => {
      if (tables.includes(changedTable)) {
        setRefreshKey(k => k + 1);
      }
    });
    return unsubscribe;
  }, [tables.join(',')]);

  return { refreshKey };
}
