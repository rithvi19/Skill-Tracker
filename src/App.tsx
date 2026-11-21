import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import SkillDetails from './pages/SkillDetails';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import { 
  Menu, Sun, Moon, Flame, Sparkles, Plus, X, 
  LayoutDashboard, Milestone, BarChart3, User, HelpCircle, 
  MilestoneIcon, CheckSquare, Settings2, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, loading, skills, theme, toggleTheme, addSkill, updateSkill, addToast } = useApp();
  
  // Navigation tabs: 'dashboard' | 'skills' | 'stats' | 'profile'
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Drill-down details state for skills
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  
  // Mobile sidebar open state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Quick Actions FAB Modal State
  const [isFABOpen, setIsFABOpen] = useState(false);
  
  // Quick Actions interactive sub-tab state: 'tracker' | 'checkpoint'
  const [fabActionTab, setFabActionTab] = useState<'tracker' | 'checkpoint'>('tracker');

  // Quick Action form parameters
  const [quickSkillName, setQuickSkillName] = useState('');
  const [quickSkillCategory, setQuickSkillCategory] = useState('Programming');
  const [quickSkillDifficulty, setQuickSkillDifficulty] = useState('Beginner');
  const [quickSkillNotes, setQuickSkillNotes] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  const [activeSkillId, setActiveSkillId] = useState('');
  const [activeSkillProgress, setActiveSkillProgress] = useState(0);
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Loading animation state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors select-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 shadow-lg shadow-purple-500/20 flex items-center justify-center text-white mb-4"
        >
          <Flame className="w-6 h-6 fill-current" />
        </motion.div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 tracking-tight">Syncing Roster Accounts</h3>
        <p className="text-xs text-gray-400 mt-1 font-sans">Connecting master skill maps...</p>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token') || urlParams.get('reset-token') || undefined;
    return (
      <>
        <Auth onResetParam={resetToken} />
        <ToastContainer />
      </>
    );
  }

  // Onboarding screen
  if (!user.onboardingCompleted) {
    return (
      <>
        <Onboarding />
        <ToastContainer />
      </>
    );
  }

  // Handle Quick Skill deploy
  const handleQuickDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSkillName.trim()) {
      addToast("Please input a focus skill title.", "error");
      return;
    }

    setIsDeploying(true);
    const newSk = await addSkill({
      name: quickSkillName,
      category: quickSkillCategory,
      difficulty: quickSkillDifficulty,
      notes: quickSkillNotes || "Deployed via Cognitive Quick Actions advisor."
    });

    if (newSk) {
      addToast(`Instantly deployed tracker for "${quickSkillName}"!`, "success");
      setQuickSkillName('');
      setQuickSkillNotes('');
      setIsFABOpen(false);
      setCurrentTab('skills');
      setSelectedSkillId(null);
    }
    setIsDeploying(false);
  };

  // Handle Log progress checkpoint
  const handleQuickProgressLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkillId) {
      addToast("Please select a valid tracking node.", "error");
      return;
    }

    setIsSavingLog(true);
    const success = await updateSkill(activeSkillId, {
      progress: Number(activeSkillProgress)
    });

    if (success) {
      const selectedSkName = skills.find(s=>s.id === activeSkillId)?.name || 'Skill';
      addToast(`Updated ${selectedSkName} progress to ${activeSkillProgress}%!`, "success");
      setIsFABOpen(false);
    }
    setIsSavingLog(false);
  };

  // Nav actions
  const handleTabSwitch = (tab: string) => {
    setCurrentTab(tab);
    setSelectedSkillId(null);
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 transition-colors duration-300 antialiased font-sans">
      
      {/* Sidebar navigation */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={handleTabSwitch}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main viewport area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen relative pb-24 lg:pb-0">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-150 dark:border-zinc-805 px-6 py-4.5 flex items-center justify-between z-20 transition duration-300">
          
          {/* Hamburger button (only rendered on mobile/tablet) */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl border border-gray-200 dark:border-zinc-805 text-gray-500 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-zinc-800/40 select-none cursor-pointer focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </button>

          {!sidebarOpen && <div className="hidden lg:block w-1" />}

          {/* Persistent theme toggler in top-right */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-500 hover:text-purple-600 hover:border-violet-400 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 select-none cursor-pointer flex items-center gap-1.5 focus:outline-none"
              title="Toggle Application Theme Mode"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-bold hidden sm:inline uppercase tracking-widest">Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold hidden sm:inline uppercase tracking-widest">Light Mode</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* View Main Content wrapper with animations */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedSkillId ? `skill-${selectedSkillId}` : currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {currentTab === 'dashboard' ? (
                selectedSkillId ? (
                  <SkillDetails 
                    skillId={selectedSkillId} 
                    onGoBack={() => setSelectedSkillId(null)} 
                  />
                ) : (
                  <Dashboard onSelectSkill={(id) => setSelectedSkillId(id)} onNavigateTab={handleTabSwitch} />
                )
              ) : currentTab === 'skills' ? (
                selectedSkillId ? (
                  <SkillDetails 
                    skillId={selectedSkillId} 
                    onGoBack={() => setSelectedSkillId(null)} 
                  />
                ) : (
                  <Skills onSelectSkill={(id) => setSelectedSkillId(id)} />
                )
              ) : currentTab === 'stats' ? (
                <Stats />
              ) : (
                <Profile />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* MODERN MOBILE-STYLE BOTTOM NAVIGATION BAR */}
        <div id="bottom-bar-nav" className="fixed bottom-0 inset-x-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-gray-150 dark:border-zinc-805/85 z-30 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.025)] lg:hidden transition-colors duration-300">
          <div className="flex items-center justify-around h-20 px-4 relative max-w-md mx-auto">
            
            {/* Slot 1: Home/Dashboard */}
            <button
              type="button"
              onClick={() => handleTabSwitch('dashboard')}
              className={`flex flex-col items-center justify-center gap-1.5 focus:outline-none transition-colors duration-200 select-none ${
                currentTab === 'dashboard' && !selectedSkillId ? 'text-purple-600 dark:text-purple-400 font-extrabold' : 'text-gray-400 dark:text-zinc-500'
              }`}
            >
              <LayoutDashboard className="w-5.5 h-5.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
            </button>

            {/* Slot 2: Skills list */}
            <button
              type="button"
              onClick={() => handleTabSwitch('skills')}
              className={`flex flex-col items-center justify-center gap-1.5 focus:outline-none transition-colors duration-200 select-none ${
                currentTab === 'skills' && !selectedSkillId ? 'text-purple-600 dark:text-purple-400 font-extrabold' : 'text-gray-400 dark:text-zinc-500'
              }`}
            >
              <Milestone className="w-5.5 h-5.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Skills</span>
            </button>

            {/* Central Elevated Floating "+" Action Button */}
            <div className="relative -translate-y-5 select-none">
              <button
                type="button"
                onClick={() => {
                  setFabActionTab('tracker');
                  setIsFABOpen(true);
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 hover:scale-105 transition-all text-xl flex items-center justify-center border-4 border-gray-50 dark:border-zinc-950 focus:outline-none"
                title="Launch Quick Actions"
              >
                <Plus className="w-7 h-7 font-black" />
              </button>
            </div>

            {/* Slot 4: Stats */}
            <button
              type="button"
              onClick={() => handleTabSwitch('stats')}
              className={`flex flex-col items-center justify-center gap-1.5 focus:outline-none transition-colors duration-200 select-none ${
                currentTab === 'stats' ? 'text-purple-600 dark:text-purple-400 font-extrabold' : 'text-gray-400 dark:text-zinc-500'
              }`}
            >
              <BarChart3 className="w-5.5 h-5.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
            </button>

            {/* Slot 5: Profile */}
            <button
              type="button"
              onClick={() => handleTabSwitch('profile')}
              className={`flex flex-col items-center justify-center gap-1.5 focus:outline-none transition-colors duration-200 select-none ${
                currentTab === 'profile' ? 'text-purple-600 dark:text-purple-400 font-extrabold' : 'text-gray-400 dark:text-zinc-500'
              }`}
            >
              <User className="w-5.5 h-5.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
            </button>

          </div>
        </div>

      </div>

      {/* GLOBAL FLOATING QUICK ACTIONS FAB MODAL OVERLAY */}
      <AnimatePresence>
        {isFABOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsFABOpen(false)}
            />

            {/* Modal card content Container */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ cubicBezier: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 w-full max-w-md p-6 md:p-8 shadow-2xl relative z-10 overflow-hidden"
            >
              
              {/* Decorative light blob */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl" />

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-extrabold text-gray-950 dark:text-zinc-50 tracking-tight font-display text-base">Quick Action Hub</h3>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Push skill checkpoints or deploy tracking folders.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFABOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dynamic segmented tabs */}
              <div className="flex bg-gray-50 dark:bg-zinc-950/45 p-1 rounded-xl mb-5 border border-gray-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setFabActionTab('tracker')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    fabActionTab === 'tracker'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100'
                  }`}
                >
                  Deploy Tracker
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFabActionTab('checkpoint');
                    if (skills.length > 0 && !activeSkillId) {
                      setActiveSkillId(skills[0].id);
                      setActiveSkillProgress(skills[0].progress);
                    }
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    fabActionTab === 'checkpoint'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100'
                  }`}
                >
                  Log Work Checkpoint
                </button>
              </div>

              <AnimatePresence mode="wait">
                {fabActionTab === 'tracker' ? (
                  <motion.form
                    key="quick-deploy-form"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleQuickDeploy}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Skill Focus Area</label>
                      <input 
                        type="text" 
                        required
                        value={quickSkillName}
                        onChange={e => setQuickSkillName(e.target.value)}
                        placeholder="e.g. Master NextJs, Spanish Intermediate"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
                        <select
                          value={quickSkillCategory}
                          onChange={e => setQuickSkillCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-800 dark:text-zinc-100 focus:outline-none"
                        >
                          {["Programming", "Design", "Writing", "Fitness", "Music", "Languages", "Business", "Academic", "Other"].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Difficulty</label>
                        <select
                          value={quickSkillDifficulty}
                          onChange={e => setQuickSkillDifficulty(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-800 dark:text-zinc-100 focus:outline-none"
                        >
                          {["Beginner", "Intermediate", "Advanced"].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Advisory notes (Optional)</label>
                      <textarea
                        rows={2}
                        value={quickSkillNotes}
                        onChange={e => setQuickSkillNotes(e.target.value)}
                        placeholder="Core goals, target deadlines..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isDeploying}
                      className="w-full py-3 mt-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                    >
                      {isDeploying ? 'Deploying and Syncing...' : 'Deploy Tracker'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="quick-checkpoint-form"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleQuickProgressLog}
                    className="space-y-4"
                  >
                    {skills.length === 0 ? (
                      <div className="p-10 text-center text-xs text-gray-400 select-none">
                        No active tracking nodes. Deploy some skill folders first!
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Select Active Skill</label>
                          <select
                            value={activeSkillId}
                            onChange={e => {
                              setActiveSkillId(e.target.value);
                              const matchSk = skills.find(s=>s.id === e.target.value);
                              if (matchSk) {
                                setActiveSkillProgress(matchSk.progress);
                              }
                            }}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-850 dark:text-zinc-100 focus:outline-none"
                          >
                            {skills.map(sk => (
                              <option key={sk.id} value={sk.id}>{sk.name} ({sk.progress}%)</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                            <span>Adjust Progress Checkpoint</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400 font-mono text-xs">{activeSkillProgress}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={activeSkillProgress}
                            onChange={e => setActiveSkillProgress(Number(e.target.value))}
                            className="w-full py-2 accent-purple-600 cursor-pointer"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSavingLog}
                          className="w-full py-3 mt-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                        >
                          {isSavingLog ? 'Saving progress data...' : 'Save Checkpoint'}
                        </button>
                      </>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
