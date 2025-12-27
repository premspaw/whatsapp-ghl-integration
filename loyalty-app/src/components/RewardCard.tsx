"use client";

import { motion } from "framer-motion";
import { Lock, CheckCircle2, ChevronRight, Gift } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface RewardCardProps {
    name: string;
    description: string;
    requiredVisits: number;
    currentVisits: number;
    isUnlocked: boolean;
    isClaimed: boolean;
    image?: string;
    onClaim?: () => void;
}

export default function RewardCard({
    name,
    description,
    requiredVisits,
    currentVisits,
    isUnlocked,
    isClaimed,
    image,
    onClaim,
}: RewardCardProps) {
    const progress = Math.min((currentVisits / requiredVisits) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -4 }}
            className={cn(
                "glass-card p-5 relative overflow-hidden group transition-all duration-500",
                isUnlocked && !isClaimed ? "border-teal-500/30 bg-teal-500/5 shadow-[0_0_30px_rgba(45,212,191,0.1)]" : "border-white/5",
                isClaimed && "grayscale opacity-60"
            )}
        >
            {/* Background Decor */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Gift size={80} />
            </div>

            <div className="flex gap-4 relative z-10">
                {/* Image/Icon Circle */}
                <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 overflow-hidden relative",
                    isUnlocked ? "bg-teal-500 text-white shadow-[0_0_20px_rgba(45,212,191,0.3)]" : "bg-white/5 text-white/20"
                )}>
                    {image ? (
                        <img
                            src={image}
                            className={cn(
                                "w-full h-full object-cover transition-all duration-700",
                                !isUnlocked && "grayscale opacity-30"
                            )}
                            alt={name}
                        />
                    ) : (
                        isClaimed ? <CheckCircle2 size={24} /> : (isUnlocked ? <Gift size={24} /> : <Lock size={24} />)
                    )}

                    {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Lock size={16} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className={cn(
                            "text-[13px] font-black uppercase tracking-tight font-outfit",
                            isUnlocked ? "text-white" : "text-white/40"
                        )}>
                            {name}
                        </h3>
                        {!isUnlocked && (
                            <span className="text-[9px] font-black bg-white/5 text-white/30 px-2.5 py-1 rounded-full whitespace-nowrap border border-white/5">
                                {requiredVisits - currentVisits} VISIT{requiredVisits - currentVisits > 1 ? 'S' : ''} LEFT
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] font-medium text-white/30 leading-tight mt-1.5 flex items-center gap-1">
                        {description}
                    </p>

                    {/* Progress Mini-bar */}
                    {!isClaimed && (
                        <div className="mt-4">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${progress}%` }}
                                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                    className={cn(
                                        "h-full rounded-full transition-shadow duration-500",
                                        isUnlocked ? "bg-teal-500 shadow-[0_0_10px_rgba(45,212,191,0.5)]" : "bg-white/10"
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action */}
                    {isUnlocked && !isClaimed && (
                        <button
                            onClick={onClaim}
                            className="mt-4 w-full py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(45,212,191,0.3)]"
                        >
                            Claim this treatment <ChevronRight size={14} />
                        </button>
                    )}

                    {isClaimed && (
                        <p className="mt-4 text-[10px] font-black text-teal-500 uppercase flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-teal-500" /> Redeemed & Verified
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
