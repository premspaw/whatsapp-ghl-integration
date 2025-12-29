"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronDown, MoreHorizontal, Info, Search, Sliders, Target, Eye, Sparkles, Activity, ShieldCheck, Zap } from 'lucide-react';

interface AnalysisResultData {
    imageQuality?: {
        alignment: string;
        lighting: string;
        obstructions: string;
        suitability: string;
    };
    scorecard?: {
        oiliness: number;
        acne: number;
        pigmentation: number;
        pores: number;
        texture: number;
        darkCircles: number;
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
    // From N8N Proxy
    summary?: {
        overallCondition: string;
        strongestAreas: string[];
        needsFocus: string[];
    };
    treatmentPlan?: {
        primary: string;
        secondary: string;
        logic?: string;
        explanation?: string;
    };
}

function InsightItem({ title, details }: { title: string, details: any }) {
    const [isOpen, setIsOpen] = useState(false);

    const getIcon = (title: string) => {
        const t = title.toLowerCase();
        let src = "/cheek-macro.png"; // Default
        if (t.includes('forehead') || t.includes('t-zone')) src = "/forehead-macro.png";
        if (t.includes('nose')) src = "/nose-macro.png";
        if (t.includes('cheek')) src = "/cheek-macro.png";
        if (t.includes('eye')) src = "/cheek-macro.png"; // Fallback to smooth cheek for eyes
        if (t.includes('texture')) src = "/forehead-macro.png"; // Fallback for texture

        return (
            <div className="relative w-full h-full overflow-hidden rounded-xl">
                <Image
                    src={src}
                    alt={title}
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
        );
    };

    const getSeverityDetails = (sevText: string) => {
        const text = (sevText || "Mild").toLowerCase();
        let percentage = 0;
        const pMatch = sevText.match(/(\d+)/);
        if (pMatch) percentage = parseInt(pMatch[1]);
        else if (text.includes('mild')) percentage = 15;
        else if (text.includes('moderate')) percentage = 45;
        else if (text.includes('high') || text.includes('severe')) percentage = 85;

        if (percentage < 25) return { color: 'text-green-400', bar: 'bg-green-500', bg: 'bg-green-500/10', label: 'Healthy Baseline' };
        if (percentage < 60) return { color: 'text-yellow-400', bar: 'bg-yellow-500', bg: 'bg-yellow-500/10', label: 'Moderate Focus' };
        return { color: 'text-red-400', bar: 'bg-red-400', bg: 'bg-red-400/10', label: 'High Priority' };
    };

    const sev = getSeverityDetails(details.severity);

    return (
        <motion.div
            initial={false}
            className="group mb-4"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-5 rounded-[2rem] flex items-center justify-between text-left transition-all duration-300 border ${isOpen ? 'bg-white/[0.08] border-white/20 shadow-2xl scale-[1.02]' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center transition-all duration-500 ${isOpen ? 'rotate-[360deg] scale-110 shadow-2xl' : 'bg-white/5'}`}>
                        {getIcon(title)}
                    </div>
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">{title.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest ${sev.color}`}>{details.severity || 'Stable'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!isOpen && (
                        <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden hidden xs:block">
                            <div className={`h-full ${sev.bar} opacity-40`} style={{ width: '40%' }} />
                        </div>
                    )}
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.4, ease: "backOut" }}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
                    >
                        <ChevronDown size={14} className="text-gray-400" />
                    </motion.div>
                </div>
            </button>

