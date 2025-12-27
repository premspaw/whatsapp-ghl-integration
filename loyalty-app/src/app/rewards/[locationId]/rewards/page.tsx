"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import RewardCard from "@/components/RewardCard";
import Navbar from "@/components/Navbar";
import { use, useState, useEffect } from "react";
import { getLoyaltyData, getCustomerData } from "@/lib/api";

export default function RewardsScreen({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);
    const [data, setData] = useState<{ settings: any, milestones: any[], actions: any[] } | null>(null);
    const [customer, setCustomer] = useState<{ visits: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            const [loyaltyData, custData] = await Promise.all([
                getLoyaltyData(locationId),
                getCustomerData(locationId, "test-contact-123")
            ]);
            setData(loyaltyData);
            setCustomer(custData);
            setIsLoading(false);
        };
        fetchAll();
    }, [locationId]);

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

    const currentVisits = customer?.visits || 0;

    const rewards = data?.milestones.map((m: any) => ({
        name: m.reward_name,
        description: `Unlock this premium treatment at your ${m.visit_number}${m.visit_number === 3 ? 'rd' : 'th'} visit.`,
        requiredVisits: m.visit_number,
        isUnlocked: currentVisits >= m.visit_number,
        isClaimed: false,
        image: m.reward_image
    })) || [];

    const reviewAction = data?.actions.find((a: any) => a.action_type === 'review');

    const reviewReward = {
        name: reviewAction?.reward_name || "Glow Bonus: Lip Hydra-Treat",
        description: "Give us a 5-star review and get a localized hydration treatment instantly!",
        isUnlocked: false,
        isClaimed: false
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
                        Clinical <span className="text-teal-500">Rewards</span>
                    </h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest leading-none mt-1">
                        Achievement Catalog
                    </p>
                </div>
            </div>

            <div className="glass-card p-6 flex items-center justify-around border-blue-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Trophy size={60} />
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black font-outfit text-teal-500">{currentVisits}</div>
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Total Visits</div>
                </div>
                <div className="w-[1px] h-10 bg-white/10" />
                <div className="text-center">
                    <div className="text-2xl font-black font-outfit text-white">
                        {rewards.filter(r => r.isUnlocked).length}
                    </div>
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Unlocked</div>
                </div>
                <div className="w-[1px] h-10 bg-white/10" />
                <div className="text-center">
                    <div className="text-2xl font-black font-outfit text-white">0</div>
                    <div className="text-[10px] font-black text-white/30 uppercase tracking-tighter">Claimed</div>
                </div>
            </div>

            {/* Special Action Reward */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border-rose-500/20 bg-rose-500/5 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none -rotate-12">
                    <Star size={80} fill="currentColor" />
                </div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20 mb-3">
                        <Star size={12} fill="currentColor" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Special Offer</span>
                    </div>
                    <h3 className="text-lg font-black font-outfit uppercase tracking-tight">{reviewReward.name}</h3>
                    <p className="text-xs font-medium text-white/40 mt-1 max-w-[280px]">
                        {reviewReward.description}
                    </p>
                    <button className="mt-5 w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest glow-primary transition-all active:scale-95 flex items-center justify-center gap-3">
                        Write Review to Claim <ArrowRight size={16} />
                    </button>
                    <p className="text-[9px] text-center mt-3 font-bold text-white/20 uppercase tracking-widest">Takes less than 30 seconds</p>
                </div>
            </motion.div>

            {/* Rewards List */}
            <div className="space-y-4 px-1">
                {rewards.map((reward, index) => (
                    <RewardCard
                        key={index}
                        {...reward}
                        currentVisits={currentVisits}
                        onClaim={() => alert(`Redirecting to claim screen for ${reward.name}...`)}
                    />
                ))}
            </div>

            <Navbar locationId={locationId} />
        </div>
    );
}
