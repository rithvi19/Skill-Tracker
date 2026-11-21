import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  BarChart3, LayoutDashboard, User, LogOut, Flame, 
  Menu, X, Sparkles, Moon, Sun, Milestone
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function Sidebar({ currentTab, onTabChange, isOpen, onToggleOpen }: SidebarProps) {
  const { user, logout, theme, toggleTheme } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Home / Dashboard', icon: LayoutDashboard },
    { id: 'skills', label: 'My Skills Deck', icon: Milestone },
    { id: 'stats', label: 'Analytics Suite', icon: BarChart3 },
    { id: 'profile', label: 'Account Settings', icon: User },
  ];

  return (
    <>
      {/* Mobile Sidebar overlay backdrop */}
      {isOpen && (
        <div 
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/45 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Main Sidebar Frame */}
      <aside className={`fixed top-0 bottom-0 left-0 bg-white dark:bg-zinc-900 border-r border-gray-150 dark:border-zinc-805 z-40 w-64 transform lg:transform-none transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col justify-between h-full p-6 select-none font-sans">
          
          <div className="space-y-8">
            {/* Top Logo Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/10 rounded-xl flex items-center justify-center font-bold">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h1 className="font-extrabold text-sm text-gray-900 dark:text-zinc-50 tracking-tight leading-none">
                    Skill Tracker
                  </h1>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 block">Pre-Access</span>
                </div>
              </div>

              {/* Mobile Close X button */}
              <button 
                type="button"
                onClick={onToggleOpen}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 focus:outline-none"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Menu Items List */}
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      // Close sidebar automatically on mobile after pick!
                      if (window.innerWidth < 1024) {
                        onToggleOpen();
                      }
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-violet-600 dark:from-purple-600 to-fuchsia-600 font-bold text-white shadow-md shadow-purple-500/10'
                        : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-950/40'
                    }`}
                  >
                    <IconComponent className="w-4.5 h-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom user profile card */}
          <div className="space-y-4 pt-5 border-t border-gray-100 dark:border-zinc-805">
            
            {/* Dark/Light mode toggle duplication inside bottom list for utility */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50/50 dark:bg-zinc-950/20 hover:bg-purple-500/5 hover:text-purple-600 border border-gray-100 dark:border-zinc-850 rounded-xl text-xs text-gray-400 font-semibold transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>{theme === 'dark' ? 'Deep Obsidian' : 'Classic Pearl'}</span>
              </span>
              <span className="text-[10px] font-bold text-purple-500 hover:underline">Toggle</span>
            </button>

            <div className="flex items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-zinc-850 dark:bg-zinc-950/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="text-2xl bg-white dark:bg-zinc-950 p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 shrink-0">
                  {user?.avatar || '👤'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">{user?.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate font-mono">Streak: {user?.streak} days</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1 px-1.5 hover:bg-red-500/5 hover:text-red-500 rounded-lg text-gray-300 transition cursor-pointer"
                title="Logs out of tracker sessions"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}
