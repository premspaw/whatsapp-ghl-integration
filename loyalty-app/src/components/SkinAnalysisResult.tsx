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

                {/* Detailed Insights */}
                <div>
                    <h3 className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4 font-black px-2">Detailed Clinical Insights</h3>
                    {Object.entries(data.analysis || data.deepAnalysis || {}).map(([key, details]) => (
                        <InsightItem key={key} title={key} details={details} />
                    ))}
                </div>

                {/* Recommended Treatments */}
                {(data.treatmentPlan || data.treatments) && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8">
                        <h3 className="text-lg font-black uppercase mb-6">Treatment Roadmap</h3>
                        <div className="space-y-6">
                            <div className="border-l-2 border-green-500/30 pl-6">
                                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Primary Recommendation</span>
                                <h4 className="text-sm font-black uppercase mt-1">{safeRender(data.treatmentPlan?.primary || data.treatments?.primary)}</h4>
                            </div>
                            <div className="border-l-2 border-blue-500/30 pl-6">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Secondary Focus</span>
                                <h4 className="text-sm font-black uppercase mt-1">{safeRender(data.treatmentPlan?.secondary || data.treatments?.additional)}</h4>
                            </div>
                        </div>
                    </div>
                )}

                <div className="fixed bottom-6 left-0 right-0 px-5 max-w-md mx-auto z-50">
                    <button className="w-full bg-green-500 text-black font-black text-xs py-5 rounded-2xl shadow-2xl">
                        BOOK CONSULTATION
                    </button>
                    <button onClick={() => router.push(`/rewards/${locationId}`)} className="w-full mt-3 bg-white/5 text-white/40 text-[10px] font-black py-4 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2">
                        <ChevronLeft size={16} /> Return to Home
                    </button>
                </div>
            </div>
        </div>
    );
}
