"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, QrCode, CheckCircle2, ShieldCheck, Info } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";

import { use } from "react";

export default function ClaimScreen({ params }: { params: Promise<{ locationId: string, rewardId: string }> }) {
    const { locationId, rewardId } = use(params);
    const [isClaimed, setIsClaimed] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Mock reward data
    const reward = {
        name: "Free Protein Shake",
        description: "Get any whey protein shake from the bar.",
        expiry: "Valid for 24 hours",
    };

    const handleManualClaim = () => {
        setIsClaimed(true);
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#9333ea', '#ffffff']
        });
    };

    return (
        <div className="pt-8 space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 px-2">
                <Link href={`/rewards/${locationId}/rewards`} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black font-outfit uppercase tracking-tighter">
                        {isClaimed ? "Reward" : "Claim"} <span className="text-blue-500">{isClaimed ? "Redeemed" : "Reward"}</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none mt-1">
                        {isClaimed ? "Enjoy your perk!" : "Show this to staff"}
                    </p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!isClaimed ? (
                    <motion.div
                        key="unclaimed"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="space-y-6"
                    >
                        {/* QR Code Section */}
                        <div className="glass-card p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            {/* Animated Background Pulse */}
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute inset-0 bg-blue-500 rounded-full blur-[100px]"
                            />

                            <div className="relative z-10 bg-white p-6 rounded-3xl premium-shadow">
                                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-black">
                                    <QrCode size={160} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="mt-8 relative z-10">
                                <h2 className="text-xl font-black font-outfit uppercase tracking-tight">{reward.name}</h2>
                                <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-1 italic">{reward.description}</p>
                            </div>
                        </div>

                        {/* Instruction */}
                        <div className="flex gap-3 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                            <Info className="text-blue-500 shrink-0" size={18} />
                            <p className="text-[11px] text-blue-200/70 font-medium leading-relaxed">
                                Ask the staff member to scan this QR code or click the button below for terminal validation.
                            </p>
                        </div>

                        {/* Manual Validation Button (Staff Only) */}
                        <div className="pt-4">
                            {!showConfirm ? (
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                                >
                                    <ShieldCheck size={16} /> Staff: Validate Manually
                                </button>
                            ) : (
                                <div className="glass-card p-4 border-orange-500/50 bg-orange-500/5">
                                    <p className="text-[10px] font-black uppercase text-orange-400 text-center mb-3">Confirm Manual Redemption?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowConfirm(false)}
                                            className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleManualClaim}
                                            className="flex-1 py-3 bg-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="claimed"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-8 h-[60vh] flex flex-col items-center justify-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                            <CheckCircle2 size={64} />
                        </div>

                        <div>
                            <h2 className="text-3xl font-black font-outfit uppercase tracking-tighter">Awesome!</h2>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-2">
                                Reward claimed successfully
                            </p>
                        </div>

                        <div className="glass-card p-6 w-full">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Transaction ID</span>
                                <span className="text-[10px] font-mono text-white/40">#RWD-492-LQX</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Time</span>
                                <span className="text-[10px] font-mono text-white/40">{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>

                        <Link
                            href={`/rewards/${locationId}`}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest glow-primary"
                        >
                            Go to Dashboard
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            <Navbar locationId={locationId} />
        </div>
    );
}
