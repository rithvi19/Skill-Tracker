import React from 'react';
import { useApp } from '../context/AppContext';
import { PlayCircle, Target, TrendingUp, Award, Activity } from 'lucide-react';

export default function Dashboard({ 
  onSelectSkill, 
  onNavigateTab 
}: { 
  onSelectSkill: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}) {
  const { user, skills, logs } = useApp();

  // Compute stats metrics simply
  const totalSkills = skills.length;
  const avgProgress = totalSkills > 0 
    ? Math.round(skills.reduce((acc, curr) => acc + curr.progress, 0) / totalSkills) 
    : 0;

  return (
    <div id="home-dashboard-inner-root" className="space-y-6 select-none">
      
      {/* 1. Welcoming Banner Card */}
      <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.015)] transition-all duration-300">
        <h1 className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight font-display">
          Welcome, {user?.name}!
        </h1>
      </div>

      {/* 2. Simple Metrics Widget Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.005)]">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 block uppercase tracking-widest font-mono">Current Streak</span>
            <strong className="text-xl font-bold text-gray-900 dark:text-zinc-50 font-display mt-1 block">
              {user?.streak || 0} Days
            </strong>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-zinc-950/40 text-amber-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.005)]">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 block uppercase tracking-widest font-mono">Total Trackers</span>
            <strong className="text-xl font-bold text-gray-900 dark:text-zinc-50 font-display mt-1 block">
              {totalSkills} Deployed
            </strong>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-zinc-950/40 text-purple-600 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.005)]">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 block uppercase tracking-widest font-mono">Average Progress</span>
            <strong className="text-xl font-bold text-gray-900 dark:text-zinc-50 font-display mt-1 block">
              {avgProgress}% Completed
            </strong>
          </div>
          <div className="p-3 bg-teal-50 dark:bg-zinc-950/40 text-teal-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Focus Skill Tracks Display */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] transition-all">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800/80">
          <h3 className="font-extrabold text-gray-900 dark:text-zinc-50 text-[15px] font-display flex items-center gap-2 uppercase tracking-wider">
            <PlayCircle className="w-4.5 h-4.5 text-purple-600" /> Focus Skill Tracks
          </h3>
          <button 
            type="button"
            onClick={() => onNavigateTab?.('skills')} 
            className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer focus:outline-none"
          >
            See All
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 dark:text-zinc-500">
            No active skills deployed. Launch a new tracker!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((sk) => (
              <div 
                key={sk.id}
                onClick={() => onSelectSkill(sk.id)}
                className="p-4 rounded-2xl bg-gray-50/20 dark:bg-zinc-950/20 hover:bg-gray-50/50 dark:hover:bg-zinc-950/40 border border-gray-100 dark:border-zinc-850 cursor-pointer flex flex-col justify-between gap-4 transition-all duration-300 hover:border-purple-500/30 shadow-[0_2px_12px_rgba(0,0,0,0.005)]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-zinc-950 text-purple-600 font-mono text-[10px] font-bold border border-gray-100 dark:border-zinc-850 shrink-0 select-none">
                    {sk.category.substring(0, 4).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-xs font-bold text-gray-850 dark:text-zinc-100 block truncate">{sk.name}</strong>
                    <span className="text-[10px] text-gray-400 block uppercase tracking-widest font-mono mt-0.5">{sk.difficulty}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3.5 w-full border-t border-gray-100 dark:border-zinc-805 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
                    <span className="text-xs font-extrabold font-mono text-gray-700 dark:text-zinc-200">{sk.progress}%</span>
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${sk.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Mini Actions log */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.01)] transition-all">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-zinc-800/80">
          <h3 className="font-extrabold text-gray-900 dark:text-zinc-50 text-[15px] font-display flex items-center gap-2 uppercase tracking-wider">
            <Activity className="w-4.5 h-4.5 text-purple-600" /> Recent Actions Feed
          </h3>
          <button 
            type="button"
            onClick={() => onNavigateTab?.('stats')} 
            className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer focus:outline-none"
          >
            Insights & Analytics
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 dark:text-zinc-500 font-sans">
            No activities recorded yet. Adjust checkpoints above to populate your profile activity log!
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
            {logs.slice(0, 3).map((log) => (
              <div key={log.id} className="py-3 flex justify-between items-center gap-4 text-xs first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-gray-800 dark:text-zinc-200 truncate">{log.action}</p>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5 block">
                      {log.details || `Logged checkpoint progress update.`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 shrink-0 select-none">
                  {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
