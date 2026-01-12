import { create } from 'zustand';
import { DisciplinaryRecord, DisciplinaryType, DisciplinaryStatus } from '@/types/disciplinary';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync } from '@/lib/db-live';

interface DisciplinaryState {
  records: DisciplinaryRecord[];
  isLoaded: boolean;
  loadRecords: () => Promise<void>;
  addRecord: (record: Omit<DisciplinaryRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DisciplinaryRecord | null>;
  updateRecord: (id: string, data: Partial<DisciplinaryRecord>) => Promise<boolean>;
  deleteRecord: (id: string) => Promise<boolean>;
  getRecordsByEmployee: (employeeId: string) => DisciplinaryRecord[];
  getActiveRecordsByEmployee: (employeeId: string) => DisciplinaryRecord[];
  hasActiveProcess: (employeeId: string) => boolean;
}

const mapDbRowToRecord = (row: any): DisciplinaryRecord => ({
  id: row.id,
  employeeId: row.employee_id,
  type: row.type as DisciplinaryType,
  status: row.status as DisciplinaryStatus,
  date: row.date,
  description: row.description,
  duration: row.duration,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  resolution: row.resolution,
  resolutionDate: row.resolution_date,
});

const mapRecordToDbRow = (record: Partial<DisciplinaryRecord>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (record.id !== undefined) row.id = record.id;
  if (record.employeeId !== undefined) row.employee_id = record.employeeId;
  if (record.type !== undefined) row.type = record.type;
  if (record.status !== undefined) row.status = record.status;
  if (record.date !== undefined) row.date = record.date;
  if (record.description !== undefined) row.description = record.description;
  if (record.duration !== undefined) row.duration = record.duration;
  if (record.createdBy !== undefined) row.created_by = record.createdBy;
  if (record.resolution !== undefined) row.resolution = record.resolution;
  if (record.resolutionDate !== undefined) row.resolution_date = record.resolutionDate;
  return row;
};

const generateId = () => `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useDisciplinaryStore = create<DisciplinaryState>((set, get) => ({
  records: [],
  isLoaded: false,

  loadRecords: async () => {
    try {
      const rows = await liveGetAll<any>('disciplinary_records');
      const records = rows.map(mapDbRowToRecord);
      set({ records, isLoaded: true });
    } catch (error) {
      console.error('Failed to load disciplinary records:', error);
      set({ records: [], isLoaded: true });
    }
  },

  addRecord: async (recordData) => {
    const now = new Date().toISOString();
    const newRecord: DisciplinaryRecord = {
      ...recordData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    const dbRow = {
      ...mapRecordToDbRow(newRecord),
      created_at: now,
      updated_at: now,
    };

    const success = await liveInsert('disciplinary_records', dbRow);
    if (success) {
      set((state) => ({ records: [...state.records, newRecord] }));
      return newRecord;
    }
    return null;
  },

  updateRecord: async (id, data) => {
    const now = new Date().toISOString();
    const dbRow = {
      ...mapRecordToDbRow(data),
      updated_at: now,
    };

    const success = await liveUpdate('disciplinary_records', id, dbRow);
    if (success) {
      set((state) => ({
        records: state.records.map((r) =>
          r.id === id ? { ...r, ...data, updatedAt: now } : r
        ),
      }));
      return true;
    }
    return false;
  },

  deleteRecord: async (id) => {
    const success = await liveDelete('disciplinary_records', id);
    if (success) {
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
      }));
      return true;
    }
    return false;
  },

  getRecordsByEmployee: (employeeId) => {
    return get().records
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getActiveRecordsByEmployee: (employeeId) => {
    return get().records.filter(
      (r) => r.employeeId === employeeId && (r.status === 'pendente' || r.status === 'escalado')
    );
  },

  hasActiveProcess: (employeeId) => {
    return get().records.some(
      (r) =>
        r.employeeId === employeeId &&
        r.type === 'processo_disciplinar' &&
        (r.status === 'pendente' || r.status === 'escalado')
    );
  },
}));

// Real-time sync
export const initDisciplinaryStoreSync = () => {
  const unsubscribe = onTableSync('disciplinary_records', (_table: string, rows: any[]) => {
    const records = rows.map(mapDbRowToRecord);
    useDisciplinaryStore.setState({ records, isLoaded: true });
  });
  return unsubscribe;
};
