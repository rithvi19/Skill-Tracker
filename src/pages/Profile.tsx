import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LogOut, 
  Sun, 
  Moon, 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Flame, 
  Trophy, 
  ShieldCheck, 
  Sparkles, 
  Award, 
  Check, 
  Save,
  CheckCircle2,
  Bookmark
} from 'lucide-react';

const AVATAR_OPTIONS = [
  { emoji: '🧭', label: 'Explorer', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' },
  { emoji: '🚀', label: 'Innovator', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' },
  { emoji: '💻', label: 'Developer', bg: 'bg-purple-50 dark:bg-zinc-950 text-purple-600' },
  { emoji: '🎨', label: 'Creator', bg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-600' },
  { emoji: '🧪', label: 'Researcher', bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600' },
  { emoji: '📚', label: 'Scholar', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' },
  { emoji: '🍵', label: 'Zen Master', bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600' },
  { emoji: '⚡', label: 'High Voltage', bg: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-500' },
  { emoji: '🎯', label: 'Marksman', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' },
  { emoji: '🌱', label: 'Cultivator', bg: 'bg-green-50 dark:bg-green-950/40 text-green-600' }
];

export default function Profile() {
  const { user, theme, toggleTheme, logout, updateUserObj, skills, logs, addToast } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '🧭');
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Programmatic Badge Rules
  const totalSkills = skills.length;
  const categoriesCount = new Set(skills.map(s => s.category)).size;
  const hasFinishedCheckpoints = skills.some(s => s.progress >= 50);
  const totalCompletedSkills = skills.filter(s => s.progress === 100).length;
  const totalLogsCount = logs.length;
  const streak = user?.streak || 0;

  const achievements = [
    {
      id: 'novice-builder',
      title: 'Novice Builder',
      desc: 'Launched at least 1 active skill tracker',
      unlocked: totalSkills >= 1,
      icon: <Award className="w-4 h-4" />
    },
    {
      id: 'vanguard-track',
      title: 'Vanguard Track',
      desc: 'Started skills in 2 or more diverse categories',
      unlocked: categoriesCount >= 2,
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      id: 'consistency-key',
      title: 'Active Consistency',
      desc: 'Formed a focus streak of at least 3 days',
      unlocked: streak >= 3,
      icon: <Flame className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'peak-perf',
      title: 'Peak Builder',
      desc: 'Pushed a tracker to 50% progress or higher',
      unlocked: hasFinishedCheckpoints,
      icon: <CheckCircle2 className="w-4 h-4 text-teal-500" />
    },
    {
      id: 'master-tracker',
      title: 'Sovereign Skill',
      desc: 'Archived a skill at 100% mastery',
      unlocked: totalCompletedSkills >= 1,
      icon: <Trophy className="w-4 h-4 text-purple-600" />
    },
    {
      id: 'chronicler',
      title: 'Active Chronicler',
      desc: 'Logged 3 or more total progress updates',
      unlocked: totalLogsCount >= 3,
      icon: <Bookmark className="w-4 h-4 text-blue-500" />
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Profile name cannot be blank', 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      const success = await updateUserObj({ name, avatar });
      if (success) {
        addToast('Profile saved successfully!', 'success');
      }
    } catch (err) {
      addToast('Failed to save profile modifications', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelect = (emoji: string) => {
    setAvatar(emoji);
    setShowAvatarPicker(false);
  };

  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'New account';

  return (
    <div id="profile-root" className="max-w-3xl mx-auto space-y-6 select-none py-6">
      
      {/* 1. Header Banner */}
      <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          
          {/* Main User Avatar Accent */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-500/15 to-indigo-500/15 hover:from-purple-500/25 hover:to-indigo-500/25 border-2 border-dashed border-purple-500/40 flex items-center justify-center text-4xl shadow-sm transition cursor-pointer select-none group focus:outline-none"
              title="Click to switch avatar"
            >
              <span className="scale-100 group-hover:scale-110 transition duration-300">{avatar}</span>
              <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-1 border-2 border-white dark:border-zinc-900 shadow-md">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            </button>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest bg-purple-500/10 dark:bg-purple-500/20 px-2.5 py-0.5 rounded-full inline-block">
              Focus Practitioner
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight font-display">
              {user?.name}
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 flex items-center justify-center sm:justify-start gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" /> Joined {formattedDate}
            </p>
          </div>

          {/* User Streak Overlay Widget */}
          <div className="sm:ml-auto p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 flex items-center gap-3 select-none">
            <Flame className="w-8 h-8 text-amber-500 animate-pulse fill-amber-500/20" />
            <div>
              <span className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 font-mono font-bold">Current Streak</span>
              <p className="text-lg font-black text-amber-700 dark:text-amber-300 font-display leading-none mt-1">{streak} Days</p>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Avatar Picker Grid */}
        {showAvatarPicker && (
          <div className="mt-6 p-5 bg-gray-50 dark:bg-zinc-950/80 border border-gray-150 dark:border-zinc-855 rounded-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Select New Persona Avatar</span>
              <button 
                type="button" 
                onClick={() => setShowAvatarPicker(false)} 
                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.emoji}
                  type="button"
                  onClick={() => handleAvatarSelect(opt.emoji)}
                  className={`p-3 text-2xl rounded-xl border border-transparent hover:border-purple-500/40 hover:scale-105 active:scale-95 transition cursor-pointer text-center ${opt.bg}`}
                  title={opt.label}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <form onSubmit={handleUpdateProfile} className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
          
          <div className="border-b border-gray-100 dark:border-zinc-800/80 pb-3">
            <h3 className="font-extrabold text-gray-900 dark:text-zinc-50 text-sm uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-purple-600" /> Account Context Info
            </h3>
          </div>

          {/* Config Name Input field */}
          <div className="space-y-1.5 focus-within:text-purple-600 transition duration-300">
            <label className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-gray-400 block">
              Full Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Alexis Cole"
              className="w-full px-4 py-3 text-xs bg-gray-50 dark:bg-zinc-950/40 border border-gray-150 dark:border-zinc-805 rounded-xl text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition font-medium"
            />
          </div>

          {/* Immutable Account Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-gray-400 block flex items-center justify-between">
              <span>Account Email (Verified)</span>
              <span className="flex items-center gap-1 text-[9px] text-teal-600 dark:text-teal-400 font-mono normal-case">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            </label>
            <div className="w-full px-4 py-3 text-xs bg-gray-100/50 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-805/40 text-gray-400 dark:text-zinc-500 rounded-xl flex items-center gap-2 select-all select-none">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>{user?.email || 'user@example.com'}</span>
            </div>
          </div>

          {/* Form Save Button & Config Action Group */}
          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between gap-4">
            
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-805 bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-900/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer focus:outline-none"
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-650 dark:text-zinc-300">Light Preferences</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300 dark:text-zinc-300">Dark Preferences</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-650 disabled:bg-purple-600/60 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md select-none"
            >
              <Save className="w-3.5 h-3.5" /> <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

        </form>

        {/* Quick Stats Summary Card */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
          <h3 className="font-extrabold text-gray-900 dark:text-zinc-50 text-xs uppercase tracking-wider">
            Engagement Context
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50/20 dark:bg-zinc-950/20 border border-gray-100 dark:border-zinc-855">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">My Skill Trackers</span>
              <p className="text-xl font-bold text-gray-800 dark:text-zinc-200 mt-1 font-display">{totalSkills} Total</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50/20 dark:bg-zinc-950/20 border border-gray-100 dark:border-zinc-855">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">System Activity Log</span>
              <p className="text-xl font-bold text-gray-800 dark:text-zinc-200 mt-1 font-display">{totalLogsCount} Audits</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full mt-2 py-3 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/45 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> <span>Sign Out</span>
          </button>
        </div>
      </div>

    </div>
  );
}
