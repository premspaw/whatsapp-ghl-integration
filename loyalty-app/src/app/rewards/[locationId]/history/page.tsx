"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, CheckCircle } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

import { use } from "react";

export default function HistoryPage({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);

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
        <div className="pt-8 space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 px-2">
                <Link href={`/rewards/${locationId}`} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black font-outfit uppercase tracking-tighter">
                        Visit <span className="text-blue-500">History</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none mt-1">
                        Timeline of your activity
                    </p>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative space-y-4 px-2">
                {/* Timeline Line */}
                <div className="absolute left-[31px] top-4 bottom-4 w-[2px] bg-white/5" />

                {visits.map((visit, index) => (
                    <motion.div
                        key={visit.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-4 group"
                    >
                        {/* Status Dot */}
                        <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-blue-500 group-hover:border-blue-500/50 transition-colors">
                            <CheckCircle size={20} />
                        </div>

                        {/* Visit Details */}
                        <div className="flex-1 glass-card p-4 group-hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight">Visit #{visits.length - index}</h3>
                                    <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-widest mt-0.5">
                                        <Calendar size={10} /> {formatDate(visit.date)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                        {visit.status}
                                    </span>
                                    <div className="text-white/20 text-[10px] font-bold tracking-widest mt-0.5 uppercase">
                                        {formatTime(visit.date)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-widest">
                                <MapPin size={10} className="text-blue-500" /> Platinum Fitness Center
                            </div>
                        </div>
                    </motion.div>
                ))}

                {/* Start Point */}
                <div className="flex gap-4 opacity-50">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                        <CheckCircle size={20} />
                    </div>
                    <div className="flex-1 p-4">
                        <h3 className="text-xs font-black uppercase tracking-tight text-white/20">Joined Program</h3>
                        <p className="text-white/20 text-[10px] uppercase font-bold tracking-widest mt-1">Dec 1, 2025</p>
                    </div>
                </div>
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}
