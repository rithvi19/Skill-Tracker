import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div id="toast-wrapper" className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let icon = <Info className="w-5 h-5 text-purple-500" />;
          let borderCls = "border-purple-200 dark:border-purple-950/40 bg-white dark:bg-zinc-950/90";
          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            borderCls = "border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-zinc-950/90";
          } else if (toast.type === 'error') {
            icon = <AlertCircle className="w-5 h-5 text-rose-500" />;
            borderCls = "border-rose-250 dark:border-rose-950/40 bg-rose-50/15 dark:bg-zinc-950/90";
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -15, opacity: 0, scale: 0.9 }}
              layout
              className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md shadow-lg ${borderCls} transition-colors duration-250`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-150/50 dark:hover:bg-zinc-800/40 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
