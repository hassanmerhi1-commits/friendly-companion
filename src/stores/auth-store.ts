import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, initSyncListener } from '@/lib/db-live';
import {
  type Permission,
  type UserRole,
  rolePermissions,
  roleLabels,
  expandLegacyPermissions,
} from '@/lib/permissions-catalog';

export type { Permission, UserRole };
export { rolePermissions, roleLabels };

function normalizeUserRole(role: unknown): UserRole {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return normalizedRole in rolePermissions ? (normalizedRole as UserRole) : 'viewer';
}

function resolveUserPermissions(user: Pick<AppUser, 'role' | 'customPermissions'> | null | undefined): Permission[] {
  if (!user) return [];

  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return expandLegacyPermissions(user.customPermissions as Permission[]);
  }

  return rolePermissions[normalizeUserRole(user.role)] || [];
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  branchId?: string;
  customPermissions?: Permission[];
  isActive: boolean;
  createdAt: string;
}

const SESSION_KEY = 'payroll_session';

interface SavedSession {
  userId: string;
  companyId?: string;
  timestamp: number;
}

function saveSession(userId: string) {
  const session: SavedSession = {
    userId,
    companyId: localStorage.getItem('payroll_last_company_id') || undefined,
    timestamp: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedSession;
  } catch {
    return null;
  }
}

interface AuthState {
  users: AppUser[];
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoaded: boolean;
  
  // Auth actions
  loadUsers: () => Promise<void>;
  login: (username: string, password: string, rememberMe?: boolean) => { success: boolean; error?: string };
  logout: () => void;
  restoreSession: () => boolean;
  
  // Permission check
  hasPermission: (permission: Permission) => boolean;
  getUserPermissions: (userId?: string) => Permission[];
  
  // User management (admin only)
  addUser: (data: Omit<AppUser, 'id' | 'createdAt'>) => Promise<{ success: boolean; user?: AppUser; error?: string }>;
  updateUser: (id: string, data: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
  getUsers: () => AppUser[];
  isUsernameTaken: (username: string, excludeId?: string) => boolean;
}


// Default admin user
const defaultAdmin: AppUser = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin',
  name: 'Administrador',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
};

// Map database row to AppUser
function mapDbRowToUser(row: any): AppUser {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name || '',
    role: normalizeUserRole(row.role),
    branchId: row.branch_id || undefined,
    customPermissions: row.custom_permissions ? JSON.parse(row.custom_permissions) : undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at || '',
  };
}

// Map AppUser to database row
function mapUserToDbRow(user: AppUser): Record<string, any> {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    name: user.name,
    role: normalizeUserRole(user.role),
    branch_id: user.branchId || null,
    custom_permissions: user.customPermissions ? JSON.stringify(user.customPermissions) : null,
    is_active: user.isActive ? 1 : 0,
    created_at: user.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()((set, get) => {
  // Initialize sync listener
  initSyncListener();
  
  // Subscribe to PUSH-BASED sync for users table
  // Server broadcasts full table data after every write - NO refetch needed
  onTableSync('users', (table, rows) => {
    console.log(`[Auth] ← SYNC: Received ${rows.length} users from server`);
    if (rows.length > 0) {
      const users = rows.map(mapDbRowToUser);
      set({ users, isLoaded: true });
    } else {
      // If no users from server, keep default admin locally
      set({ isLoaded: true });
    }
  });

  return {
    users: [defaultAdmin],
    currentUser: null,
    isAuthenticated: false,
    isLoaded: false,
    
    loadUsers: async () => {
      try {
        const rows = await liveGetAll<any>('users');
        if (rows.length > 0) {
          const users = rows.map(mapDbRowToUser);
          set({ users, isLoaded: true });
          console.log('[Auth] Loaded', users.length, 'users from database');
        } else {
          // No users in database - create default admin
          const dbRow = mapUserToDbRow(defaultAdmin);
          const success = await liveInsert('users', dbRow);
          if (success) {
            console.log('[Auth] Created default admin user');
          }
          set({ users: [defaultAdmin], isLoaded: true });
        }
      } catch (error) {
        console.error('[Auth] Error loading users:', error);
        set({ isLoaded: true });
      }
    },
    
    login: (username: string, password: string, rememberMe?: boolean) => {
      const user = get().users.find(
        u => u.username.toLowerCase() === username.toLowerCase() && 
             u.password === password && 
             u.isActive
      );
      
      if (user) {
        set({ currentUser: user, isAuthenticated: true });
        if (rememberMe) {
          saveSession(user.id);
        } else {
          clearSession();
        }
        return { success: true };
      }
      
      return { success: false, error: 'Credenciais inválidas / Invalid credentials' };
    },
    
    logout: () => {
      clearSession();
      set({ currentUser: null, isAuthenticated: false });
    },

    restoreSession: () => {
      const session = getSavedSession();
      if (!session) return false;
      const user = get().users.find(u => u.id === session.userId && u.isActive);
      if (!user) {
        clearSession();
        return false;
      }
      set({ currentUser: user, isAuthenticated: true });
      console.log('[Auth] Session restored for user:', user.username);
      return true;
    },
    
    hasPermission: (permission: Permission) => {
      const user = get().currentUser;
      return resolveUserPermissions(user).includes(permission);
    },
    
    getUserPermissions: (userId?: string) => {
      const user = userId 
        ? get().users.find(u => u.id === userId)
        : get().currentUser;
      
      return resolveUserPermissions(user);
    },
    
    addUser: async (data) => {
      // Check for duplicate username
      const existingUser = get().users.find(
        u => u.username.toLowerCase() === data.username.toLowerCase()
      );
      
      if (existingUser) {
        return { success: false, error: 'Nome de utilizador já existe / Username already exists' };
      }
      
      const newUser: AppUser = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      
      const dbRow = mapUserToDbRow(newUser);
      const success = await liveInsert('users', dbRow);
      if (!success) {
        return { success: false, error: 'Erro ao guardar no banco de dados' };
      }
      
      return { success: true, user: newUser };
    },
    
    updateUser: async (id: string, data: Partial<AppUser>) => {
      // Check for duplicate username if username is being updated
      if (data.username) {
        const existingUser = get().users.find(
          u => u.username.toLowerCase() === data.username!.toLowerCase() && u.id !== id
        );
        
        if (existingUser) {
          return { success: false, error: 'Nome de utilizador já existe / Username already exists' };
        }
      }
      
      const currentUser = get().users.find(u => u.id === id);
      if (!currentUser) {
        return { success: false, error: 'Utilizador não encontrado' };
      }
      
      const updatedUser: AppUser = {
        ...currentUser,
        ...data,
      };
      
      const dbRow = mapUserToDbRow(updatedUser);
      const { id: _, ...updateData } = dbRow;
      const success = await liveUpdate('users', id, updateData);
      if (!success) {
        return { success: false, error: 'Erro ao actualizar no banco de dados' };
      }
      
      return { success: true };
    },
    
    isUsernameTaken: (username: string, excludeId?: string) => {
      return get().users.some(
        u => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeId
      );
    },
    
    deleteUser: async (id: string) => {
      // Don't delete the last admin
      const admins = get().users.filter(u => normalizeUserRole(u.role) === 'admin' && u.isActive);
      const userToDelete = get().users.find(u => u.id === id);
      
      if (userToDelete && normalizeUserRole(userToDelete.role) === 'admin' && admins.length <= 1) {
        return;
      }
      
      await liveDelete('users', id);
    },
    
    getUsers: () => {
      return get().users;
    },
  };
});
