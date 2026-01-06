/**
 * Audit Store - Enterprise audit trail for PayrollAO
 * 
 * Tracks all changes for compliance, HR decisions, and dispute resolution
 */

import { create } from 'zustand';
import type { AuditLogEntry, AuditAction } from '@/types/audit';
import { liveGetAll, liveInsert, onTableSync, onDataChange } from '@/lib/db-live';

interface AuditState {
  logs: AuditLogEntry[];
  isLoaded: boolean;
  
  loadAuditLogs: () => Promise<void>;
  
  // Log an action
  logAction: (params: {
    action: AuditAction;
    entityType: AuditLogEntry['entityType'];
    entityId: string;
    periodId?: string;
    employeeId?: string;
    previousValue?: any;
    newValue?: any;
    description: string;
    correctionReason?: string;
    correctionReference?: string;
  }) => Promise<void>;
  
  // Query logs
  getLogsForPeriod: (periodId: string) => AuditLogEntry[];
  getLogsForEmployee: (employeeId: string) => AuditLogEntry[];
  getRecentLogs: (limit?: number) => AuditLogEntry[];
}

function mapDbRowToAuditLog(row: any): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp || row.created_at,
    action: row.action,
    userId: row.user_id,
    userName: row.user_name,
    entityType: row.entity_type,
    entityId: row.entity_id,
    periodId: row.period_id,
    employeeId: row.employee_id,
    previousValue: row.previous_value,
    newValue: row.new_value,
    description: row.description,
    correctionReason: row.correction_reason,
    correctionReference: row.correction_reference,
  };
}

function generateId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useAuditStore = create<AuditState>()((set, get) => ({
  logs: [],
  isLoaded: false,
  
  loadAuditLogs: async () => {
    try {
      const rows = await liveGetAll<any>('audit_logs');
      const logs = rows.map(mapDbRowToAuditLog);
      // Sort by timestamp descending (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      set({ logs, isLoaded: true });
      console.log('[Audit] Loaded', logs.length, 'audit logs');
    } catch (error) {
      console.error('[Audit] Error loading logs:', error);
      set({ isLoaded: true });
    }
  },
  
  logAction: async (params) => {
    const now = new Date().toISOString();
    const id = generateId();
    
    const log: AuditLogEntry = {
      id,
      timestamp: now,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      periodId: params.periodId,
      employeeId: params.employeeId,
      previousValue: params.previousValue ? JSON.stringify(params.previousValue) : undefined,
      newValue: params.newValue ? JSON.stringify(params.newValue) : undefined,
      description: params.description,
      correctionReason: params.correctionReason,
      correctionReference: params.correctionReference,
    };
    
    // Insert into DB
    await liveInsert('audit_logs', {
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      user_id: log.userId,
      user_name: log.userName,
      entity_type: log.entityType,
      entity_id: log.entityId,
      period_id: log.periodId,
      employee_id: log.employeeId,
      previous_value: log.previousValue,
      new_value: log.newValue,
      description: log.description,
      correction_reason: log.correctionReason,
      correction_reference: log.correctionReference,
      created_at: now,
    });
    
    // Update local state
    set(state => ({
      logs: [log, ...state.logs]
    }));
    
    console.log('[Audit]', log.action, '-', log.description);
  },
  
  getLogsForPeriod: (periodId) => {
    return get().logs.filter(l => l.periodId === periodId);
  },
  
  getLogsForEmployee: (employeeId) => {
    return get().logs.filter(l => l.employeeId === employeeId);
  },
  
  getRecentLogs: (limit = 50) => {
    return get().logs.slice(0, limit);
  },
}));

// Real-time sync
let unsubscribe: (() => void) | null = null;

export function initAuditStoreSync() {
  if (unsubscribe) return;
  
  const unsubSync = onTableSync('audit_logs', (table, rows) => {
    console.log('[Audit] ← PUSH:', rows.length, 'logs');
    const logs = rows.map(mapDbRowToAuditLog);
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    useAuditStore.setState({ logs, isLoaded: true });
  });
  
  const unsubLegacy = onDataChange((table) => {
    if (table === 'audit_logs') {
      useAuditStore.getState().loadAuditLogs();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupAuditStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
