"use client";

import { use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Calendar, ChevronRight, Activity, Zap, ShieldCheck, Info, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSkinAnalysisHistory } from "@/lib/api";

export default function ProgressPage({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<string>("oiliness");

    useEffect(() => {
        const storedUser = localStorage.getItem(`loyalty_user_${locationId}`);
        if (storedUser) {
            const user = JSON.parse(storedUser);
            getSkinAnalysisHistory(locationId, user.contactId || user.phone)
                .then(res => {
                    if (res.success) setHistory(res.history);
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [locationId]);

    const metrics = [
        { id: "oiliness", label: "Oiliness", color: "bg-blue-500", text: "text-blue-400" },
        { id: "acne", label: "Acne", color: "bg-red-500", text: "text-red-400" },
        { id: "pigmentation", label: "Pigmentation", color: "bg-yellow-500", text: "text-yellow-400" },
        { id: "pores", label: "Pores", color: "bg-teal-500", text: "text-teal-400" },
        { id: "texture", label: "Texture", color: "bg-emerald-500", text: "text-emerald-400" },
        { id: "darkCircles", label: "Dark Circles", color: "bg-purple-500", text: "text-purple-400" },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full"
                />
            </div>
        );
    }

    const getScoreValue = (scoreData: any): number => {
        if (typeof scoreData === 'number') return scoreData;
        if (typeof scoreData === 'object' && scoreData !== null) return scoreData.value || 0;
        return 0;
    };

    const currentScoreData = history[0]?.analysis_data?.scorecard?.[selectedMetric];
    const previousScoreData = history[1]?.analysis_data?.scorecard?.[selectedMetric];

    const currentScore = getScoreValue(currentScoreData);
    const previousScore = getScoreValue(previousScoreData);
    const improvement = previousScore ? previousScore - currentScore : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a2332] text-white p-4 pb-32">
            <div className="max-w-md mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">Session History</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        </div>
                        <h1 className="text-3xl font-black font-outfit uppercase tracking-tighter leading-none">
                            Clinical <span className="text-teal-500">Progress</span>
                        </h1>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-none mt-2">
                            Tracking {history.length} Analysis Sessions
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20 shadow-xl">
                        <TrendingUp size={28} />
                    </div>
                </div>

                {/* Metric Selector */}
                <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                        {metrics.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedMetric(m.id)}
                                className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedMetric === m.id
                                    ? `${m.color} text-black border-transparent shadow-lg shadow-${m.id}-500/20`
                                    : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                                    }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Trend Chart (Custom Visual) */}
                <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-5 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                    {/* Background Visual Layer */}
                    <div className="absolute inset-0 opacity-[0.07] grayscale pointer-events-none">
                        <img src="/skin-progress-promo.png" alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1419] via-transparent to-[#0f1419]" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-0.5">Impact Analysis</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black leading-none">{currentScore}%</span>
                                    {improvement !== 0 && (
                                        <div className={`flex items-center text-[8px] font-black ${improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {improvement > 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                            {Math.abs(improvement)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-[7px] font-black text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/10">
                                {selectedMetric}
                            </div>
                        </div>

                        {/* Informational Text to fill space */}
                        <div className="mb-4 bg-white/[0.03] p-2.5 rounded-xl border border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Activity size={10} className="text-teal-400" />
                                <span className="text-[7px] font-black uppercase tracking-widest text-white/40">Clinical Observation</span>
                            </div>
                            <p className="text-[9px] text-white/60 font-medium leading-relaxed uppercase tracking-tight">
                                {improvement > 0
                                    ? `Clinical progress verified. ${selectedMetric} levels show positive trajectory.`
                                    : `Baseline established. Consistent tracking required for trend analysis.`}
                            </p>
                        </div>

                        <div className="relative h-24 flex items-end justify-between gap-2 px-1">
                            {/* Dashboard Grid Overlay */}
                            <div className="absolute inset-0 grid grid-cols-6 gap-0 opacity-[0.05] pointer-events-none">
                                {[...Array(6)].map((_, i) => <div key={i} className="border-r border-white/20" />)}
                            </div>
                            <div className="absolute inset-0 grid grid-rows-4 gap-0 opacity-[0.05] pointer-events-none">
                                {[...Array(4)].map((_, i) => <div key={i} className="border-t border-white/20" />)}
                            </div>

                            {/* Session Bars - Showing up to 6 most recent sessions */}
                            {[...Array(6)].map((_, i) => {
                                const sessionIdx = 5 - i;
                                const session = history[sessionIdx];
                                const score = getScoreValue(session?.analysis_data?.scorecard?.[selectedMetric]);
                                const isCurrent = sessionIdx === 0;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                                        <div className="relative w-full flex flex-col items-center justify-end h-full">
                                            <AnimatePresence mode="wait">
                                                {session && (
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{
                                                            height: `${score}%`,
                                                            boxShadow: isCurrent ? ["0 0 0px rgba(45,212,191,0)", "0 0 10px rgba(45,212,191,0.5)", "0 0 0px rgba(45,212,191,0)"] : "none"
                                                        }}
                                                        transition={{
                                                            height: { duration: 1, ease: "easeOut" },
                                                            boxShadow: { repeat: Infinity, duration: 2 }
                                                        }}
                                                        className={`w-full max-w-[8px] rounded-full relative group-hover:w-[12px] transition-all duration-500 ${isCurrent ? metrics.find(m => m.id === selectedMetric)?.color : 'bg-white/10'
                                                            }`}
                                                    >
                                                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-1 rounded`}>
                                                            {score}%
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {!session && (
                                                <div className="w-full max-w-[8px] h-1.5 bg-white/5 rounded-full opacity-20" />
                                            )}
                                        </div>
                                        <span className={`text-[7px] font-black uppercase tracking-tighter ${session ? 'text-white/60' : 'text-white/10'}`}>
                                            S{i + 1}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-blue-400" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Clinical Trend Verified</span>
                        </div>
                        <div className="text-[8px] font-black text-teal-400 uppercase tracking-widest">
                            Target: &lt; 20%
                        </div>
                    </div>
                </div>

                {/* Session Breakdown List */}
                <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Session Timeline</h3>
                    {history.length === 0 ? (
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center">
                            <Info size={24} className="mx-auto text-white/20 mb-3" />
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">No session history found</p>
                        </div>
                    ) : (
                        history.map((session, idx) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 flex items-center gap-5 group hover:bg-white/[0.05] transition-all shadow-xl backdrop-blur-md"
                            >
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 relative">
                                    {session.image_url ? (
                                        <img src={session.image_url} alt="Session" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">
                                            <Activity size={24} />
                                        </div>
                                    )}
                                    <div className="absolute top-0 right-0 p-1">
                                        <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={12} className="text-white/20" />
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                            {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white/90">Session {history.length - idx} Report</h3>
                                    <div className="flex gap-1.5 mt-2">
                                        {Object.entries(session.analysis_data.scorecard || {}).slice(0, 3).map(([key, val]: [string, any]) => (
                                            <div key={key} className="bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                                <span className="text-[7px] font-black uppercase text-white/40 tracking-tighter">{key}: {getScoreValue(val)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:translate-x-1 transition-transform">
                                    <ChevronRight className="text-white/20" size={16} />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Clinical Note */}
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <ShieldCheck size={80} className="text-teal-400" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-[11px] font-black text-teal-400 uppercase tracking-[0.3em] mb-4">Treatment Consistency</h4>
                        <p className="text-xs text-white/60 font-medium leading-relaxed uppercase tracking-tight">
                            Your skin cells regenerate every 28-40 days. For definitive clinical results, we track progress across <span className="text-teal-400">6 sessions</span>. Consistent treatment during this window locks in your skin's new healthy baseline.
                        </p>
                        <div className="mt-6 flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#121821] bg-teal-500/20 flex items-center justify-center">
                                        <Zap size={10} className="text-teal-400" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                {6 - history.length} Sessions to target
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}
