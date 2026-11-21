import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Skill, Task, ActivityLog } from '../types';

export type Theme = 'light' | 'dark';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: User | null;
  token: string | null;
  theme: Theme;
  skills: Skill[];
  logs: ActivityLog[];
  loading: boolean;
  toasts: ToastItem[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  toggleTheme: () => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  fetchSkills: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  addSkill: (skillData: { name: string; category: string; difficulty: string; notes?: string; goalDate?: string }) => Promise<Skill | null>;
  updateSkill: (id: string, updates: Partial<Skill>) => Promise<boolean>;
  deleteSkill: (id: string) => Promise<boolean>;
  updateUserObj: (updates: Partial<User>) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark'); // Default premium dark theme with purple accents
  const [skills, setSkills] = useState<Skill[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Toast Handler
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial Boot loader
  useEffect(() => {
    const storedToken = localStorage.getItem('skill_token');
    const storedTheme = localStorage.getItem('skill_theme') as Theme;
    
    if (storedTheme) {
      setTheme(storedTheme);
      applyThemeClass(storedTheme);
    } else {
      applyThemeClass('dark');
    }

    if (storedToken) {
      setToken(storedToken);
      bootstrapUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Synchronize state changes to client-side localStorage backup to handle server restarts
  useEffect(() => {
    if (user) {
      const prevStr = localStorage.getItem('skill_backup_user');
      let backupPayload = { ...user };
      if (prevStr) {
        try {
          const prev = JSON.parse(prevStr);
          if (prev.password && !backupPayload.password) {
            backupPayload.password = prev.password;
          }
        } catch(e){}
      }
      localStorage.setItem('skill_backup_user', JSON.stringify(backupPayload));
    }
  }, [user]);

  useEffect(() => {
    if (skills && skills.length > 0) {
      localStorage.setItem('skill_backup_skills', JSON.stringify(skills));
    }
  }, [skills]);

  useEffect(() => {
    if (logs && logs.length > 0) {
      localStorage.setItem('skill_backup_logs', JSON.stringify(logs));
    }
  }, [logs]);

  const syncLocalBackupToServer = async (backupUser: User) => {
    try {
      const savedSkillsStr = localStorage.getItem('skill_backup_skills');
      const savedLogsStr = localStorage.getItem('skill_backup_logs');
      
      const skillsBackup = savedSkillsStr ? JSON.parse(savedSkillsStr) : [];
      const logsBackup = savedLogsStr ? JSON.parse(savedLogsStr) : [];
      const tasksBackup: any[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('skill_backup_tasks_')) {
          const valStr = localStorage.getItem(key);
          if (valStr) {
            try {
              const parsedTasks = JSON.parse(valStr);
              if (Array.isArray(parsedTasks)) {
                tasksBackup.push(...parsedTasks);
              }
            } catch (e) { /* ignore */ }
          }
        }
      }
      
      const password = localStorage.getItem('skill_backup_password_' + backupUser.email.toLowerCase()) || undefined;
      
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { ...backupUser, password },
          skills: skillsBackup,
          tasks: tasksBackup,
          logs: logsBackup
        })
      });
      
      if (res.ok) {
        console.log("[Backup Sync] Successfully restored session and synced local data with stateful backend.");
        return true;
      }
    } catch (err) {
      console.warn("[Backup Sync] Error syncing local state with database:", err);
    }
    return false;
  };

  const applyThemeClass = (t: Theme) => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (t === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#09090b'; // dark bg matching bg-zinc-950
      if (body) {
        body.style.backgroundColor = '#09090b';
      }
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f9fafb'; // light bg matching bg-gray-50
      if (body) {
        body.style.backgroundColor = '#f9fafb';
      }
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('skill_theme', nextTheme);
    applyThemeClass(nextTheme);
    addToast(`Theme switched to ${nextTheme} mode`, 'info');
  };

  const bootstrapUser = async (authToken: string) => {
    try {
      let res = await fetch('/api/user/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!res.ok && (res.status === 401 || res.status === 403)) {
        const backupUserStr = localStorage.getItem('skill_backup_user');
        if (backupUserStr) {
          try {
            const backupUser = JSON.parse(backupUserStr) as User;
            if (backupUser && backupUser.id === authToken) {
              const synced = await syncLocalBackupToServer(backupUser);
              if (synced) {
                res = await fetch('/api/user/me', {
                  headers: {
                    'Authorization': `Bearer ${authToken}`
                  }
                });
              }
            }
          } catch (err) {
            console.error("Failed to parse backup user during restore:", err);
          }
        }
      }

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Load operational user cache
        await Promise.all([
          loadSkills(authToken),
          loadLogs(authToken)
        ]);
      } else {
        // Token has expired or state corrupted
        logout();
      }
    } catch (e) {
      console.error("Critical auth bootstrap failure:", e);
      addToast("Network connection error.", "error");
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('skill_token', authToken);
    loadSkills(authToken);
    loadLogs(authToken);
    addToast(`Welcome back, ${userData.name}!`, 'success');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSkills([]);
    setLogs([]);
    localStorage.removeItem('skill_token');
    addToast("Logged out successfully.", 'info');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSkills = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/skills', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadLogs = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/logs', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addSkill = async (skillData: { name: string; category: string; difficulty: string; notes?: string; goalDate?: string }) => {
    if (!token) return null;
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(skillData)
      });
      if (res.ok) {
        const data = await res.json();
        setSkills(prev => [...prev, data.skill]);
        addToast(`Skill "${skillData.name}" added!`, 'success');
        loadLogs(); // Reload logs
        return data.skill;
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to create skill.", 'error');
        return null;
      }
    } catch (e) {
      addToast("Network failure adding skill.", 'error');
      return null;
    }
  };

  const updateSkill = async (id: string, updates: Partial<Skill>) => {
    if (!token) return false;
    // Optimistic frontend update for maximum responsiveness
    const originalSkills = [...skills];
    setSkills(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setSkills(prev => prev.map(s => s.id === id ? data.skill : s));
        loadLogs();
        return true;
      } else {
        setSkills(originalSkills); // Revert
        const err = await res.json();
        addToast(err.error || "Failed to update skill.", 'error');
        return false;
      }
    } catch (e) {
      setSkills(originalSkills); // Revert
      addToast("Network update failure.", 'error');
      return false;
    }
  };

  const deleteSkill = async (id: string) => {
    if (!token) return false;
    const deletedSkill = skills.find(s => s.id === id);
    const originalSkills = [...skills];
    setSkills(prev => prev.filter(s => s.id !== id));

    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        addToast(`Skill tracker deleted.`, 'info');
        loadLogs();
        return true;
      } else {
        setSkills(originalSkills); // Revert
        addToast("Failed to delete skill tracker.", 'error');
        return false;
      }
    } catch (e) {
      setSkills(originalSkills); // Revert
      addToast("Network termination error.", 'error');
      return false;
    }
  };

  const updateUserObj = async (updates: Partial<User>) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        loadLogs();
        return true;
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to update profile.", 'error');
        return false;
      }
    } catch (err) {
      addToast("Network profile adjustment error.", 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      theme,
      skills,
      logs,
      loading,
      toasts,
      addToast,
      removeToast,
      toggleTheme,
      login,
      logout,
      refreshUser,
      fetchSkills: () => loadSkills(),
      fetchLogs: () => loadLogs(),
      addSkill,
      updateSkill,
      deleteSkill,
      updateUserObj
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside an AppProvider");
  return context;
}
