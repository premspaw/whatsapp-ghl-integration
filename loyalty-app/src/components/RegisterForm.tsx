"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, User, ArrowRight, Sparkles } from "lucide-react";

interface RegisterFormProps {
    locationId: string;
    onRegister: (name: string, phone: string) => void;
}

export default function RegisterForm({ locationId, onRegister }: RegisterFormProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) return;

        setIsLoading(true);

        // Store in localStorage for instant access
        localStorage.setItem(`loyalty_user_${locationId}`, JSON.stringify({ name, phone }));

        // Call parent callback
        onRegister(name, phone);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ repeat: Infinity, duration: 8 }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.5, 0.3, 0.5]
                    }}
                    transition={{ repeat: Infinity, duration: 8 }}
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-card p-8 max-w-md w-full relative z-10"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 mb-4"
                    >
                        <Sparkles size={32} />
                    </motion.div>
                    <h1 className="text-2xl font-black font-outfit uppercase tracking-tight">
                        Welcome to <span className="text-teal-500">Lumina Derma</span>
                    </h1>
                    <p className="text-white/40 text-sm font-medium mt-2">
                        Start your radiance journey today
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-white/60 mb-2 block">
                            Your Name
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500/50">
                                <User size={20} />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Sarah Johnson"
                                required
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Phone Input */}
                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-white/60 mb-2 block">
                            Phone Number
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500/50">
                                <Phone size={20} />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+91 99999 00000"
                                required
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isLoading || !name.trim() || !phone.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full mt-6 py-4 bg-teal-500 hover:bg-teal-400 disabled:bg-white/5 disabled:text-white/20 text-white font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(45,212,191,0.3)]"
                    >
                        {isLoading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                        ) : (
                            <>
                                Start Your Journey
                                <ArrowRight size={20} />
                            </>
                        )}
                    </motion.button>
                </form>

                {/* Footer Note */}
                <p className="text-center text-[10px] text-white/20 font-bold uppercase tracking-widest mt-6">
                    No password required • Instant access
                </p>
            </motion.div>
        </div>
    );
}
