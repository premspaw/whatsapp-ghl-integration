"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, CheckCircle, User, Phone, Mail, Award, Clock } from "lucide-react";
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

    // Mock visits data
    const visits = [
        { id: 1, date: "2025-12-24T10:30:00Z", type: "Visit", status: "Verified" },
        { id: 2, date: "2025-12-20T17:45:00Z", type: "Visit", status: "Verified" },
        { id: 3, date: "2025-12-15T09:15:00Z", type: "Visit", status: "Verified" },
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
        <div className="pt-8 space-y-8 pb-32 bg-[#05070a] min-h-screen text-white px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <Link href={`/rewards/${locationId}`} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/10">
                    <ArrowLeft size={20} />
                </Link>
                <div className="text-right">
                    <h1 className="text-xl font-black uppercase tracking-tighter">My <span className="text-teal-500">Profile</span></h1>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Status: Platinum Member</p>
                </div>
            </div>

            {/* Profile Card */}
            <div className="glass-card p-6 border-teal-500/20 bg-teal-500/[0.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                    <User size={120} />
                </div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30 text-3xl font-black shadow-2xl shadow-teal-500/20">
                        {user?.name.charAt(0).toUpperCase() || 'G'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{user?.name || 'Guest User'}</h2>
                        <div className="space-y-1 mt-2">
                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                                <Phone size={10} className="text-teal-500" /> {user?.phone || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                                <Award size={10} className="text-teal-500" /> ID: {user?.contactId.slice(0, 8) || 'TEST_USER'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Total Visits</p>
                        <p className="text-2xl font-black text-white">03</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Rewards Won</p>
                        <p className="text-2xl font-black text-teal-500">01</p>
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            <div>
                <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Clock size={14} /> Visit Timeline
                </h3>

                <div className="relative space-y-4">
                    {/* Timeline Line */}
                    <div className="absolute left-[31px] top-4 bottom-4 w-[1px] bg-white/10" />

                    {visits.map((visit, index) => (
                        <motion.div
                            key={visit.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4 group"
                        >
                            {/* Status Dot */}
                            <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#0a0f16] border border-white/10 flex items-center justify-center text-teal-500 group-hover:border-teal-500/50 transition-colors shadow-2xl">
                                <CheckCircle size={20} />
                            </div>

                            {/* Visit Details */}
                            <div className="flex-1 glass-card p-4 group-hover:bg-white/5 transition-colors border-white/5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-tight">Visit #{visits.length - index}</h3>
                                        <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-widest mt-0.5">
                                            <Calendar size={10} /> {formatDate(visit.date)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/10">
                                            {visit.status}
                                        </span>
                                        <div className="text-white/20 text-[9px] font-bold tracking-widest mt-1.5 uppercase leading-none">
                                            {formatTime(visit.date)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Start Point */}
                    <div className="flex gap-4 opacity-50">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                            <Award size={20} />
                        </div>
                        <div className="flex-1 p-4">
                            <h3 className="text-[11px] font-black uppercase tracking-tight text-white/20">Joined Program</h3>
                            <p className="text-white/20 text-[10px] uppercase font-bold tracking-widest mt-1">Dec 1, 2025</p>
                        </div>
                    </div>
                </div>
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}
