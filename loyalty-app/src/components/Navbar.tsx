"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, FileText, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar({ locationId }: { locationId: string }) {
    const pathname = usePathname();

    const tabs = [
        {
            label: "Home",
            icon: Home,
            href: `/rewards/${locationId}`,
            active: pathname === `/rewards/${locationId}`
        },
        {
            label: "Scan",
            icon: Camera,
            href: `/rewards/${locationId}?action=scan`,
            active: false
        },
        {
            label: "Results",
            icon: FileText,
            href: `/rewards/${locationId}/analysis-result`,
            active: pathname.includes('analysis-result')
        },
        {
            label: "Profile",
            icon: User,
            href: `/rewards/${locationId}/history`,
            active: pathname.includes('history')
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
            <div className="max-w-[440px] mx-auto bg-[#0a0f16]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-2 py-2 flex items-center justify-between shadow-2xl shadow-black pointer-events-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.label}
                            href={tab.href}
                            className={`flex flex-col items-center justify-center flex-1 py-2.5 rounded-[1.5rem] transition-all duration-300 relative group ${tab.active
                                ? "text-teal-400"
                                : "text-white/30 hover:text-white/60"
                                }`}
                        >
                            {tab.active && (
                                <motion.div
                                    layoutId="nav-bg"
                                    className="absolute inset-0 bg-teal-500/10 rounded-[1.5rem]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon size={22} className={`relative z-10 transition-transform duration-300 ${tab.active ? "mb-1 scale-110" : "mb-1"}`} />
                            <span className={`relative z-10 text-[9px] font-black uppercase tracking-[0.1em] ${tab.active ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                                }`}>
                                {tab.label}
                            </span>

                            {tab.active && (
                                <motion.div
                                    layoutId="nav-dot"
                                    className="absolute -bottom-1 w-1 h-1 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
