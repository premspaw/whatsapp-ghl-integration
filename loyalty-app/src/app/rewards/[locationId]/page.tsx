"use client";

import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, Share2, ChevronRight, Info } from "lucide-react";
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

    useEffect(() => {
        // Get contact data from GHL URL params
        const contactId = searchParams.get('contact');
        const name = searchParams.get('name');
        const phone = searchParams.get('phone');

        // If no contact info in URL, check localStorage (for return visits)
        let userInfo = null;
        if (contactId && name && phone) {
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
                // [DEV MODE] Auto-login test user if no params
                console.log("⚠️ DEV MODE: Auto-logging in test user");
                userInfo = { contactId: 'test_user_123', name: 'Sarah Johnson', phone: '+919999900000' };
                localStorage.setItem(`loyalty_user_${locationId}`, JSON.stringify(userInfo));
                setUser(userInfo);
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
        <div className="pt-8 space-y-4 pb-32">
            {/* Header */}
            <div className="flex justify-between items-center px-2 mb-4">
                <div>
                    <h1 className="text-2xl font-black font-outfit uppercase tracking-tighter">
                        Hello, <span className="text-teal-500">{user?.name.split(' ')[0] || 'Guest'}</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none mt-1">
                        {business.business_name || business.name} Radiance Path
                    </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm border border-teal-500/20">
                    {user?.name.charAt(0).toUpperCase() || 'G'}
                </div>
            </div>

            {/* AI Skin Analysis Section */}
            <section className="px-2">
                <SkinAnalysisReport />
            </section>

            {/* How it Works / Instruction */}
            <div className="px-2">
                <div className="glass-card p-4 bg-teal-500/5 border-teal-500/10 flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-500 shrink-0">
                        <Info size={16} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/80">How it works</h4>
                        <p className="text-[10px] text-white/40 font-medium leading-relaxed mt-1">
                            Get 1 stamp for every visit. Reach the Milestone steps to unlock premium treatments.
                        </p>
                    </div>
                </div>
            </div>

            {/* Milestone Roadmap Section */}
            <section className="py-4">
                <MilestonePath
                    currentVisits={currentVisits}
                    totalMilestones={totalVisits}
                    rewards={rewards}
                />
            </section>

            {/* Action Cards */}
            <div className="grid gap-4 px-2">
                {/* View All Rewards CTA */}
                <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="glass-card p-5 flex items-center gap-4 group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <Trophy size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-black uppercase tracking-tight">Reward Catalog</h3>
                        <p className="text-white/40 text-[11px] font-medium leading-none mt-1">See full details of your perks</p>
                    </div>
                    <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" />
                </motion.div>

                {/* Referral Hook */}
                <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="glass-card p-6 flex items-center justify-between border-l-4 border-l-teal-500 overflow-hidden relative group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Gift size={80} />
                    </div>
                    <div className="relative z-10 pr-12">
                        <h3 className="text-lg font-black font-outfit uppercase">Invite Friends</h3>
                        <p className="text-white/50 text-xs font-medium max-w-[200px] mt-1">Unlock a bonus stamp when a friend starts their journey.</p>
                        <button className="mt-4 flex items-center gap-1.5 text-teal-400 text-xs font-black uppercase tracking-wider">
                            Share Plan <Share2 size={12} />
                        </button>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                        <Gift size={24} />
                    </div>
                </motion.div>
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
