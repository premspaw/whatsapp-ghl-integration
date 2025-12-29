"use client";

import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Gift, Share2, ChevronRight, Info, ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import MilestonePath from "@/components/MilestonePath";
import Navbar from "@/components/Navbar";
import { getLoyaltyData, getCustomerData } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import SkinAnalysisReport from "../../../components/SkinAnalysisReport";

export default function LoyaltyHome({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);
    const searchParams = useSearchParams();
    const [data, setData] = useState<{ settings: any, milestones: any[] } | null>(null);
    const [customer, setCustomer] = useState<{ visits: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<{ name: string; phone: string; contactId: string } | null>(null);
    const [showError, setShowError] = useState(false);

    const [hasAnalysis, setHasAnalysis] = useState(false);
    const [analysisStats, setAnalysisStats] = useState<{ score: number, improvement: number, metric: string } | null>(null);

    useEffect(() => {
        const checkAnalysis = async () => {
            if (!user) return;

            // Try localStorage first for immediate UI
            const lastReport = localStorage.getItem('last_skin_analysis_report');
            if (lastReport) {
                const report = JSON.parse(lastReport);
                const scorecard = report.scorecard || {};
                const firstMetric = Object.keys(scorecard)[0] || 'oiliness';
                const scoreData = scorecard[firstMetric];
                const score = typeof scoreData === 'object' ? scoreData.value : scoreData;

                setHasAnalysis(true);
                setAnalysisStats({
                    score: score || 0,
                    improvement: 5, // Placeholder for first scan
                    metric: firstMetric
                });
            }

            // Sync with DB history if available
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:30001';
                const response = await fetch(`${baseUrl}/api/v1/loyalty/analysis/${locationId}/${user.contactId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.history && data.history.length > 0) {
                        const history = data.history;
                        const latest = history[0].analysis_data;
                        const scorecard = latest.scorecard || {};
                        const metric = Object.keys(scorecard)[0] || 'oiliness';
                        const currentVal = typeof scorecard[metric] === 'object' ? scorecard[metric].value : scorecard[metric];

                        let improvement = 0;
                        if (history.length > 1) {
                            const prev = history[1].analysis_data.scorecard || {};
                            const prevVal = typeof prev[metric] === 'object' ? prev[metric].value : prev[metric];
                            improvement = (prevVal || 0) - (currentVal || 0);
                        }

                        setHasAnalysis(true);
                        setAnalysisStats({
                            score: currentVal || 0,
                            improvement,
                            metric
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch history for dashboard", err);
            }
        };

        if (user && !isLoading) {
            checkAnalysis();
        }
    }, [user, locationId, isLoading]);

    useEffect(() => {
        // Get contact data from GHL URL params
        const contactId = searchParams.get('contact') || searchParams.get('contact_id') || searchParams.get('cid');
        const name = searchParams.get('name') || 'Valued Member';
        const phone = searchParams.get('phone') || '';

        // If no contact info in URL, check localStorage (for return visits)
        let userInfo = null;
        if (contactId) {
            userInfo = { contactId, name, phone };
            // Store for future visits
            localStorage.setItem(`loyalty_user_${locationId}`, JSON.stringify(userInfo));
            setUser(userInfo);
        } else {
            // Try to get from localStorage
            const storedUser = localStorage.getItem(`loyalty_user_${locationId}`);
            if (storedUser) {
                userInfo = JSON.parse(storedUser);
                setUser(userInfo);
            } else {
                // If no contact data, redirect to error state
                setShowError(true);
                setIsLoading(false);
            }
        }

        const fetchAll = async () => {
            const [loyaltyData, custData] = await Promise.all([
                getLoyaltyData(locationId),
                getCustomerData(locationId, userInfo.contactId)
            ]);
            setData(loyaltyData);
            setCustomer(custData);
            setIsLoading(false);
        };
        fetchAll();
    }, [locationId, searchParams]);

    // Show error if accessed without GHL contact data
    if (showError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card p-8 max-w-md text-center">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black uppercase mb-2">Access Required</h2>
                    <p className="text-white/60 text-sm">
                        Please access this loyalty program through the link sent by <strong>{locationId}</strong>.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full"
                />
            </div>
        );
    }

    const business = data?.settings || {
        name: "Lumina Derma Care",
        primary_color: "#2dd4bf",
        secondary_color: "#fb7185"
    };

    const currentVisits = customer?.visits || 0;
    const totalVisits = 10;

    const rewards = data?.milestones.map((m: any) => ({
        visit: m.visit_number,
        name: m.reward_name,
        image: m.reward_image
    })) || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a2332] text-white p-4 pb-32 overflow-x-hidden">
            <div className="max-w-md mx-auto space-y-8">
                {/* Header / Profile Section */}
                <div className="flex items-center justify-between bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/10 transition-colors" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">Welcome Back</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        </div>
                        <h1 className="text-3xl font-black font-outfit uppercase tracking-tighter leading-none">
                            Hello, <span className="text-teal-500">{user?.name.split(' ')[0] || 'Guest'}</span>
                        </h1>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-none mt-2">
                            {business.business_name || business.name} Client
                        </p>
                    </div>

                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 text-teal-400 flex items-center justify-center font-black text-xl border border-teal-500/20 shadow-xl backdrop-blur-md">
                            {user?.name.charAt(0).toUpperCase() || 'G'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-[10px] text-black border-2 border-[#121821]">
                            ✓
                        </div>
                    </div>
                </div>

                <section className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 via-rose-500/20 to-teal-500/20 rounded-[2.6rem] blur-xl opacity-20" />
                    <div className="relative">
                        {hasAnalysis && analysisStats && searchParams.get('action') !== 'scan' ? (
                            <Link href={`/rewards/${locationId}/progress`} className="block group">
                                <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm group-hover:border-teal-500/30 transition-all duration-500">
                                    {/* Background Visual Layer */}
                                    <div className="absolute inset-0 opacity-[0.05] grayscale group-hover:opacity-10 transition-opacity">
                                        <img src="/skin-progress-promo.png" alt="" className="w-full h-full object-cover" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Clinical Impact Score</h3>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-black leading-none">{analysisStats.score}%</span>
                                                    {analysisStats.improvement !== 0 && (
                                                        <div className={`flex items-center text-[9px] font-black ${analysisStats.improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {analysisStats.improvement > 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                                                            {Math.abs(analysisStats.improvement)}%
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                                                <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest leading-none">
                                                    {analysisStats.metric}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30 pt-4 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} className="text-teal-400" />
                                                Live Tracker Active
                                            </div>
                                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <SkinAnalysisReport />
                        )}
                    </div>
                </section>

                {/* Status / Instructions */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-white/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-white/[0.03] p-5 rounded-[2rem] border border-white/10 flex gap-4 items-center shadow-xl backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/10 shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">Path to Perfection</h4>
                            <p className="text-[10px] text-white/40 font-bold leading-relaxed mt-1 uppercase tracking-tight">
                                Complete 10 visits to unlock <span className="text-teal-400">Elite Radiance Benefits</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Milestone Roadmap Section */}
                <section className="py-2">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Journey Progress</h3>
                        <div className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                            <span className="text-[10px] font-black text-teal-400">{currentVisits}/{totalVisits} STAMPS</span>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] rounded-[2.5rem] border border-white/5 p-4 shadow-3xl backdrop-blur-sm">
                        <MilestonePath
                            currentVisits={currentVisits}
                            totalMilestones={totalVisits}
                            rewards={rewards}
                        />
                    </div>
                </section>

                {/* Action Cards */}
                <div className="grid gap-4">
                    {/* View All Rewards CTA */}
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 group cursor-pointer hover:bg-white/[0.05] transition-all shadow-xl backdrop-blur-md"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/10 group-hover:scale-110 transition-transform">
                            <Trophy size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white/90">Reward Catalog</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Unlock VIP Privileges</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:translate-x-1 transition-transform">
                            <ChevronRight className="text-white/20" size={16} />
                        </div>
                    </motion.div>

                    {/* Referral Hook */}
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 relative overflow-hidden group shadow-2xl backdrop-blur-xl"
                    >
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gift size={160} className="text-teal-400 rotate-12" />
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Growth Program</span>
                                <h3 className="text-2xl font-black font-outfit uppercase tracking-tighter">Invite Friends</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                                <Gift size={24} />
                            </div>
                        </div>

                        <p className="text-white/40 text-xs font-bold leading-relaxed uppercase tracking-tight relative z-10">
                            Give your clinical journey a boost. Unlock a <span className="text-teal-400">Bonus Stamp</span> for every successful referral.
                        </p>

                        <button className="relative z-10 w-fit bg-teal-500 text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-500/20 hover:scale-105 transition-transform flex items-center gap-2">
                            Share Plan <Share2 size={12} />
                        </button>
                    </motion.div>
                </div>
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}

function Trophy({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 22V18" />
            <path d="M14 22V18" />
            <path d="M12 15a7 7 0 0 0 7-7V4H5v4a7 7 0 0 0 7 7Z" />
        </svg>
    );
}
