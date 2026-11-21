import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, CheckCircle2, RefreshCw, Key, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react';

export default function Auth({ onResetParam }: { onResetParam?: string }) {
  const { login, logout, addToast, token, user, refreshUser } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'verify'>(
    onResetParam ? 'reset' : (user && !user.emailVerified ? 'verify' : 'login')
  );
  
  // Forms states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState(onResetParam || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading and helper simulations
  const [formLoading, setFormLoading] = useState(false);
  const [simulatedMailLink, setSimulatedMailLink] = useState<string | null>(null);

  useEffect(() => {
    if (onResetParam) {
      setMode('reset');
      setResetToken(onResetParam);
    } else if (user && !user.emailVerified) {
      setMode('verify');
    }
  }, [onResetParam, user]);

  // Handle Signup
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password.trim()) {
      addToast("Please fill out all credentials.", "error");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Registration failed." };
      }
      if (res.ok) {
        addToast("Account registered! Please verify your email.", "success");
        // Back up password immediately
        localStorage.setItem('skill_backup_password_' + trimmedEmail.toLowerCase(), password);
        login(data.user, data.token);
        setMode('verify');
      } else {
        addToast(data.error || "SignUp failed.", "error");
      }
    } catch (err) {
      addToast("Connection error in registration.", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      addToast("Please provide both email and password.", "error");
      return;
    }
    setFormLoading(true);
    try {
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      // If the account does not exist on the server, but we have a client local backup, we sync first!
      if (!res.ok) {
        const backupUserStr = localStorage.getItem('skill_backup_user');
        const backupPassword = localStorage.getItem('skill_backup_password_' + trimmedEmail.toLowerCase());
        if (backupUserStr && backupPassword && backupPassword === password) {
          try {
            const backupUser = JSON.parse(backupUserStr);
            if (backupUser && backupUser.email.toLowerCase() === trimmedEmail.toLowerCase()) {
              console.log("[Login Sync] Server environment reset. Syncing local backup with database...");
              
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
                    } catch(e){}
                  }
                }
              }
              
              const syncRes = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user: { ...backupUser, password },
                  skills: skillsBackup,
                  tasks: tasksBackup,
                  logs: logsBackup
                })
              });
              
              if (syncRes.ok) {
                // Retry the login
                res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: trimmedEmail, password })
                });
              }
            }
          } catch(err) {
            console.error("Failed to sync client backup to db:", err);
          }
        }
      }

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Authentication failed. Please verify credentials." };
      }

      if (res.ok) {
        // Back up password on successful login
        localStorage.setItem('skill_backup_password_' + trimmedEmail.toLowerCase(), password);
        login(data.user, data.token);
        // If logged in but email isn't verified, redirect to verify
        if (!data.user.emailVerified) {
          setMode('verify');
        }
      } else {
        addToast(data.error || "Authentication failed.", "error");
      }
    } catch (err) {
      addToast("Connection error in login.", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Code Verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      addToast("Code value required.", "error");
      return;
    }
    setFormLoading(true);
    try {
      const activeToken = token || (user && user.id) || localStorage.getItem('skill_token');
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ code: code.trim() })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Verification failed." };
      }

      if (res.ok) {
        addToast("Email verified successfully! Opening onboarding...", "success");
        await refreshUser();
      } else {
        addToast(data.error || "Verification failed.", "error");
      }
    } catch (err) {
      addToast("Verification error.", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Forgot PW
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      addToast("Email address is mandatory.", "error");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatedMailLink(data.resetToken);
        addToast("Simulation packet sent! Reset token generated.", "success");
      } else {
        addToast(data.error || "Password reset request failed.", "error");
      }
    } catch (err) {
      addToast("Recovery package transmission failed.", "error");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Reset PW
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      addToast("Passwords do not match.", "error");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Password changed! You can log in, now.", "success");
        setSimulatedMailLink(null);
        setMode('login');
      } else {
        addToast(data.error || "Password reset failed.", "error");
      }
    } catch (err) {
      addToast("Credentials reset connection failed.", "error");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div id="auth-root-container" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-12 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 dark:bg-violet-600/15 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/10 dark:bg-fuchsia-600/15 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Core Logo Branding */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25 mb-4"
          >
            <Key className="w-5 h-5 animate-pulse" />
          </motion.div>
          <h2 className="text-3xl font-extrabold font-sans text-gray-900 dark:text-zinc-50 tracking-tight">
            Skill Tracker
          </h2>
        </div>

        {/* Card Frame */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] overflow-hidden p-8 transition-colors duration-300">
          
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Welcome Back</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Access your skills metrics to continue learning</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g. user@email.com" 
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest">Password</label>
                      <button 
                        type="button" 
                        onClick={() => { setMode('forgot'); setSimulatedMailLink(null); }}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline hover:text-purple-500 focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-zinc-800/60 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-purple-900 dark:text-purple-300">Demo Account:</span>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400">rithvik0806@gmail.com</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('rithvik0806@gmail.com');
                        setPassword('password123');
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
                    >
                      Fill Demo
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium text-sm shadow-md shadow-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center justify-center space-x-2"
                  >
                    {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Don't have an account yet?{' '}
                    <button 
                      onClick={() => setMode('signup')}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      Sign Up Now
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* SIGNUP MODE */}
            {mode === 'signup' && (
              <motion.div
                key="signup-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Create Account</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Start detailing and modeling your skills journey.</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. rithvik" 
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g. user@email.com" 
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="•••••••• (min 6 chars)" 
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium text-sm shadow-md shadow-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center justify-center space-x-2"
                  >
                    {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Register Account</span>}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Already have an account?{' '}
                    <button 
                      onClick={() => setMode('login')}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* VERIFY MODE */}
            {mode === 'verify' && (
              <motion.div
                key="verify-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-purple-500 animate-pulse" /> Email Verification
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    We simulated sending a 6-digit confirmation key to <strong>{user?.email || 'your inbox'}</strong>.
                  </p>
                </div>

                <div className="p-4 mb-4 rounded-lg bg-indigo-50 dark:bg-zinc-800/50 border border-indigo-100 dark:border-zinc-800/80">
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4" /> <strong>Testing Shortcut Key: </strong> Use <strong>123456</strong> to instantly fast-track verification!
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">6-Digit Access Code</label>
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="e.g. 123456" 
                      className="w-full text-center py-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-900 dark:text-zinc-100 placeholder-gray-400 font-mono font-bold text-xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center justify-center space-x-2"
                  >
                    {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify Account</span>}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Need to modify account email?{' '}
                    <button 
                      onClick={() => logout()}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      Log out and register again
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Recover Password</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Get a simulated instant reset link for testing.</p>
                </div>

                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g. user@email.com" 
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center justify-center space-x-2"
                  >
                    {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Request Link</span>}
                  </button>
                </form>

                {/* Simulated Recovery Tool Box */}
                {simulatedMailLink && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-purple-50/90 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40"
                  >
                    <p className="text-xs text-purple-900 dark:text-purple-300 font-semibold mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-violet-500" /> Simulated Reset Link Core
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                      We caught the email on the server. Click this fast-track reset block, or copy the link:
                    </p>
                    <button 
                      onClick={() => {
                        setResetToken(simulatedMailLink);
                        setMode('reset');
                      }}
                      className="w-full bg-violet-600 text-white text-xs font-semibold py-2 rounded-md hover:bg-violet-500 transition shadow"
                    >
                      Click to Reset Password Immediately
                    </button>
                  </motion.div>
                )}

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Back to{' '}
                    <button 
                      onClick={() => setMode('login')}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* RESET PASSWORD MODE */}
            {mode === 'reset' && (
              <motion.div
                key="reset-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Setup New Password</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Provide a new password for your account.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Reset Key Token</label>
                    <input 
                      type="text" 
                      required
                      value={resetToken}
                      onChange={e => setResetToken(e.target.value)}
                      placeholder="Enter verification reset token" 
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 rounded-lg text-xs font-mono dark:text-zinc-300 border border-gray-200 dark:border-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-widest mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm shadow-md shadow-purple-500/10 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all flex items-center justify-center space-x-2"
                  >
                    {formLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Nevermind?{' '}
                    <button 
                      onClick={() => setMode('login')}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      Return to Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}
