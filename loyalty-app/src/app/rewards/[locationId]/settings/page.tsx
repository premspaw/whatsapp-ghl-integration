"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Phone, Globe, Instagram, Clock, Star, LayoutDashboard, ChevronRight } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

import { use } from "react";

export default function SettingsPage({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);

    const business = {
        name: "Lumina Derma Care",
        rating: 4.9,
        reviews: 215,
        address: "45 Wellness Blvd, Skin City",
        phone: "+91 99999 00000",
        website: "www.luminaderma.com",
        hours: "10:00 AM - 8:00 PM",
        theme: {
            primary: "#14b8a6", // teal-500
            secondary: "#fb7185" // rose-400
        }
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
                        Clinic <span className="text-teal-500">Details</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none mt-1">
                        About the business
                    </p>
                </div>
            </div>

            {/* Brand Hero */}
            <div className="glass-card p-0 overflow-hidden border-white/5 premium-shadow">
                <div className="h-32 bg-gradient-to-tr from-teal-600/30 to-rose-600/30 relative">
                    <div className="absolute -bottom-6 left-6 w-20 h-20 rounded-3xl bg-teal-600 flex items-center justify-center text-3xl font-black font-outfit glow-primary">
                        LD
                    </div>
                </div>
                <div className="pt-10 pb-6 px-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-black font-outfit uppercase tracking-tight">{business.name}</h2>
                            <div className="flex items-center gap-1 mt-1">
                                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-[10px] font-black uppercase text-white/60">{business.rating} ({business.reviews} Reviews)</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40"><Instagram size={16} /></div>
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40"><Globe size={16} /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="space-y-4 px-1">
                <div className="grid gap-4 mt-6">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                            <MapPin size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Location</p>
                            <p className="text-sm font-bold">{business.address}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                        <Phone size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Phone</p>
                        <p className="text-xs font-semibold text-white/70">{business.phone}</p>
                    </div>
                </div>

                <div className="glass-card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Hours</p>
                        <p className="text-xs font-semibold text-white/70">{business.hours}</p>
                    </div>
                </div>
            </div>

            {/* Admin Access Footer */}
            <div className="px-1">
                <Link href={`/rewards/${locationId}/admin`}>
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="glass-card p-6 flex items-center justify-between group border-teal-500/20 bg-teal-500/5"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white glow-primary">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight">Business Admin</h3>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Edit Branding & Rewards</p>
                            </div>
                        </div>
                        <ChevronRight className="text-teal-500/30 group-hover:translate-x-1 transition-transform" />
                    </motion.div>
                </Link>
            </div>

            {/* Multi-tenant Teaser */}
            <div className="p-6 text-center opacity-30 pb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Simple for User, Powerful for Business</p>
                <div className="mt-4 flex justify-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}
