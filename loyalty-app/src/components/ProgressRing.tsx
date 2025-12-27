"use client";

import { motion } from "framer-motion";

interface ProgressRingProps {
    current: number;
    total: number;
    size?: number;
    strokeWidth?: number;
}

export default function ProgressRing({
    current,
    total,
    size = 280,
    strokeWidth = 20,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = (current / total) * circumference;
    const percentage = Math.round((current / total) * 100);

    return (
        <div className="relative flex items-center justify-center transition-all duration-500 ease-out" style={{ width: size, height: size }}>
            {/* Background Glow */}
            <div
                className="absolute inset-0 rounded-full blur-3xl opacity-20"
                style={{ background: 'var(--primary)' }}
            />

            <svg width={size} height={size} className="transform -rotate-90 drop-shadow-2xl">
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-white/5"
                />

                {/* Progress Circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="var(--primary)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="glow-primary"
                />
            </svg>

            {/* Percentage Center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-6xl font-black font-outfit tracking-tighter"
                >
                    {percentage}%
                </motion.span>
                <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="text-white/60 font-semibold uppercase tracking-widest text-xs"
                >
                    {current} / {total} {current === 1 ? 'Visit' : 'Visits'}
                </motion.span>
            </div>
        </div>
    );
}
