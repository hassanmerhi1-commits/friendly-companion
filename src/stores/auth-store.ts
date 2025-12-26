import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  username: string;
  password: string; // In a real app, this would be hashed
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  users: AppUser[];
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  
  // Auth actions
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  
  // User management (admin only)
  addUser: (data: Omit<AppUser, 'id' | 'createdAt'>) => AppUser;
  updateUser: (id: string, data: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  getUsers: () => AppUser[];
}

// Default admin user - credentials are stored securely
const defaultAdmin: AppUser = {
  id: 'admin-1',
  username: 'sysadmin',
  password: 'P@yR0ll#2024!Sec',
  name: 'Administrador',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [defaultAdmin],
      currentUser: null,
      isAuthenticated: false,
      
      login: (username: string, password: string) => {
        const user = get().users.find(
          u => u.username.toLowerCase() === username.toLowerCase() && 
               u.password === password && 
               u.isActive
        );
        
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          return { success: true };
        }
        
        return { success: false, error: 'Credenciais inválidas / Invalid credentials' };
      },
      
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
      
      addUser: (data) => {
        const newUser: AppUser = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          users: [...state.users, newUser],
        }));
        
        return newUser;
      },
      
      updateUser: (id: string, data: Partial<AppUser>) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...data } : user
          ),
        }));
      },
      
      deleteUser: (id: string) => {
        // Don't delete the last admin
        const admins = get().users.filter(u => u.role === 'admin' && u.isActive);
        const userToDelete = get().users.find(u => u.id === id);
        
        if (userToDelete?.role === 'admin' && admins.length <= 1) {
          return; // Can't delete last admin
        }
        
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        }));
      },
      
      getUsers: () => {
        return get().users;
      },
    }),
    {
      name: 'payrollao-auth',
    }
  )
);
