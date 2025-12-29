"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ScanFace, ChevronRight, Camera, Upload, RefreshCw, ChevronLeft } from "lucide-react";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// --- Interface matching N8N JSON ---
interface N8NResponse {
    success?: boolean;
    summary?: {
        overallCondition: string;
        strongestAreas: string[];
        needsFocus: string[];
    };
    scorecard?: {
        [key: string]: {
            value: number;
            status: string;
        };
    };
    treatmentPlan?: {
        primary: string;
        secondary: string;
        explanation: string;
    };
    deepAnalysis?: {
        [key: string]: {
            observed: string;
            interpretation: string;
            severity: string;
        };
    };
    fullReportText?: string;
    disclaimer?: string;
}

const mockN8NData: N8NResponse = {
    success: true,
    summary: {
        overallCondition: "Mostly healthy skin with mild concerns",
        strongestAreas: ["Cheeks", "Under-eye hydration"],
        needsFocus: ["Oil control", "Pore refinement", "Texture smoothing"]
    },
    scorecard: {
        oiliness: { value: 45, status: "Needs focused care" },
        acne: { value: 5, status: "Healthy" },
        pigmentation: { value: 15, status: "Healthy" },
        pores: { value: 30, status: "Needs mild improvement" },
        texture: { value: 22, status: "Needs mild improvement" },
        darkCircles: { value: 15, status: "Healthy" }
    },
    treatmentPlan: {
        primary: "Customized Chemical Peel",
        secondary: "Microneedling / Skin Resurfacing",
        explanation: "Treatments are selected based on visible skin concerns and aim to improve oil balance, pore size, pigmentation, and overall skin clarity."
    },
    fullReportText: "Sample detailed report text...",
    disclaimer: "Cosmetic assessment only."
};

export default function SkinAnalysisReport() {
    const params = useParams();
    const router = useRouter();
    const locationId = params.locationId as string;

    const [step, setStep] = useState<'intro' | 'capture' | 'analyzing'>('intro');
    const [image, setImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setStep('capture');
            };
            reader.readAsDataURL(file);
        }
    };

    const runAnalysis = async () => {
        setStep('analyzing');

        try {
            // 1. Trigger Loyalty Logic (Backend API Call)
            const storedUser = localStorage.getItem(`loyalty_user_${locationId}`);
            if (storedUser) {
                const user = JSON.parse(storedUser);
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/ghl/add-stamp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationId,
                        contactId: user.contactId || user.phone,
                        source: 'ai_skin_analysis'
                    })
                }).catch(err => console.error("Loyalty update failed", err));
            }

            // 2. Trigger AI Analysis
            const formData = new FormData();
            if (imageFile) formData.append('image', imageFile);
            formData.append('locationId', locationId);
            formData.append('timestamp', new Date().toISOString());

            const response = await fetch('/api/analyze', { method: 'POST', body: formData });
            const resultData = await response.json();

            if (!response.ok) {
                console.error('AI Analysis Proxy Failed:', resultData.error, resultData.hint);
                alert(`Analysis failed: ${resultData.error}\n\n${resultData.hint || 'Using mock data for demonstration.'}`);
                setStep('capture');
                return;
            }

            // 3. Persist and Redirect
            localStorage.setItem('last_skin_analysis_report', JSON.stringify(resultData));
            if (image) localStorage.setItem('last_skin_analysis_image', image);

            // Redirect to the new dedicated results page
            router.push(`/rewards/${locationId}/analysis-result`);

        } catch (error) {
            console.error('Error in analysis flow:', error);
            alert("Analysis failed. Please try again.");
            setStep('capture');
        }
    };

    if (step === 'intro') {
        return (
            <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => setStep('capture')}
                className="relative overflow-hidden rounded-[2.5rem] aspect-[4/3] bg-zinc-900 border border-white/10 cursor-pointer group shadow-2xl"
            >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?autofit=cover')] bg-cover opacity-50 transition-all duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-20 h-20 rounded-full bg-teal-500/20 backdrop-blur-xl flex items-center justify-center mb-6 border border-teal-500/30 shadow-lg shadow-teal-500/20"
                    >
                        <ScanFace className="w-10 h-10 text-teal-400" />
                    </motion.div>
                    <h3 className="text-2xl font-black uppercase tracking-tight mb-3">Professional AI Analysis</h3>
                    <p className="text-sm text-white/70 font-medium max-w-[240px] leading-relaxed">Instantly scan 12+ skin metrics and receive a clinical-grade report.</p>
                    <div className="mt-8 px-8 py-3 rounded-full bg-teal-500 text-black font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-teal-500/20 group-hover:gap-4 transition-all">
                        Start Now <ChevronRight size={16} />
                    </div>
                </div>
            </motion.div>
        );
    }

    if (step === 'capture') {
        return (
            <div className="bg-zinc-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl text-white">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => setStep('intro')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ChevronLeft className="text-white" size={24} /></button>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Capture Skin</h3>
                    <div className="w-12" />
                </div>
                {image ? (
                    <div className="space-y-6">
                        <div className="relative rounded-3xl overflow-hidden aspect-square border-2 border-teal-500 shadow-2xl shadow-teal-500/10">
                            <img src={image || ''} alt="Analysis Target" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-teal-500/5 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => { setImage(null); setImageFile(null); }} className="py-4 rounded-2xl bg-white/5 text-white font-black text-xs uppercase tracking-wider hover:bg-white/10 border border-white/10">Retake</button>
                            <button onClick={runAnalysis} className="py-4 rounded-2xl bg-teal-500 text-black font-black text-xs uppercase tracking-wider hover:bg-teal-400 shadow-lg shadow-teal-500/30 transition-all active:scale-95">Analyze Photo</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="aspect-[3/4] rounded-2xl bg-black border border-white/5 overflow-hidden relative group">
                                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent"><div className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase"><CheckCircle2 size={12} /> Bright Lighting</div></div>
                            </div>
                            <div className="aspect-[3/4] rounded-2xl bg-black border border-white/5 overflow-hidden relative group">
                                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent"><div className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold uppercase"><CheckCircle2 size={12} /> Centered Look</div></div>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl"><Upload size={20} /> Upload from Gallery</button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                            <button className="w-full py-5 rounded-2xl bg-white/5 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-white/10 hover:bg-white/10 transition-all"><Camera size={20} /> Open Camera</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (step === 'analyzing') {
        return (
            <div className="relative overflow-hidden rounded-[2.5rem] aspect-[4/3] bg-black border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl text-white">
                <div className="relative w-32 h-32 mb-8">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 rounded-full border-t-4 border-teal-500" />
                    <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} className="absolute inset-3 rounded-full border-b-4 border-rose-500 opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ScanFace className="w-12 h-12 text-white/20 animate-pulse" />
                    </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">AI Diagnostic Engine</h3>
                <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-medium animate-pulse">Running Neural Skin Map...</p>
            </div>
        );
    }

    return null;
}
