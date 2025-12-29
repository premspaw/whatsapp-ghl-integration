"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-teal-500/20 blur-[120px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 max-w-sm"
            >
                <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-teal-500/20">
                    <Sparkles className="text-teal-400" size={32} />
                </div>

                <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">
                    Clinic <span className="text-teal-500">Loyalty</span>
                </h1>

                <p className="text-white/60 font-medium text-sm mb-10 leading-relaxed">
                    Welcome to the premium skin health & loyalty platform. Please access your dashboard via your clinic's unique link.
                </p>

                <div className="space-y-4">
                    <Link href="/rewards/lumina-derma">
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group"
                        >
                            Open Demo Clinic <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </motion.div>
                    </Link>

                    <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] pt-4">
                        Powered by Antigravity AI
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
