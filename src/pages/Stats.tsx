import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Award, BarChart3, Calendar, AwardIcon, TrendingUp, Sparkles, BookOpen, ChevronDown, ChevronUp, Layers, CheckCircle } from 'lucide-react';

export default function Stats() {
  const { skills, logs } = useApp();
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'progress' | 'count'>('progress');

  // 1. Compute Category Shares for D3-alternative custom Donut Chart
  const categoryRatios = useMemo(() => {
    if (skills.length === 0) return [];
    
    const countMap: Record<string, number> = {};
    skills.forEach(s => {
      countMap[s.category] = (countMap[s.category] || 0) + 1;
    });

    const list = Object.entries(countMap).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / skills.length) * 100)
    }));

    return list.sort((a, b) => b.count - a.count);
  }, [skills]);

  // Donut SVG wedges mathematics
  const donutWedges = useMemo(() => {
    let currentAngle = 0;
    const radius = 50;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;

    return categoryRatios.map((item, idx) => {
      const percentage = item.percentage;
      const angleSize = (percentage / 100) * 360;
      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((currentAngle / 360) * circumference);
      
      currentAngle += angleSize;

      // Color scheme indexes
      const colors = [
        "stroke-violet-500", "stroke-fuchsia-500", "stroke-indigo-500", 
        "stroke-purple-500", "stroke-pink-500", "stroke-cyan-500", 
        "stroke-emerald-500", "stroke-amber-500"
      ];
      const colorClass = colors[idx % colors.length];

      const textColors = [
        "text-violet-500", "text-fuchsia-500", "text-indigo-500", 
        "text-purple-500", "text-pink-500", "text-cyan-500", 
        "text-emerald-500", "text-amber-500"
      ];
      const textClass = textColors[idx % textColors.length];
      
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
        colorClass,
        textClass,
        radius,
        strokeWidth
      };
    });
  }, [categoryRatios]);

  // 2. Activity Heatmap Grid for the Past 28 Days
  const heatmapCells = useMemo(() => {
    const list = [];
    const today = new Date();
    
    // Scan backwards for 28 days
    for (let i = 27; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dayStr = targetDate.toISOString().split('T')[0];

      // Count logs matching this exact day
      const dayLogs = logs.filter(l => l.createdAt.split('T')[0] === dayStr);
      const intensity = dayLogs.length;

      // Map day index to label
      const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayLabel = `${shortDays[targetDate.getDay()]}, ${targetDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`;

      list.push({
        dateStr: dayStr,
        dayLabel,
        intensity,
        logsCount: intensity
      });
    }
    return list;
  }, [logs]);

  // 3. Overall tracking health KPI
  const statsOverview = useMemo(() => {
    const activeSkillCount = skills.length;
    const avgProgress = activeSkillCount === 0 
      ? 0 
      : Math.round(skills.reduce((sum, s) => sum + s.progress, 0) / activeSkillCount);

    const completedSkillsCount = skills.filter(s => s.progress === 100).length;

    // Filter logging milestone counts
    const totalLogCount = logs.length;

    return {
      activeSkillCount,
      avgProgress,
      completedSkillsCount,
      totalLogCount
    };
  }, [skills, logs]);

  // 4. Compute Category Progress and Skills list
  const categoryProgressData = useMemo(() => {
    const statsMap: Record<string, { totalProgress: number; count: number; completedCount: number; skillsList: typeof skills }> = {};
    skills.forEach(s => {
      if (!statsMap[s.category]) {
        statsMap[s.category] = { totalProgress: 0, count: 0, completedCount: 0, skillsList: [] };
      }
      statsMap[s.category].totalProgress += s.progress;
      statsMap[s.category].count += 1;
      if (s.progress === 100) {
        statsMap[s.category].completedCount += 1;
      }
      statsMap[s.category].skillsList.push(s);
    });

    return Object.entries(statsMap).map(([category, info], idx) => {
      const avgProgress = Math.round(info.totalProgress / info.count);
      const completionRate = Math.round((info.completedCount / info.count) * 100);
      
      const gradients = [
        "from-violet-500 to-indigo-500 bg-gradient-to-r",
        "from-fuchsia-500 to-pink-500 bg-gradient-to-r",
        "from-cyan-500 to-blue-500 bg-gradient-to-r",
        "from-emerald-500 to-teal-500 bg-gradient-to-r",
        "from-amber-500 to-orange-500 bg-gradient-to-r"
      ];
      
      const borderStyles = [
        "border-violet-500/20 hover:border-violet-500/40",
        "border-fuchsia-500/20 hover:border-fuchsia-500/40",
        "border-cyan-500/20 hover:border-cyan-500/40",
        "border-emerald-500/20 hover:border-emerald-500/40",
        "border-amber-500/20 hover:border-amber-500/40"
      ];

      const textColors = [
        "text-violet-600 dark:text-violet-400",
        "text-fuchsia-600 dark:text-fuchsia-400",
        "text-cyan-600 dark:text-cyan-400",
        "text-emerald-600 dark:text-emerald-400",
        "text-amber-600 dark:text-amber-400"
      ];

      const bgColors = [
        "bg-violet-500/10",
        "bg-fuchsia-500/10",
        "bg-cyan-500/10",
        "bg-emerald-500/10",
        "bg-amber-500/10"
      ];

      return {
        category,
        skillsCount: info.count,
        avgProgress,
        completedCount: info.completedCount,
        completionRate,
        skills: info.skillsList.sort((a, b) => b.progress - a.progress),
        gradientClass: gradients[idx % gradients.length],
        borderClass: borderStyles[idx % borderStyles.length],
        textColor: textColors[idx % textColors.length],
        bgColor: bgColors[idx % bgColors.length]
      };
    });
  }, [skills]);

  // Sort them dynamically based on state
  const sortedCategoryProgress = useMemo(() => {
    return [...categoryProgressData].sort((a, b) => {
      if (sortBy === 'progress') {
        return b.avgProgress - a.avgProgress;
      } else {
        return b.skillsCount - a.skillsCount;
      }
    });
  }, [categoryProgressData, sortBy]);

  if (skills.length === 0) {
    return (
      <div id="stats-empty-state" className="p-12 text-center select-none max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">No analytics calculated</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">
          The SaaS analytics engine requires active tracking skills to render interactive charts and maps. Deploy some skill trackers on your dashboard first!
        </p>
      </div>
    );
  }

  return (
    <div id="stats-root" className="space-y-8 select-none">
      
      {/* Page header title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" /> Analytics Suite
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Live analytics covering skill metrics profiles and daily actions.</p>
      </div>

      {/* 1. Quick KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex items-center gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition hover:shadow-md duration-300">
          <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest text-[10px] leading-relaxed">Skill Outlines</span>
            <p className="text-2xl font-black font-mono text-gray-900 dark:text-zinc-100">{statsOverview.activeSkillCount}</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex items-center gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition hover:shadow-md duration-300">
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest text-[10px] leading-relaxed">Solved Areas</span>
            <p className="text-2xl font-black font-mono text-gray-900 dark:text-zinc-100">{statsOverview.completedSkillsCount}</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex items-center gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition hover:shadow-md duration-300">
          <div className="p-3 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest text-[10px] leading-relaxed">Overall Average</span>
            <p className="text-2xl font-black font-mono text-gray-900 dark:text-zinc-100">{statsOverview.avgProgress}%</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex items-center gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition hover:shadow-md duration-300">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest text-[10px] leading-relaxed">Tracking Logs</span>
            <p className="text-2xl font-black font-mono text-gray-900 dark:text-zinc-100">{statsOverview.totalLogCount}</p>
          </div>
        </div>
      </div>

      {/* 2. Donut Segment Breakdown & Skill Leader board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Custom Donut Widget Card */}
        <div className="p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl space-y-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 dark:text-zinc-50 font-display text-base">Category Distribution</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Proportional representation of skill focal categories.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            {/* SVG circle */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg width="130" height="130" viewBox="0 0 120 120" className="transform -rotate-90">
                {donutWedges.map((wedge, index) => (
                  <circle
                    key={index}
                    cx="60"
                    cy="60"
                    r={wedge.radius}
                    fill="transparent"
                    className={`${wedge.colorClass} transition-all duration-300 hover:stroke-[16px]`}
                    strokeWidth={wedge.strokeWidth}
                    strokeDasharray={wedge.strokeDasharray}
                    strokeDashoffset={wedge.strokeDashoffset}
                    strokeLinecap="round"
                    onMouseEnter={() => setHoveredDonutSegment(wedge.category)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                  />
                ))}
              </svg>
              {/* Central text overlay */}
              <div className="absolute text-center bg-white dark:bg-zinc-900 p-2 rounded-full border border-gray-100 dark:border-zinc-850 shadow-sm w-20 h-20 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total</span>
                <span className="text-xl font-extrabold text-gray-800 dark:text-zinc-100 font-mono leading-none">{skills.length}</span>
              </div>
            </div>

            {/* Wedges Legend index */}
            <div className="flex-1 space-y-3 w-full">
              {donutWedges.map((wedge, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-between p-2 rounded-xl transition ${
                    hoveredDonutSegment === wedge.category ? 'bg-purple-500/5 border-purple-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${wedge.colorClass.replace('stroke-', 'bg-')}`} />
                    <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">{wedge.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-200 font-mono">{wedge.count}</span>
                    <span className="text-[10px] font-medium text-gray-400 font-mono ml-1.5">({wedge.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skill progress leader boards */}
        <div className="p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex flex-col justify-between space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 dark:text-zinc-50 font-display text-base">Mastery Ranking</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Track focus checkpoints sorted by progress indicators.</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {skills.slice(0, 5).map((s, idx) => (
              <div key={s.id} className="p-3.5 bg-gray-50/50 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-805 rounded-2xl flex items-center justify-between hover:border-violet-500/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-black flex items-center justify-center font-mono shrink-0">
                    #{idx+1}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-800 dark:text-zinc-100 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-0.5">{s.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 ml-1.5">
                  {/* Linear percentage label */}
                  <span className="text-xs font-black font-mono text-gray-900 dark:text-zinc-100 leading-none">{s.progress}%</span>
                  <div className="w-16 h-1.5 bg-gray-100 dark:bg-zinc-805 rounded-full overflow-hidden shrink-0">
                    <div 
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${s.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Category Progress bar charts */}
      <div id="category-progress-viewer" className="p-8 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-gray-950 dark:text-zinc-50 font-display text-base">Category Performance Profiles</h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Analysis of average skill progress mapped across focus directions.</p>
          </div>

          {/* Sort controls */}
          <div className="flex bg-gray-50 dark:bg-zinc-950 p-1 rounded-xl border border-gray-150 dark:border-zinc-805 text-xs font-semibold">
            <button
              onClick={() => setSortBy('progress')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sortBy === 'progress'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
            >
              Average Progress
            </button>
            <button
              onClick={() => setSortBy('count')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sortBy === 'count'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
            >
              Skill Counts
            </button>
          </div>
        </div>

        {/* Categories Bar Chart Renders */}
        <div className="space-y-4">
          {sortedCategoryProgress.map((item) => {
            const isExpanded = expandedCategory === item.category;
            return (
              <div
                key={item.category}
                className={`p-4 bg-gray-50/50 dark:bg-zinc-950/20 border ${
                  isExpanded ? 'border-purple-500/20 shadow-sm' : 'border-gray-150 dark:border-zinc-805'
                } rounded-2xl transition-all duration-300`}
              >
                {/* Visual Bar Card Header */}
                <div 
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedCategory(isExpanded ? null : item.category)}
                  aria-expanded={isExpanded}
                >
                  {/* Category info */}
                  <div className="flex items-center gap-3 min-w-0 md:w-1/4">
                    <div className={`p-2.5 rounded-xl ${item.bgColor} ${item.textColor} shrink-0`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate">{item.category}</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {item.skillsCount} {item.skillsCount === 1 ? 'skill' : 'skills'} • {item.completedCount} solved
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Bar Chart (Representing Progress) */}
                  <div className="flex-1 flex items-center gap-4">
                    <div className="relative w-full h-4 bg-gray-100 dark:bg-zinc-805 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${item.gradientClass}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.avgProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                      {/* Marker checkpoints visually overlaid inside bar */}
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-extrabold text-gray-500 dark:text-zinc-400 mix-blend-difference">
                        {item.avgProgress}% Average
                      </span>
                    </div>
                  </div>

                  {/* Right side stats control & toggle indicator */}
                  <div className="flex items-center gap-4 justify-between md:justify-end shrink-0 md:w-40">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-mono font-black text-gray-800 dark:text-zinc-200">
                        {item.completionRate}% Done
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-805 text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      aria-label="Expand category skills breakdown"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Skill Tray */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-150 dark:border-zinc-805 space-y-3">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-2">Tracked Skillsets</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.skills.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-xl flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                              Difficulty: <span className="font-semibold text-purple-500">{s.difficulty || "Medium"}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 ml-2">
                            {s.progress === 100 ? (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                <span>100%</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400">
                                  {s.progress}%
                                </span>
                                <div className="w-14 h-1.5 bg-gray-100 dark:bg-zinc-805 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full text-purple-600 ${item.gradientClass}`}
                                    style={{ width: `${s.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-gray-400 dark:text-zinc-500 flex items-center gap-1.5 font-sans justify-center pt-2">
          <BookOpen className="w-3.5 h-3.5 text-purple-500" />
          <span>Click any category bar segment to view the real-time skills and milestones configured.</span>
        </div>
      </div>

    </div>
  );
}
