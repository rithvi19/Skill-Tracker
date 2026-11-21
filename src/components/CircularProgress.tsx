import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface CircularProgressProps {
  value: number; // 0 to 100
  size?: number; // width/height in px
  strokeWidth?: number;
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export default function CircularProgress({
  value = 0,
  size = 80,
  strokeWidth = 8,
  showText = true,
  className = "",
  glow = false
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Stagger transition slightly on mount
    const timer = setTimeout(() => {
      setAnimatedValue(Math.min(100, Math.max(0, value)));
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 overflow-visible"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          className="text-gray-200 dark:text-zinc-800 transition-colors duration-350"
          strokeWidth={strokeWidth}
        />

        {/* Outer neon glow for premium SaaS feel */}
        {glow && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-purple-500, #a855f7)"
            strokeWidth={strokeWidth + 2}
            className="opacity-20 blur-[3px]"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}

        {/* Foreground active indicator circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#purpleGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" /> {/* Violet 500 */}
            <stop offset="100%" stopColor="#d946ef" /> {/* Fuchsia 500 */}
          </linearGradient>
        </defs>
      </svg>

      {/* Percentage label */}
      {showText && (
        <span className="absolute text-center font-mono font-bold text-gray-800 dark:text-zinc-100 transition-colors" style={{ fontSize: size * 0.22 }}>
          {Math.round(animatedValue)}%
        </span>
      )}
    </div>
  );
}