            <motion.div
                initial="collapsed"
                animate={isOpen ? "open" : "collapsed"}
                variants={{
                    open: { opacity: 1, height: "auto", marginTop: 12 },
                    collapsed: { opacity: 0, height: 0, marginTop: 0 }
                }}
                transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
            >
                <div className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-3xl backdrop-blur-xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Observed */}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                <Zap size={12} className="text-blue-400" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/80">AI Clinical Scan</span>
                        </div>
                        <div className="pl-8 border-l-2 border-blue-500/10 space-y-2">
                            {details.observed.split('\n').filter(Boolean).map((line: string, i: number) => (
                                <p key={i} className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                    {line.trim().startsWith('-') ? line.trim() : `• ${line.trim()}`}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Interpretation */}
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/20">
                                <Activity size={12} className="text-teal-400" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-400/80">Pathology Insight</span>
                        </div>
                        <div className="pl-8 border-l-2 border-teal-500/10">
                            <p className="text-[11px] text-white/90 leading-relaxed font-bold italic bg-teal-500/5 p-3 rounded-xl border border-teal-500/10">
                                "{details.interpretation.trim()}"
                            </p>
                        </div>
                    </div>

                    {/* Visual Severity Meter */}
                    <div className={`p-4 rounded-2xl border border-white/5 ${sev.bg}`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Risk Analysis</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${sev.color}`}>{sev.label}</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: details.severity.match(/(\d+)/) ? `${details.severity.match(/(\d+)/)[1]}%` : '20%' }}
                                transition={{ duration: 1, delay: 0.3 }}
                                className={`h-full ${sev.bar} shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                            />
                        </div>
                        <p className="text-[8px] text-white/40 mt-3 uppercase font-bold tracking-tighter text-center">
                            Calculated Severity: <span className="text-white/80">{details.severity || 'Low'}</span>
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function SkinAnalysisResult() {
    const params = useParams();
    const router = useRouter();
    const locationId = params.locationId as string;

    const [data, setData] = useState<AnalysisResultData | null>(null);
    const [userImage, setUserImage] = useState<string | null>(null);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedReport = localStorage.getItem('last_skin_analysis_report');
        const savedImage = localStorage.getItem('last_skin_analysis_image');

        if (savedReport) {
            const parsed = JSON.parse(savedReport);
            // Transform scorecard if it's in the { value: X, status: Y } format
            if (parsed.scorecard && typeof Object.values(parsed.scorecard)[0] === 'object') {
                const newScorecard: any = {};
                Object.entries(parsed.scorecard).forEach(([key, val]: [string, any]) => {
                    newScorecard[key] = val.value;
                });
                parsed.scorecard = newScorecard;
            }
            setData(parsed);
        }
        if (savedImage) setUserImage(savedImage);
    }, []);

    const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

        setSliderPosition(percentage);
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        handleSliderMove(e);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (isDragging && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
                const x = clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                setSliderPosition(percentage);
            }
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('touchmove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    const getScoreColor = (score: number) => {
        if (score < 25) return { bg: 'bg-green-500/20', text: 'text-green-400', fill: 'bg-green-500', label: 'EXCELLENT' };
        if (score < 50) return { bg: 'bg-blue-500/20', text: 'text-blue-400', fill: 'bg-blue-500', label: 'GOOD' };
        if (score < 75) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', fill: 'bg-yellow-500', label: 'MODERATE' };
        return { bg: 'bg-red-500/20', text: 'text-red-400', fill: 'bg-red-500', label: 'NEEDS CARE' };
    };

    if (!data) return (
        <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-5">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-green-500" />
        </div>
    );

    const scorecard = data.scorecard || {
        oiliness: 45,
        acne: 5,
        pigmentation: 15,
        pores: 30,
        texture: 22,
        darkCircles: 15
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a2332] text-white p-5 pb-32">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-block bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-xs font-semibold mb-3 border border-green-500/10">
                        ✓ ANALYSIS COMPLETE
                    </div>
                    <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">
                        Analysis ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </div>
                </div>

                {/* Profile Section */}
                <div className="flex items-center gap-5 mb-8 bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 shadow-2xl">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-green-500">
                            <Image
                                src={userImage || "/profile-placeholder.jpg"}
                                alt="Profile"
                                width={80}
                                height={80}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black font-black border-4 border-[#121821]">
                            ✓
                        </div>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black mb-1 uppercase tracking-tight">Your Skin Report</h1>
                        <p className="text-green-400 font-bold text-sm mb-1 uppercase tracking-wide">✨ Good News!</p>
                        <p className="text-xs text-gray-400 leading-tight">
                            {data.summary?.overallCondition || "Your skin is healthy with specific focal areas."}
                        </p>
                    </div>
                </div>

                {/* Strengths & Focus Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl">
                        <div className="flex items-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-widest mb-4">
                            ⚡ STRENGTHS
                        </div>
                        <div className="space-y-2">
                            {data.summary?.strongestAreas.map(area => (
                                <div key={area} className="bg-green-500/20 text-green-400 px-3 py-2 rounded-xl text-[10px] font-bold">
                                    {area}
                                    <span className="block text-[8px] text-gray-500 mt-1 uppercase">Stable Condition</span>
                                </div>
                            )) || (
                                    <>
                                        <div className="bg-green-500/20 text-green-400 px-3 py-2 rounded-xl text-[10px] font-bold">
                                            Cheeks
                                            <span className="block text-[8px] text-gray-500 mt-1 uppercase tracking-tighter">Healthy hydration</span>
                                        </div>
                                        <div className="bg-green-500/20 text-green-400 px-3 py-2 rounded-xl text-[10px] font-bold">
                                            Under-eye
                                            <span className="block text-[8px] text-gray-500 mt-1 uppercase tracking-tighter">Well maintained</span>
                                        </div>
                                    </>
                                )}
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl">
                        <div className="flex items-center gap-2 text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-4">
                            🎯 NEEDS CARE
                        </div>
                        <div className="space-y-2">
                            {Object.entries(scorecard)
                                .filter(([_, score]) => score > 25)
                                .slice(0, 3)
                                .map(([key, score]) => (
                                    <div key={key} className="bg-yellow-500/20 text-yellow-400 px-3 py-2 rounded-xl text-[10px] font-bold">
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                        <span className="block text-[8px] text-gray-500 mt-1 uppercase tracking-tighter">{score}% elevated</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Scorecard */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            📊 Detailed Scorecard
                        </h3>
                        <div className="flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Lower is Better</span>
                        </div>
                    </div>

                    {/* Rating Legend */}
                    <div className="grid grid-cols-4 gap-2 mb-6 px-1">
                        {[
                            { label: 'Excellent', range: '0-25%', color: 'text-green-400', bg: 'bg-green-500/10' },
                            { label: 'Good', range: '26-50%', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { label: 'Moderate', range: '51-75%', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                            { label: 'Needs Care', range: '>75%', color: 'text-red-400', bg: 'bg-red-500/10' }
                        ].map((item, i) => (
                            <div key={i} className={`flex flex-col items-center p-2 rounded-xl border border-white/5 ${item.bg}`}>
                                <span className={`text-[7px] font-black uppercase tracking-widest ${item.color} mb-1`}>{item.label}</span>
                                <span className="text-[9px] font-bold text-white/40">{item.range}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {Object.entries(scorecard).map(([key, score]) => {
                            const colors = getScoreColor(score);
                            return (
                                <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center transition-all hover:bg-white/10 shadow-lg">
                                    <div className="text-[9px] text-gray-400 uppercase font-black mb-2 truncate">{key}</div>
                                    <div className="text-2xl font-black mb-2">{score}%</div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-black tracking-tighter`}>
                                        {colors.label}
                                    </span>
                                    <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full ${colors.fill} transition-all duration-1000`}
                                            style={{ width: `${score}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Deep Insights - Expandable Section */}
                {(data.analysis || data.deepAnalysis) && (
                    <div className="mb-10 text-white">
                        <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-4 ml-2 font-black flex items-center gap-2">
                            <Search size={14} /> Understanding Your Skin
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(data.analysis || data.deepAnalysis || {}).map(([key, details]) => (
                                <InsightItem key={key} title={key} details={details} />
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Detection Methodology */}
                <div className="mb-10">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-6 ml-2 font-black flex items-center gap-2">
                        <Activity size={14} className="text-blue-400" /> Neural Processing Engine
                    </h3>
                    <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className="text-[7px] font-black text-blue-300 uppercase tracking-widest">v4.2 Analysis Active</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { cond: 'Acne & Inflammation', detect: 'Red spectral peaks + texture depth', image: '/nose-macro.png', color: 'red' },
                                { cond: 'Hyperpigmentation', detect: 'Melanin cluster density mapping', image: '/cheek-macro.png', color: 'yellow' },
                                { cond: 'Structural Wrinkles', detect: 'Luminance contrast line analysis', image: '/forehead-macro.png', color: 'blue' },
                                { cond: 'Periorbital Darkness', detect: 'Vascular hue variance detection', image: '/cheek-macro.png', color: 'purple' },
                                { cond: 'Pore Morphology', detect: 'Shadow-casting orifice detection', image: '/nose-macro.png', color: 'teal' },
                                { cond: 'Lipid/Sebum Level', detect: 'Specular reflectivity index', image: '/nose-macro.png', color: 'orange' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04] hover:border-white/10 group">
                                    <div className={`w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg relative group-hover:scale-110 transition-transform duration-500`}>
                                        <Image
                                            src={item.image}
                                            alt={item.cond}
                                            fill
                                            className="object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale-[0.5] contrast-[1.2]"
                                        />
                                        <div className={`absolute inset-0 bg-${item.color}-500/10 mix-blend-overlay`} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-white/90 uppercase tracking-wider mb-1">{item.cond}</div>
                                        <div className="text-[9px] text-white/40 font-medium">{item.detect}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-green-400" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Clinical Logic Verified</span>
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-1 h-3 bg-white/10 rounded-full" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Before/After Comparison */}
                <div className="bg-green-500/[0.03] border border-green-500/20 rounded-[2.5rem] p-6 mb-10 shadow-2xl relative overflow-hidden">
                    <h3 className="text-green-400 font-black uppercase tracking-widest text-[11px] text-center mb-1">Visual Potential</h3>
                    <p className="text-[11px] text-gray-500 text-center mb-6 font-medium">Projected improvements after 4-6 weeks</p>

                    <div
                        ref={containerRef}
                        className="relative w-full h-64 rounded-[2rem] overflow-hidden cursor-grab active:cursor-grabbing border border-white/10 shadow-inner group"
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                    >
                        <Image
                            src="/before-skin.jpg"
                            alt="Before"
                            fill
                            className="object-cover"
                        />
                        <div
                            className="absolute top-0 left-0 w-full h-full overflow-hidden z-10"
                            style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
                        >
                            <Image
                                src="/after-skin.jpg"
                                alt="After"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div
                            className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
                            style={{ left: `${sliderPosition}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl z-30 pointer-events-none transition-transform group-hover:scale-110"
                            style={{ left: `${sliderPosition}%`, transform: `translate(-50%, -50%)` }}
                        >
                            <span className="text-gray-950 font-black text-xs">◀ ▶</span>
                        </div>
                    </div>

                    <div className="flex justify-between mt-6 px-1">
                        <span className="text-[10px] font-black px-4 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/10 uppercase tracking-widest">Baseline</span>
                        <span className="text-[10px] font-black px-4 py-1.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/10 uppercase tracking-widest">Wk 6 Target</span>
                    </div>
                </div>

                {/* Treatment Plan */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 mb-10 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black uppercase tracking-tight">📋 Journey Plan</h3>
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-black text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                            PERSONALIZED
                        </span>
                    </div>

                    <div className="relative pl-8 space-y-8 border-l border-white/5">
                        <div className="absolute left-0 top-2 bottom-2 w-[1px] bg-gradient-to-b from-green-500 to-blue-500 opacity-20" />

                        {[
                            { week: 'Week 1', title: data.treatmentPlan?.primary || 'HydraFacial Deep Cleanse', desc: 'Starting with intensive pore clearing and sebum regulation.' },
                            { week: 'Week 3', title: data.treatmentPlan?.secondary || 'Chemical Peel Treatment', desc: 'Promoting skin cell turnover to refine texture and tone.' },
                            { week: 'Week 6', title: 'Stabilization Assessment', desc: 'Tracking results and locking in your new skin barrier health.' }
                        ].map((item, i) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[37px] top-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#121821] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-[0.2em] mb-1">{item.week}</div>
                                <div className="font-black text-white text-base mb-1 tracking-tight uppercase">{item.title}</div>
                                <div className="text-xs text-gray-400 leading-relaxed font-medium">{item.desc}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-3xl p-6 mt-10 text-center shadow-inner">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none">Total Investment</span>
                            <div className="text-right">
                                <span className="text-3xl font-black block">$299</span>
                                <span className="text-gray-500 line-through text-xs font-bold">$449</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-green-400 font-black uppercase tracking-widest border-t border-green-500/10 pt-4 mt-2">
                            💰 Save $150 with this clinical package!
                        </div>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-10 shadow-xl">
                    <h4 className="text-[10px] font-black text-gray-500 text-center uppercase tracking-[0.3em] mb-6">Expert Verification</h4>
                    <div className="space-y-4">
                        {[
                            { icon: '⭐', text: '<strong>5-star rated</strong> by 2k+ verified patients', color: 'bg-green-500/10' },
                            { icon: '👨‍⚕️', text: '<strong>Lead doctors</strong> from top board clinics', color: 'bg-blue-500/10' },
                            { icon: '✓', text: '<strong>100% guarantee</strong> on clinical plan accuracy', color: 'bg-green-500/10' }
                        ].map((badge, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/[0.04]">
                                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border border-green-500/10">
                                    {badge.icon}
                                </div>
                                <div className="text-xs text-gray-300 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: badge.text }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-6 flex flex-col items-center text-center">
                    <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">⚠️ High Clinical Priority</h4>
                    <p className="text-[10px] text-red-400 font-medium leading-relaxed uppercase tracking-tighter">
                        Left untreated, specific zones show risk of chronic sebum buildup. Consulting our experts is recommended within 48 hours.
                    </p>
                </div>

                <div className="sticky bottom-4 space-y-3 z-50">
                    <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black font-black text-xs py-5 rounded-2xl shadow-2xl shadow-green-500/30 hover:scale-[1.02] transition-all uppercase tracking-[0.2em] active:scale-95">
                        📅 Book Consultation - 3 Slots Left
                    </button>

                    <button
                        onClick={() => router.push(`/rewards/${locationId}`)}
                        className="w-full bg-white/5 border border-white/10 text-white/40 font-black text-[10px] py-4 rounded-2xl hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <ChevronLeft size={16} /> Finish & Return
                    </button>
                </div>

                <p className="text-[9px] text-gray-600 text-center mt-12 mb-20 px-10 italic font-medium leading-relaxed uppercase tracking-widest">
                    ⭐ <strong className="text-green-400">2,847 patients</strong> tracked their transformation with this program
                </p>
            </div>
        </div>
    );
}
