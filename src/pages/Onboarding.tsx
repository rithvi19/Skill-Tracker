import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, BrainCircuit, Rocket, ArrowRight, UserCircle2, CheckCircle2 } from 'lucide-react';

const AVATARS = ["🧠", "🚀", "🔥", "🎨", "🧘", "💻", "🥊", "🎼", "✍️", "🧬", "🌟", "🛠️"];
const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const CATEGORIES = ["Programming", "Design", "Writing", "Fitness", "Music", "Languages", "Business", "Academic", "Other"];

export default function Onboarding() {
  const { updateUserObj, addSkill, user, addToast } = useApp();
  const [step, setStep] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState("🧠");
  const [nickName, setNickName] = useState(user?.name || '');

  // First Skill States
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('Programming');
  const [skillDifficulty, setSkillDifficulty] = useState('Beginner');
  const [goalDate, setGoalDate] = useState('');

  const [saving, setSaving] = useState(false);

  // Skip Onboarding directly
  const handleSkipForNow = async () => {
    setSaving(true);
    try {
      await updateUserObj({
        name: nickName.trim() || user?.name || "Learner Core",
        avatar: selectedAvatar,
        onboardingCompleted: true
      });
      addToast("Onboarding setup bypassed successfully.", "info");
      window.location.reload();
    } catch (e) {
      addToast("Bypass failed. Please complete guided setups.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Complete Onboarding
  const handleFinish = async () => {
    if (step === 2 && !skillName.trim()) {
      addToast("Please enter a skill name to begin tracking.", "error");
      return;
    }

    setSaving(true);
    try {
      // 1. Update user profile name and avatar
      const profileOk = await updateUserObj({
        name: nickName,
        avatar: selectedAvatar
      });

      if (!profileOk) {
        addToast("Failed to save profile during onboarding.", "error");
        setSaving(false);
        return;
      }

      // 2. Submit the first skill!
      const skillCreated = await addSkill({
        name: skillName,
        category: skillCategory,
        difficulty: skillDifficulty,
        notes: `My initial focus notes for the ${skillDifficulty} skill of mastering ${skillName}.`,
        goalDate: goalDate || undefined
      });

      if (!skillCreated) {
        addToast("Failed to initialize first skill.", "error");
        setSaving(false);
        return;
      }

      // 3. Mark Onboarding completed
      await updateUserObj({ onboardingCompleted: true });
      setStep(3); // Go to celebration view
    } catch (e) {
      addToast("Critical error during onboarding save.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="onboarding-container" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-8 select-none transition-colors duration-300 relative overflow-hidden">
      
      {/* Lights background */}
      <div className="absolute top-[-25%] left-[-25%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-[120px]" />

      <div className="max-w-xl w-full relative z-10 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-2xl border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-2xl p-8 md:p-12 transition duration-300">
        
        {/* Progress Bar Header */}
        {step < 3 && (
          <div className="mb-8">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              <span>Setup Stage</span>
              <span>Step {step} of 2</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${step === 1 ? 50 : 100}%` }}
                transition={{ cubicBezier: [0.16, 1, 0.3, 1], duration: 0.6 }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 1: WELCOME & AVATAR PICKER */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center sm:text-left">
                <div className="inline-flex p-3 bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl mb-4">
                  <UserCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
                  Design Your Identity
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
                  Let's customize your tracking profile, {user?.name.split(' ')[0]}. Select your identity avatar and nick-label.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={nickName}
                    onChange={e => setNickName(e.target.value)}
                    placeholder="Enter your tracking display name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-3">Choose Your Focus Avatar</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {AVATARS.map((avatarSym) => (
                      <motion.button
                        key={avatarSym}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedAvatar(avatarSym)}
                        className={`text-3xl p-3 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                          selectedAvatar === avatarSym
                            ? 'bg-purple-500/10 border-purple-500 text-purple-900 scale-105 shadow-sm shadow-purple-500/10'
                            : 'bg-gray-50 dark:bg-zinc-950/40 border-gray-150 dark:border-zinc-800/80 hover:border-violet-400 dark:hover:border-zinc-700'
                        }`}
                      >
                        {avatarSym}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100 dark:border-zinc-805/40">
                <button
                  type="button"
                  onClick={handleSkipForNow}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-400 font-bold text-xs uppercase tracking-wider hover:text-gray-650 dark:hover:text-zinc-300 transition shrink-0"
                >
                  Skip for Now
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!nickName.trim()) {
                      addToast("Please input a display name.", "error");
                      return;
                    }
                    setStep(2);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-purple-500/10 transition flex items-center justify-center gap-2"
                >
                  <span>Continue Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: REGISTER FIRST SKILL */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center sm:text-left">
                <div className="inline-flex p-3 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl mb-4">
                  <BrainCircuit className="w-8 h-8 animate-pulse" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
                  What are you mastering today?
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
                  Define your first target skill focus. We will build a customized roadmap of AI learning suggestions.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Skill Title</label>
                  <input 
                    type="text" 
                    required
                    value={skillName}
                    onChange={e => setSkillName(e.target.value)}
                    placeholder="e.g. React Native, Public Speaking, Spanish"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      value={skillCategory} 
                      onChange={e => setSkillCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition"
                    >
                      {CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Difficulty</label>
                    <div className="flex p-1 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/80 rounded-xl">
                      {DIFFICULTY_LEVELS.map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSkillDifficulty(level)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            skillDifficulty === level 
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Goal Date (Optional)</label>
                  <input 
                    type="date" 
                    value={goalDate}
                    onChange={e => setGoalDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-semibold text-gray-400 dark:text-zinc-500 hover:text-gray-600 hover:underline"
                >
                  Back to Profile
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow-md shadow-purple-500/10 transition flex items-center space-x-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Generate My Dashboard</span>
                      <Rocket className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CELEBRATION CARDS */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center space-y-6"
            >
              <div className="inline-flex relative mb-2">
                <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-400/10 blur-xl rounded-full" />
                <motion.div 
                  initial={{ rotate: -10, y: 10 }}
                  animate={{ rotate: 0, y: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="relative p-5 bg-gradient-to-tr from-amber-400 to-yellow-300 text-yellow-900 rounded-3xl shadow-xl shadow-yellow-500/15"
                >
                  <Trophy className="w-12 h-12" />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-1 border-2 border-white dark:border-zinc-900 text-white"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight flex items-center justify-center gap-2">
                  Ready for Lift-Off!
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Your tracking dashboard has been initialized successfully. We've compiled your initial AI recommendations report.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-tr from-violet-50 to-indigo-50/50 dark:from-zinc-800/20 dark:to-zinc-800/10 border border-violet-100/50 dark:border-zinc-800 text-left space-y-3 font-sans max-w-sm mx-auto">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="w-4 h-4" /> Welcome Package Activated
                </div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 space-y-1 ml-6 leading-relaxed">
                  <p>• Profile avatar: <span className="text-lg">{selectedAvatar}</span> ({nickName})</p>
                  <p>• Main Tracking area: <strong>{skillName}</strong></p>
                  <p>• Initial Streak status: <strong>1 Day Active Streak</strong></p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()} // Reload updates global routers instantly to Dashboard
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition flex items-center justify-center gap-2"
              >
                <span>Enter Skill Tracker Hub</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
