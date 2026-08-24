import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist((set, get) => ({
  token: null,
  user: null,
  initialized: null,

  setAuth: (token, user) => set({ token, user }),
  setInitialized: (v) => set({ initialized: v }),
  logout: () => set({ token: null, user: null }),
  isLoggedIn: () => !!get().token
}), { name: 'rm-crm-auth' }));
