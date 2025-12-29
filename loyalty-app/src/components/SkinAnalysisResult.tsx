"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, MoreHorizontal, Info, Search, Sliders, Target, Eye, Sparkles, Activity, ShieldCheck, Zap } from 'lucide-react';

interface AnalysisResultData {
    imageQuality?: {
        alignment: string;
        lighting: string;
        obstructions: string;
        suitability: string;
    };
    scorecard?: {
        [key: string]: number | { value: number; status: string };
    };
    analysis?: {
        [key: string]: {
            observed: string;
            interpretation: string;
            severity: string;
        };
    };
    deepAnalysis?: {
        [key: string]: {
            observed: string;
            interpretation: string;
            severity: string;
        };
    };
    overallScore?: {
        average: number;
        rating: string;
    };
    treatments?: {
        primary: string;
        additional: string[];
        note: string;
    };
    summary?: {
        overallCondition: any;
        strongestAreas: any[];
        needsFocus: any[];
    };
    treatmentPlan?: {
        primary: any;
        secondary: any;
        logic?: any;
        explanation?: any;
    };
}

// Global scope helper for absolute reliability
const safeRender = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.map(item => safeRender(item)).join(", ");
    if (typeof val === 'object') {
        return val.status || val.value || val.text || val.title || JSON.stringify(val);
    }
    return String(val);
};

const getScoreValue = (scoreData: any): number => {
    if (typeof scoreData === 'number') return scoreData;
    if (typeof scoreData === 'object' && scoreData !== null) return scoreData.value || 0;
    return 0;
};

