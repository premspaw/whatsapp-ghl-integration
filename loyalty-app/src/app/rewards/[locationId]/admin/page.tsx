"use client";

import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    Save,
    Upload,
    Palette,
    MapPin,
    Globe,
    Phone,
    Trophy,
    CheckCircle2,
    LayoutDashboard,
    Image as ImageIcon,
    Star
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Mock initial data
    const [business, setBusiness] = useState({
        name: "Lumina Derma Care",
        address: "45 Wellness Blvd, Skin City",
        phone: "+91 99999 00000",
        website: "www.luminaderma.com",
        primaryColor: "#14b8a6",
        secondaryColor: "#fb7185",
    });

    const [milestones, setMilestones] = useState([
        { visit: 3, reward: "Skin Analysis" },
        { visit: 5, reward: "HydraFacial Glow" },
        { visit: 10, reward: "Premium Serum Kit" },
    ]);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
    };

    return (
        <div className="pt-8 space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <Link href={`/rewards/${locationId}`} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black font-outfit uppercase tracking-tighter italic">
                            Business <span className="text-teal-500">Studios</span>
                        </h1>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] leading-none mt-1">
                            Management Suite
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white glow-primary disabled:opacity-50 transition-all active:scale-90"
                >
                    {isSaving ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                            <Save size={20} />
                        </motion.div>
                    ) : <Save size={20} />}
                </button>
            </div>

            {/* Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-teal-500 rounded-2xl flex items-center gap-3 shadow-2xl glow-primary"
                    >
                        <CheckCircle2 size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Changes Saved Successfully</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-6">
                {/* Branding Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Palette size={16} className="text-teal-500" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Clinic Branding</h2>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Clinic Name</label>
                            <input
                                type="text"
                                value={business.name}
                                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-teal-500/50 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Logo</label>
                                <div className="h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-white/20 hover:text-teal-500 hover:border-teal-500/30 transition-all cursor-pointer">
                                    <ImageIcon size={24} />
                                    <span className="text-[10px] font-black uppercase">Upload</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Banner</label>
                                <div className="h-24 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-white/20 hover:text-rose-500 hover:border-rose-500/30 transition-all cursor-pointer">
                                    <Upload size={24} />
                                    <span className="text-[10px] font-black uppercase">Upload</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Info Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <MapPin size={16} className="text-teal-500" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Business Details</h2>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-2 border border-white/5 focus-within:border-teal-500/30 transition-all">
                            <Phone size={16} className="text-white/20" />
                            <input
                                type="text"
                                value={business.phone}
                                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                                className="bg-transparent w-full py-2 text-sm font-bold focus:outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-2 border border-white/5 focus-within:border-teal-500/30 transition-all">
                            <Globe size={16} className="text-white/20" />
                            <input
                                type="text"
                                value={business.website}
                                onChange={(e) => setBusiness({ ...business, website: e.target.value })}
                                className="bg-transparent w-full py-2 text-sm font-bold focus:outline-none"
                            />
                        </div>
                        <div className="flex items-start gap-4 bg-white/5 rounded-2xl px-4 py-3 border border-white/5 focus-within:border-teal-500/30 transition-all">
                            <MapPin size={16} className="text-white/20 mt-1" />
                            <textarea
                                value={business.address}
                                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                                className="bg-transparent w-full text-sm font-bold focus:outline-none resize-none h-20"
                            />
                        </div>
                    </div>
                </section>

                {/* Milestone Editor Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Trophy size={16} className="text-teal-500" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Reward Milestones</h2>
                    </div>

                    <div className="space-y-3">
                        {milestones.map((m, idx) => (
                            <div key={m.visit} className="glass-card p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 font-black text-xs overflow-hidden">
                                    {/* Placeholder for uploaded image */}
                                    <ImageIcon size={16} className="opacity-40" />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={m.reward}
                                        onChange={(e) => {
                                            const newM = [...milestones];
                                            newM[idx].reward = e.target.value;
                                            setMilestones(newM);
                                        }}
                                        className="bg-transparent text-sm font-black uppercase tracking-tight focus:outline-none w-full"
                                    />
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Visit Achievement</p>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-white/20 hover:text-teal-500 cursor-pointer">
                                    <Upload size={14} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                {/* Action Rewards Editor Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Star size={16} className="text-rose-400" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Action Incentives</h2>
                    </div>

                    <div className="glass-card p-6 space-y-4 border-rose-500/10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Review Reward Title</label>
                            <input
                                type="text"
                                defaultValue="Glow Bonus: Lip Hydra-Treat"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-rose-500/50 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Review URL (Google/GHL)</label>
                            <input
                                type="text"
                                placeholder="https://g.page/r/your-id/review"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-teal-500/50 transition-colors placeholder:text-white/10"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
