import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import CircularProgress from '../components/CircularProgress';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Search, SlidersHorizontal, Plus, Flame, Award, 
  CheckSquare, Calendar, Trash2, Edit3, ChevronRight, X, Clock, HelpCircle, BookOpen, ExternalLink,
  Milestone, Compass, TrendingUp, Lightbulb, Map
} from 'lucide-react';
import { Skill, Difficulty } from '../types';

const CATEGORIES = ["Programming", "Design", "Writing", "Fitness", "Music", "Languages", "Business", "Academic", "Other"];
const DIFFICULTY_LEVELS: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export default function Skills({ onSelectSkill }: { onSelectSkill: (id: string) => void }) {
  const { skills, addSkill, updateSkill, deleteSkill, addToast } = useApp();

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'progress' | 'name' | 'createdAt'>('progress');

  // Edit Skill Modal States
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('Beginner');
  const [editNotes, setEditNotes] = useState('');
  const [editGoalDate, setEditGoalDate] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add Skill Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Programming');
  const [newSkillDifficulty, setNewSkillDifficulty] = useState('Beginner');
  const [newSkillGoalDate, setNewSkillGoalDate] = useState('');
  const [newSkillNotes, setNewSkillNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // AI Advisory recommendations (Pre-computed interactive model based on users skill sets)
  const aiSkillRecommendations = useMemo(() => {
    if (skills.length === 0) {
      return {
        nextSuggestions: ["Python Analytics", "UI Design System Foundations", "Product Management Core"],
        gapAnalysis: "Add standard skills to evaluate skill gap overlaps."
      };
    }
    
    // Analyze active categories and names
    const skillNames = skills.map(s => s.name.toLowerCase());
    const hasCode = skills.some(s => s.category === "Programming" || s.name.toLowerCase().includes("react") || s.name.toLowerCase().includes("js") || s.name.toLowerCase().includes("web"));
    const hasDesign = skills.some(s => s.category === "Design" || s.name.toLowerCase().includes("figma") || s.name.toLowerCase().includes("ui") || s.name.toLowerCase().includes("ux"));
    const hasLanguages = skills.some(s => s.category === "Languages");

    let nextSuggestions: string[] = [];
    let gapAnalysis = "";

    if (hasCode && hasDesign) {
      nextSuggestions = ["Three.js & WebGL animations", "Framer Motion Micro-interactions", "Next.js Static Design Bundling"];
      gapAnalysis = "You have balanced coding and design profiles. Next gap to bridge is combining them into production micro-interactions & WebGL rendering.";
    } else if (hasCode) {
      nextSuggestions = ["System Architecture & API proxying", "TypeScript Advanced Generics", "UI Design Fundamentals for Developers"];
      gapAnalysis = "Primacy in Programming detected. A minor skillset gap is present regarding UI/UX layouts & Design Token specifications.";
    } else if (hasDesign) {
      nextSuggestions = ["Frontend Prototyping (HTML/CSS)", "Interactive Design Mocking", "Technical Portfolio Writing"];
      gapAnalysis = "Primacy in Creative Design. Recommended gap to solve next is introductory frontend scripting or Technical portfolio architecture.";
    } else if (hasLanguages) {
      nextSuggestions = ["Advanced Linguistic Translation", "Cultural Business Etiquette", "Linguistic Speech Synthesis"];
      gapAnalysis = "Linguistic core detected. Consider expanding language skills into writing styles or commercial consulting.";
    } else {
      nextSuggestions = ["Strategic Time-chunking", "Public Speaking Principles", "Data Analytics Basics"];
      gapAnalysis = "Broad learning map initialized. Focus on consistency in daily habit logs to unlock deep analysis insights.";
    }

    return { nextSuggestions, gapAnalysis };
  }, [skills]);

  // Handle Edit Action Setup
  const handleOpenEdit = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details card select
    setEditingSkill(skill);
    setEditName(skill.name);
    setEditCategory(skill.category);
    setEditDifficulty(skill.difficulty);
    setEditNotes(skill.notes || '');
    setEditProgress(skill.progress);
    setEditGoalDate(skill.goalDate ? skill.goalDate.split('T')[0] : '');
  };

  // Submit edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    if (!editName.trim()) {
      addToast("Skill focus title is required", "error");
      return;
    }

    setIsSavingEdit(true);
    const success = await updateSkill(editingSkill.id, {
      name: editName,
      category: editCategory,
      difficulty: editDifficulty,
      notes: editNotes,
      progress: Number(editProgress),
      goalDate: editGoalDate || null
    });

    if (success) {
      addToast(`Updated configurations for ${editName}`, "success");
      setEditingSkill(null);
    }
    setIsSavingEdit(false);
  };

  // Submit new skill
  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) {
      addToast("Please provide a skill title.", "error");
      return;
    }
    setIsCreating(true);
    const success = await addSkill({
      name: newSkillName,
      category: newSkillCategory,
      difficulty: newSkillDifficulty,
      notes: newSkillNotes,
      goalDate: newSkillGoalDate || undefined
    });
    
    if (success) {
      setIsAddOpen(false);
      setNewSkillName('');
      setNewSkillNotes('');
      setNewSkillGoalDate('');
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid cell details selection
    if (window.confirm(`Are you sure you want to delete the tracker for "${name}" completed up to ${skills.find(s=>s.id===id)?.progress}%?`)) {
      await deleteSkill(id);
    }
  };

  // Filter processes
  const filteredSkills = useMemo(() => {
    return skills
      .filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        const matchesDifficulty = selectedDifficulty === 'All' || s.difficulty === selectedDifficulty;
        return matchesSearch && matchesCategory && matchesDifficulty;
      })
      .sort((a, b) => {
        if (sortBy === 'progress') {
          return b.progress - a.progress;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [skills, searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  const skillSummaryStats = useMemo(() => {
    const total = skills.length;
    if (total === 0) return { avg: 0, completedCount: 0 };
    const avg = Math.round(skills.reduce((sum, s) => sum + s.progress, 0) / total);
    const completedCount = skills.filter(s => s.progress === 100).length;
    return { avg, completedCount };
  }, [skills]);

  return (
    <div id="skills-management-view" className="space-y-8 select-none">
      
      {/* Visual Header / Summary row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 p-6 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
        <div>
          <h1 className="text-xl font-black text-gray-950 dark:text-zinc-50 tracking-tight font-display flex items-center gap-2">
            <Milestone className="w-5 h-5 text-purple-600" /> Interactive Skills Deck
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Construct target focus nodes, track completion rates, and trigger cognitive roadmaps.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Completes Rate</span>
            <strong className="text-sm text-gray-800 dark:text-zinc-200 font-mono">
              {skillSummaryStats.completedCount} of {skills.length} skills (avg: {skillSummaryStats.avg}%)
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xs hover:to-fuchsia-500 shadow-md shadow-purple-500/10 transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> <span>Launch Tracker</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Filter & Deck Grid (Col-Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Filtering Hub Component */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search skills, topics, categories..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
              <select 
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="progress">Sort: Progress%</option>
                <option value="name">Sort: Title A-Z</option>
                <option value="createdAt">Sort: Created Date</option>
              </select>
            </div>
          </div>

          {/* Quick filter scrollable categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {["All", ...CATEGORIES].map((ctg) => (
              <button
                key={ctg}
                type="button"
                onClick={() => setSelectedCategory(ctg)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full shrink-0 transition ${
                  selectedCategory === ctg 
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900/60 border border-gray-150 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                }`}
              >
                {ctg}
              </button>
            ))}
          </div>

          {/* Active Skills Card Deck Grid */}
          {filteredSkills.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-zinc-900/50 border border-gray-150 dark:border-zinc-805 flex flex-col items-center justify-center">
              <Compass className="w-12 h-12 text-purple-400 animate-pulse mb-3" />
              <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200">No matching tracking nodes found</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                No active trackers match your selected metrics. Try resetting categories or click below to launch a new tracker.
              </p>
              <button
                onClick={() => setIsAddOpen(true)}
                className="mt-4 px-4 py-2 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl border border-purple-150 hover:bg-purple-100/60 transition"
              >
                Add Your First Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredSkills.map((skill) => {
                  let countdownText = "Unlimited timing";
                  if (skill.goalDate) {
                    const daysLeft = Math.ceil((new Date(skill.goalDate).getTime() - new Date().getTime()) / (1000 * 300 * 288));
                    countdownText = daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? "Deadline today" : "Goal timeline elapsed";
                  }

                  return (
                    <motion.div
                      key={skill.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -3 }}
                      onClick={() => onSelectSkill(skill.id)}
                      className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.01)] hover:shadow-md cursor-pointer group transition duration-300 relative overflow-hidden flex flex-col justify-between h-56"
                    >
                      {/* Top Action Layer bar */}
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest font-mono">
                          <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            {skill.category}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(skill, e)}
                              className="p-1 px-1.5 rounded-lg border border-gray-150 dark:border-zinc-800 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition"
                              title="Modify details for focus item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(skill.id, skill.name, e)}
                              className="p-1 px-1.5 rounded-lg border border-gray-150 dark:border-zinc-800 text-gray-400 hover:text-red-500 hover:bg-red-500/5 transition"
                              title="Delete tracking block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h3 className="font-extrabold text-gray-950 dark:text-zinc-50 tracking-tight font-display text-[15px] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {skill.name}
                            </h3>
                            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-50 dark:bg-zinc-950 text-gray-400 uppercase tracking-widest font-mono">
                              {skill.difficulty} Path
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center justify-center">
                            <CircularProgress value={skill.progress} size={46} strokeWidth={4.5} glow />
                          </div>
                        </div>

                        {skill.notes && (
                          <p className="text-xs text-gray-400 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                            {skill.notes}
                          </p>
                        )}
                      </div>

                      {/* Bottom Countdown Card row */}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono font-medium text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-500/60" />
                          <span>{countdownText}</span>
                        </div>
                        <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Roadmap <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: AI Copilot Advisory Hub (Col-Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* AI Roadmap Suggestions */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.015)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-xl" />
            <div className="space-y-1 relative z-10">
              <span className="text-[9px] uppercase font-black text-purple-600 dark:text-purple-400 tracking-widest font-mono block">Intelligent Copilot</span>
              <h3 className="font-bold text-gray-950 dark:text-zinc-100 flex items-center gap-1.5 font-display text-base">
                <Sparkles className="w-4.5 h-4.5 text-purple-500 animate-pulse" /> Skill Gap Advisor
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                Cognitive evaluation of gaps based on compiled active tracks.
              </p>
            </div>

            <div className="p-4 bg-purple-50/50 dark:bg-zinc-950/20 border border-purple-100/40 dark:border-zinc-800/80 rounded-2xl relative z-10">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-950 dark:text-zinc-300 leading-relaxed font-sans">
                  {aiSkillRecommendations.gapAnalysis}
                </p>
              </div>
            </div>

            <div className="space-y-3 relative z-10 pt-2">
              <h4 className="text-[10px] font-bold text-gray-400 hover:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Map className="w-3.5 h-3.5 text-purple-500" /> Recommended Adjacent Skills
              </h4>
              
              <div className="space-y-2">
                {aiSkillRecommendations.nextSuggestions.map((adj, key) => (
                  <div 
                    key={key}
                    className="p-3 bg-gray-50/50 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-850 rounded-xl text-xs font-semibold text-gray-750 dark:text-zinc-300 flex items-center justify-between hover:border-violet-300/30 transition-all cursor-pointer"
                    onClick={() => {
                      setNewSkillName(adj);
                      setIsAddOpen(true);
                      addToast(`Selected "${adj}" adjacent recommendation!`, "info");
                    }}
                  >
                    <span>{adj}</span>
                    <Plus className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Productivity Highlights Card */}
          <div className="p-6 bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white rounded-3xl space-y-4 shadow-xl shadow-purple-500/5">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest opacity-80 font-mono block">Dynamic Analytics</span>
              <h4 className="font-extrabold text-[15px] font-display flex items-center gap-2">
                <Award className="w-5 h-5 fill-current" /> Active Learning Milestones
              </h4>
            </div>
            
            <p className="text-xs opacity-90 leading-relaxed">
              Every practice run, checked action item, and goal target is monitored back-end to compute your streak momentum and learning consistency ratio. Maintain daily logs to unlock higher tiers!
            </p>

            <div className="p-3 bg-white/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-300 fill-current" />
                <span className="text-xs font-bold font-mono">Completed checkouts</span>
              </div>
              <span className="text-xs font-black font-mono bg-white/20 px-2 py-0.5 rounded">
                +{skills.filter(s=>s.progress === 100).length} Finished
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: ADD SKILL OVERLAY */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 w-full max-w-lg p-6 md:p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-zinc-50">Create Skill Tracker</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSkill} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Skill Focus Area</label>
                  <input 
                    type="text" 
                    required
                    value={newSkillName}
                    onChange={e => setNewSkillName(e.target.value)}
                    placeholder="e.g. Master React Hooks, French Conversation"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select 
                      value={newSkillCategory} 
                      onChange={e => setNewSkillCategory(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-zinc-100 focus:outline-none"
                    >
                      {CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Difficulty</label>
                    <select 
                      value={newSkillDifficulty} 
                      onChange={e => setNewSkillDifficulty(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-zinc-100 focus:outline-none"
                    >
                      {DIFFICULTY_LEVELS.map(difficulty => (
                        <option key={difficulty} value={difficulty}>{difficulty}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Goal Completion Target (Optional)</label>
                  <input 
                    type="date" 
                    value={newSkillGoalDate}
                    onChange={e => setNewSkillGoalDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Focus Notes & Objectives</label>
                  <textarea 
                    rows={3}
                    value={newSkillNotes}
                    onChange={e => setNewSkillNotes(e.target.value)}
                    placeholder="Describe your tracking goals, milestones, or current skill block definitions."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs hover:shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCreating ? 'Deploying...' : 'Deploy Tracker'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT SKILL OVERLAY */}
      <AnimatePresence>
        {editingSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSkill(null)}
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-105 dark:border-zinc-800 w-full max-w-lg p-6 md:p-8 shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-gray-950 dark:text-zinc-50">Edit Skill Tracker</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Skill Focus Area</label>
                  <input 
                    type="text" 
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select 
                      value={editCategory} 
                      onChange={e => setEditCategory(e.target.value)}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-zinc-150 focus:outline-none"
                    >
                      {CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Difficulty</label>
                    <select 
                      value={editDifficulty} 
                      onChange={e => setEditDifficulty(e.target.value as Difficulty)}
                      className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-gray-800 dark:text-zinc-150 focus:outline-none"
                    >
                      {DIFFICULTY_LEVELS.map(difficulty => (
                        <option key={difficulty} value={difficulty}>{difficulty}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Manual Progress% ({editProgress}%)</label>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={editProgress}
                      onChange={e => setEditProgress(Number(e.target.value))}
                      className="w-full py-2 accent-purple-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Goal Date Target</label>
                    <input 
                      type="date" 
                      value={editGoalDate}
                      onChange={e => setEditGoalDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-550 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Notes & Target Descriptions</label>
                  <textarea 
                    rows={3}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingSkill(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-805 text-gray-500 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-zinc-850 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
