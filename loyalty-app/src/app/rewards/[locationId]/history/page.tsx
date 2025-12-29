"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, CheckCircle, User, Phone, Mail, Award, Clock, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Navbar from "../../../../components/Navbar";
import { use, useState, useEffect } from "react";

export default function ProfileHistoryPage({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);
    const [user, setUser] = useState<{ name: string; phone: string; contactId: string } | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem(`loyalty_user_${locationId}`);
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, [locationId]);

    // Mock visits data - In a real app, this would be fetched from Supabase
    const visits = [
        { id: 3, date: "2025-12-24T10:30:00Z", type: "Visit", status: "Verified", location: "Lumina Derma Care" },
        { id: 2, date: "2025-12-20T17:45:00Z", type: "Visit", status: "Verified", location: "Lumina Derma Care" },
        { id: 1, date: "2025-12-15T09:15:00Z", type: "Visit", status: "Verified", location: "Lumina Derma Care" },
    ];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="pt-8 space-y-10 pb-32 bg-[#05070a] min-h-screen text-white px-5 overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <Link href={`/rewards/${locationId}`} className="w-12 h-12 rounded-[1.2rem] bg-white/[0.03] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90">
                    <ArrowLeft size={18} />
                </Link>
                <div className="text-right">
                    <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Visit <span className="text-teal-500">History</span></h1>
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Timeline of your activity</p>
                </div>
            </div>

            {/* Profile Summary Card - Premium Glassmorphism */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/20 to-rose-500/20 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                <div className="relative glass-card p-7 border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/5 rounded-full blur-3xl" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center text-teal-400 border border-teal-500/20 text-3xl font-black shadow-2xl">
                                {user?.name.charAt(0).toUpperCase() || 'G'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center border-4 border-[#0a0f16]">
                                <ShieldCheck size={14} className="text-black" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">{user?.name || 'Guest User'}</h2>
                            <div className="flex flex-col gap-1.5 mt-2">
                                <div className="flex items-center gap-2 text-white/30 text-[9px] font-black uppercase tracking-[0.15em]">
                                    <Phone size={10} className="text-teal-500/50" /> {user?.phone || 'N/A'}
                                </div>
                                <div className="flex items-center gap-2 text-white/30 text-[9px] font-black uppercase tracking-[0.15em]">
                                    <Award size={10} className="text-teal-500/50" /> Platinum Member
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.03] p-5 rounded-[1.8rem] border border-white/5 transition-all hover:bg-white/[0.05]">
                            <p className="text-[8px] text-white/30 font-black uppercase tracking-[0.2em] mb-1">Total Visits</p>
                            <p className="text-3xl font-black text-white leading-none">0{visits.length}</p>
                        </div>
                        <div className="bg-white/[0.03] p-5 rounded-[1.8rem] border border-white/5 transition-all hover:bg-white/[0.05]">
                            <p className="text-[8px] text-white/30 font-black uppercase tracking-[0.2em] mb-1">Rewards Won</p>
                            <p className="text-3xl font-black text-teal-500 leading-none">01</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-8 px-2">
                    <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Clock size={12} /> Clinical Record
                    </h3>
                    <Sparkles size={14} className="text-teal-500/30" />
                </div>

                <div className="relative space-y-6">
                    {/* Continuous Gradient Timeline Line */}
                    <div className="absolute left-[27.5px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-teal-500/50 via-white/10 to-transparent" />

                    {visits.map((visit, index) => (
                        <motion.div
                            key={visit.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15 }}
                            className="flex gap-6 group relative"
                        >
                            {/* Animated Pulse Point */}
                            <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#0a0f16] border border-white/[0.08] flex items-center justify-center text-teal-500 group-hover:border-teal-500/50 transition-all duration-500 shadow-2xl group-hover:scale-110 active:scale-95 overflow-hidden">
                                <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CheckCircle size={22} className="relative z-10" />
                                {index === 0 && (
                                    <motion.div
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl -z-0"
                                    />
                                )}
                            </div>

                            {/* Enhanced Visit Record Card */}
                            <div className="flex-1 glass-card p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] group-hover:bg-white/[0.04] group-hover:border-white/10 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <CheckCircle size={60} />
                                </div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black text-teal-500/80 uppercase tracking-widest bg-teal-500/10 px-2 py-0.5 rounded-md">Visit #{visit.id}</span>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-white/90">Clinical Session</h3>
                                        <div className="space-y-2 mt-3">
                                            <div className="flex items-center gap-2 text-white/30 text-[10px] uppercase font-bold tracking-wider">
                                                <Calendar size={12} className="text-white/20" /> {formatDate(visit.date)}
                                            </div>
                                            <div className="flex items-center gap-2 text-white/30 text-[10px] uppercase font-bold tracking-wider">
                                                <MapPin size={12} className="text-white/20" /> {visit.location}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-xl border border-teal-500/10 uppercase tracking-widest shadow-lg shadow-teal-500/5">
                                            {visit.status}
                                        </span>
                                        <div className="text-white/20 text-[9px] font-black tracking-[0.2em] mt-3 uppercase leading-none">
                                            {formatTime(visit.date)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Joined Program Milestone */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="flex gap-6 items-center pt-4"
                    >
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20 shadow-inner">
                            <Award size={22} />
                        </div>
                        <div className="flex-1 p-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">Joined Clinical Program</h3>
                            <p className="text-white/10 text-[9px] uppercase font-black tracking-widest mt-1">DECEMBER 1, 2025</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}
