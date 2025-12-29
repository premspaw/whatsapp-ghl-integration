"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Gift, Check, Lock, Sparkles } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useRef } from "react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MilestonePathProps {
    currentVisits: number;
    totalMilestones: number;
    rewards: { visit: number; name: string; image?: string }[];
}

export default function MilestonePath({ currentVisits, totalMilestones, rewards }: MilestonePathProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // Parallax effect for the progress line
    const lineOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);
    const lineScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

    return (
        <div ref={containerRef} className="relative w-full py-12 px-4 select-none">
            {/* Ambient Background Glow */}
            <motion.div
                style={{ opacity: scrollYProgress }}
                className="absolute inset-0 pointer-events-none"
            >
                <div className="absolute top-1/4 left-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-x-1/2" />
                <div className="absolute bottom-1/4 right-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-x-1/2" />
            </motion.div>

            {/* Legend / Title */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex justify-between items-end mb-12"
            >
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-500/80">Journey to Radiance</h3>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Earn stamps to reveal rewards</p>
                </div>
                <div className="text-right">
                    <motion.span
                        key={currentVisits}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-2xl font-black font-outfit text-white inline-block"
                    >
                        {currentVisits}
                    </motion.span>
                    <span className="text-xs font-black text-white/20 uppercase ml-1">Stamps</span>
                </div>
            </motion.div>

            <div className="relative flex flex-col items-center">
                {/* Vertical Connector Line */}
                <div className="absolute top-0 bottom-0 w-2 bg-white/5 rounded-full" />

                {/* Animated Progress Fill Line with Parallax */}
                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(Math.min(currentVisits, totalMilestones) / totalMilestones) * 100}%` }}
                    style={{ opacity: lineOpacity, scaleX: lineScale }}
                    transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    className="absolute top-0 w-2 bg-gradient-to-b from-teal-400 via-teal-500 to-rose-400 rounded-full z-0 shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                >
                    {/* Animated shimmer effect */}
                    <motion.div
                        animate={{
                            y: ["-100%", "200%"],
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: "linear"
                        }}
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent"
                    />
                </motion.div>

                <div className="space-y-12 w-full relative z-10">
                    {Array.from({ length: totalMilestones }).map((_, i) => {
                        const step = i + 1;
                        const isCompleted = step <= currentVisits;
                        const isCurrent = step === currentVisits + 1;
                        const reward = rewards.find(r => r.visit === step);

                        return (
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: step % 2 === 0 ? 50 : -50, rotateY: 45 }}
                                whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{
                                    duration: 0.7,
                                    delay: i * 0.1,
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 20
                                }}
                                className="flex items-center group"
                            >
                                {/* Left Side: Step Label */}
                                <div className="flex-1 text-right pr-6">
                                    {reward ? (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            whileHover={{ x: -10, scale: 1.1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className={cn(
                                                "inline-block text-[11px] font-black uppercase tracking-tighter px-4 py-1.5 rounded-xl border transition-all duration-500",
                                                isCompleted ? "border-teal-500 text-teal-400 bg-teal-500/10 shadow-[0_0_20px_rgba(45,212,191,0.3)]" :
                                                    isCurrent ? "border-teal-500/50 text-white bg-teal-500/20 shadow-[0_0_30px_rgba(45,212,191,0.4)] animate-pulse" :
                                                        "border-white/10 text-white/40 bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {!isCompleted && <Lock size={10} className={isCurrent ? "text-teal-400" : "text-white/20"} />}
                                                {reward.name}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                                            isCompleted ? "text-teal-500/40" : isCurrent ? "text-teal-500/80 underline decoration-teal-500/30 underline-offset-4" : "text-white/10"
                                        )}>
                                            Step {step}
                                        </span>
                                    )}
                                </div>

                                {/* Center: Node with Floating Particles */}
                                <div className="relative">
                                    {/* Particle field for "Next Stop" - more aggressive and attractive */}
                                    {isCurrent && (
                                        <>
                                            {[...Array(8)].map((_, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    className="absolute w-1.5 h-1.5 bg-teal-400 rounded-full blur-[1px]"
                                                    animate={{
                                                        x: [0, Math.cos(idx * 45 * Math.PI / 180) * 45],
                                                        y: [0, Math.sin(idx * 45 * Math.PI / 180) * 45],
                                                        opacity: [0, 1, 0],
                                                        scale: [0, 1.5, 0]
                                                    }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 1.5,
                                                        delay: idx * 0.15,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}

                                    <motion.div
                                        initial={false}
                                        animate={{
                                            scale: isCompleted ? 1 : isCurrent ? [1, 1.25, 1] : 0.95,
                                            rotate: isCompleted ? 0 : isCurrent ? [0, 3, -3, 0] : 0,
                                            boxShadow: isCurrent ? "0 0 40px rgba(45,212,191,0.6)" : "none"
                                        }}
                                        transition={{
                                            scale: { repeat: isCurrent ? Infinity : 0, duration: 1.5 },
                                            rotate: { repeat: isCurrent ? Infinity : 0, duration: 4 },
                                            boxShadow: { repeat: isCurrent ? Infinity : 0, duration: 1.5 }
                                        }}
                                        whileHover={{ scale: 1.3, rotate: 360 }}
                                        whileTap={{ scale: 0.9 }}
                                        className={cn(
                                            "w-16 h-16 rounded-[2rem] flex items-center justify-center border-2 transition-all duration-700 relative z-10 overflow-hidden cursor-pointer",
                                            isCompleted ? "bg-teal-500 border-teal-300 text-white shadow-[0_0_30px_rgba(45,212,191,0.6)]" :
                                                isCurrent ? "bg-[#0f1419] border-teal-400 text-white" :
                                                    "bg-[#0a0a0a]/80 border-white/10 text-white/10"
                                        )}
                                    >
                                        {reward?.image ? (
                                            <div className="relative w-full h-full">
                                                <motion.img
                                                    src={reward.image}
                                                    initial={{ scale: 1.5, filter: "blur(10px)" }}
                                                    whileInView={{ scale: 1, filter: isCompleted ? "blur(0px)" : isCurrent ? "blur(2px)" : "blur(5px)" }}
                                                    transition={{ duration: 0.8 }}
                                                    className={cn(
                                                        "w-full h-full object-cover transition-all duration-1000",
                                                        !isCompleted ? "grayscale opacity-50 contrast-150" : "contrast-100"
                                                    )}
                                                    alt={reward.name}
                                                />
                                                {/* Shimmer Effect for Next Reward */}
                                                {!isCompleted && isCurrent && (
                                                    <motion.div
                                                        animate={{ x: ["-100%", "200%"] }}
                                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                                                    />
                                                )}
                                                {!isCompleted && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                                        <Lock size={18} className={cn("transition-colors", isCurrent ? "text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,1)]" : "text-white/20")} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            reward ? (
                                                <motion.div
                                                    animate={isCompleted ? { y: [-3, 3, -3] } : isCurrent ? { scale: [1, 1.2, 1] } : {}}
                                                    transition={{ repeat: Infinity, duration: 2 }}
                                                    className="flex flex-col items-center"
                                                >
                                                    <Gift size={24} className={cn(isCompleted ? "text-white" : isCurrent ? "text-teal-400" : "opacity-30")} />
                                                </motion.div>
                                            ) : (
                                                isCompleted ? (
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -180 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        transition={{ type: "spring", stiffness: 200 }}
                                                        className="flex items-center justify-center"
                                                    >
                                                        <Check size={28} strokeWidth={4} />
                                                    </motion.div>
                                                ) : <span className={cn("text-sm font-black", isCurrent ? "text-teal-500" : "")}>{step}</span>
                                            )
                                        )}
                                    </motion.div>

                                    {/* Radiant Glow for Next Stop */}
                                    {isCurrent && (
                                        <motion.div
                                            animate={{
                                                scale: [1, 2, 1],
                                                opacity: [0.4, 0.1, 0.4]
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 3,
                                                ease: "easeInOut"
                                            }}
                                            className="absolute inset-x-[-20%] inset-y-[-20%] rounded-full bg-teal-500/40 blur-2xl -z-10"
                                        />
                                    )}
                                </div>

                                {/* Right Side: Status Indicator */}
                                <div className="flex-1 pl-6">
                                    {isCurrent && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex flex-col"
                                        >
                                            <div className="flex items-center gap-2">
                                                <motion.div
                                                    animate={{ scale: [1, 1.8, 1], opacity: [1, 0.5, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                    className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]"
                                                />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-400 drop-shadow-[0_0_5px_rgba(45,212,191,0.5)]">Next Reward</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Visit #{step} to Unlock</span>
                                        </motion.div>
                                    )}
                                    {reward && isCompleted && !isCurrent && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-1.5 text-teal-400"
                                        >
                                            <Sparkles size={14} className="animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Unlocked & Claimed</span>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Path End Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
                className="mt-16 text-center"
            >
                <motion.div
                    whileHover={{ scale: 1.1, boxShadow: "0 0 50px rgba(45, 212, 191, 0.4)" }}
                    className="inline-block px-8 py-3 rounded-3xl bg-teal-500/10 border border-teal-500/20 cursor-pointer group shadow-2xl"
                >
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-teal-400 flex items-center gap-3">
                        <Gift size={16} className="group-hover:rotate-12 transition-transform" />
                        Ultimate Reward at Visit {totalMilestones}
                    </p>
                </motion.div>
            </motion.div>

        </div>
    );
}