function InsightItem({ title, details }: { title: string, details: any }) {
    const [isOpen, setIsOpen] = useState(false);

    const getIcon = (title: string) => {
        const t = title.toLowerCase();
        let src = "/cheek-macro.png";
        if (t.includes('forehead')) src = "/forehead-macro.png";
        if (t.includes('nose')) src = "/nose-macro.png";
        return (
            <div className="relative w-full h-full overflow-hidden rounded-xl">
                <Image src={src} alt={title} fill className="object-cover opacity-80" />
            </div>
        );
    };

    const getSeverityDetails = (sevInput: any) => {
        const score = getScoreValue(sevInput);
        if (score < 25) return { color: 'text-green-400', bar: 'bg-green-500', label: 'Healthy Baseline' };
        if (score < 60) return { color: 'text-yellow-400', bar: 'bg-yellow-500', label: 'Moderate Focus' };
        return { color: 'text-red-400', bar: 'bg-red-400', label: 'High Priority' };
    };

    const sev = getSeverityDetails(details.severity || details.value || 0);

    return (
        <div className="mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-5 rounded-[2rem] flex items-center justify-between text-left transition-all border ${isOpen ? 'bg-white/[0.08] border-white/20' : 'bg-white/[0.03] border-white/5'}`}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                        {getIcon(title)}
                    </div>
                    <div>
                        <span className="text-[11px] font-black uppercase text-white/90">{title.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="text-[8px] font-black uppercase tracking-widest text-white/40">{safeRender(details.severity) || 'Analyzed'}</div>
                    </div>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="mt-2 bg-white/[0.04] border border-white/10 rounded-[2rem] p-6 space-y-4">
                    <div>
                        <span className="text-[9px] font-black uppercase text-blue-400">Scan Observation</span>
                        <p className="text-[11px] text-gray-300 mt-1">{safeRender(details.observed)}</p>
                    </div>
                    <div>
                        <span className="text-[9px] font-black uppercase text-teal-400">AI Insight</span>
                        <p className="text-[11px] text-white/90 italic mt-1">"{safeRender(details.interpretation)}"</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SkinAnalysisResult() {
    const params = useParams();
    const router = useRouter();
    const locationId = params.locationId as string;

    const [data, setData] = useState<AnalysisResultData | null>(null);
    const [userImage, setUserImage] = useState<string | null>(null);

    useEffect(() => {
        const savedReport = localStorage.getItem('last_skin_analysis_report');
        const savedImage = localStorage.getItem('last_skin_analysis_image');
        if (savedReport) {
            try {
                setData(JSON.parse(savedReport));
            } catch (e) {
                console.error("Failed to parse report");
            }
        }
        if (savedImage) setUserImage(savedImage);
    }, []);

    const getScoreColor = (score: number) => {
        if (score < 25) return { bg: 'bg-green-500/20', text: 'text-green-400', fill: 'bg-green-500', label: 'EXCELLENT' };
        if (score < 50) return { bg: 'bg-blue-500/20', text: 'text-blue-400', fill: 'bg-blue-500', label: 'GOOD' };
        if (score < 75) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', fill: 'bg-yellow-500', label: 'MODERATE' };
        return { bg: 'bg-red-500/20', text: 'text-red-400', fill: 'bg-red-500', label: 'NEEDS CARE' };
    };

    if (!data) return (
        <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" />
        </div>
    );

    const scorecard = data.scorecard || {};

    return (
        <div className="min-h-screen bg-[#0f1419] text-white p-5 pb-32">
            <div className="max-w-md mx-auto space-y-8">
                {/* Profile */}
                <div className="flex items-center gap-5 bg-white/[0.03] p-6 rounded-[2.5rem] border border-white/5">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 relative border border-white/10">
                        {userImage && <Image src={userImage} alt="User" fill className="object-cover" />}
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase">Skin Analysis Result</h1>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                            {safeRender(data.summary?.overallCondition) || "Analysis complete"}
                        </p>
                    </div>
                </div>

                {/* Scorecard */}
                <div className="grid grid-cols-3 gap-3">
                    {Object.entries(scorecard).map(([key, val]) => {
                        const score = getScoreValue(val);
                        const colors = getScoreColor(score);
                        return (
                            <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                <span className="text-[8px] text-white/30 uppercase font-black block mb-1 truncate">{key}</span>
                                <span className="text-xl font-black block">{score}%</span>
                                <span className={`text-[7px] font-black uppercase ${colors.text}`}>{colors.label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Strengths & Needs Care Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap size={14} className="text-yellow-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Strengths</span>
                        </div>
                        <div className="space-y-3">
                            {data.summary?.strongestAreas?.map((area: any, idx: number) => (
                                <div key={idx} className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
                                    <div className="text-teal-400 text-[11px] font-black">{area.title || area}</div>
                                    <div className="text-[9px] text-white/40 font-bold">{area.status || "Healthy hydration"}</div>
                                </div>
                            )) || (
                                    <>
                                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
                                            <div className="text-teal-400 text-[11px] font-black">Cheeks</div>
                                            <div className="text-[9px] text-white/40 font-bold">Healthy hydration</div>
                                        </div>
                                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
                                            <div className="text-teal-400 text-[11px] font-black">Under-eye</div>
                                            <div className="text-[9px] text-white/40 font-bold">Well maintained</div>
                                        </div>
                                    </>
                                )}
                        </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Target size={14} className="text-rose-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Needs Care</span>
                        </div>
                        <div className="space-y-3">
                            {data.summary?.needsFocus?.map((area: any, idx: number) => (
                                <div key={idx} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                    <div className="text-amber-400 text-[11px] font-black">{area.title || area}</div>
                                    <div className="text-[9px] text-white/40 font-bold">{area.status || "Attention required"}</div>
                                </div>
                            )) || (
                                    <>
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                            <div className="text-amber-400 text-[11px] font-black">Oil control</div>
                                            <div className="text-[9px] text-white/40 font-bold">45% elevated</div>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                                            <div className="text-amber-400 text-[11px] font-black">Pore size</div>
                                            <div className="text-[9px] text-white/40 font-bold">30% visible</div>
                                        </div>
                                    </>
                                )}
                        </div>
                    </div>
                </div>

                {/* Detailed Insights */}
                <div>
                    <h3 className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4 font-black px-2">Detailed Clinical Insights</h3>
                    {Object.entries(data.analysis || data.deepAnalysis || {}).map(([key, details]) => (
                        <InsightItem key={key} title={key} details={details} />
                    ))}
                </div>

                {/* Recommended Treatments */}
                {(data.treatmentPlan || data.treatments) && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Sparkles size={40} />
                        </div>
                        <h3 className="text-lg font-black uppercase mb-6 tracking-tighter">Clinical Roadmap</h3>
                        <div className="space-y-8 relative">
                            <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-white/5" />

                            <div className="relative pl-8">
                                <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Week 3</span>
                                <h4 className="text-sm font-black uppercase mt-1 text-white/90">{safeRender(data.treatmentPlan?.primary || data.treatments?.primary)}</h4>
                                <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Refines texture & minimizes pores. Promotes cell turnover for smoother skin.</p>
                            </div>

                            <div className="relative pl-8">
                                <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-teal-500/30" />
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Week 6</span>
                                <h4 className="text-sm font-black uppercase mt-1 text-white/90">Follow-up Assessment</h4>
                                <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Track progress & adjust plan. Ensure optimal results and address any concerns.</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Total Investment</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl font-black">$299</span>
                                    <span className="text-sm text-white/20 line-through">$449</span>
                                </div>
                            </div>
                            <div className="bg-teal-500/10 text-teal-400 text-[9px] font-black px-3 py-2 rounded-lg border border-teal-500/20">
                                SAVE $150 TODAY
                            </div>
                        </div>
                    </div>
                )}

                {/* Trust & Urgency Sections */}
                <div className="space-y-4">
                    {/* Why Choose Us */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 text-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-6">Why Choose Us?</h4>
                        <div className="space-y-3 text-left">
                            <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                                    <Sparkles size={18} />
                                </div>
                                <p className="text-[11px] font-bold text-white/70">5-star rated on Google with 247+ verified reviews</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <ShieldCheck size={18} />
                                </div>
                                <p className="text-[11px] font-bold text-white/70">Board-certified dermatologists with 15+ years experience</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                    <Target size={18} />
                                </div>
                                <p className="text-[11px] font-bold text-white/70">30-day satisfaction guarantee or your money back</p>
                            </div>
                        </div>
                    </div>

                    {/* Why Act Now */}
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Info size={18} className="text-rose-400" />
                            <h4 className="text-sm font-black uppercase text-rose-400">Why Act Now?</h4>
                        </div>
                        <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                            Without treatment, oil buildup can lead to enlarged pores and breakouts. Our patients see visible improvement in 2-4 weeks!
                        </p>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                        <span className="text-teal-500">★</span>
                        <span>2,847 patients improved their skin with us this year</span>
                    </div>
                </div>

                <div className="fixed bottom-6 left-0 right-0 px-5 max-w-md mx-auto z-50">
                    <div className="space-y-3">
                        <button className="w-full bg-teal-500 text-[#0f1419] font-black text-xs py-5 rounded-2xl shadow-[0_20px_40px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2 group">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0f1419] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0f1419]"></span>
                            </span>
                            BOOK FREE CONSULTATION - 3 SLOTS LEFT TODAY
                        </button>
                        <button className="w-full bg-white/[0.05] border border-white/10 text-white font-black text-xs py-4 rounded-2xl backdrop-blur-xl flex items-center justify-center gap-2">
                            <Activity size={14} className="text-teal-400" />
                            CHAT WITH SKIN EXPERT
                        </button>
                        <button onClick={() => router.push(`/rewards/${locationId}`)} className="w-full bg-transparent text-white/30 text-[10px] font-black py-2 rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:text-white transition-colors">
                            <ChevronLeft size={16} /> Return to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
