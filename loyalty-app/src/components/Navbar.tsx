import { ReactNode } from "react";
import Link from "next/link";
import { Home, Trophy, History, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface NavItemProps {
    href: string;
    icon: ReactNode;
    label: string;
    active?: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
    return (
        <Link href={href} className="flex flex-col items-center gap-1 group">
            <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                active ? "bg-[var(--primary)] text-white glow-primary" : "text-white/40 group-hover:bg-white/5 group-hover:text-white/60"
            )}>
                {icon}
            </div>
            <span className={cn(
                "text-[10px] uppercase tracking-tighter font-bold transition-all duration-300",
                active ? "text-[var(--primary)]" : "text-white/20"
            )}>
                {label}
            </span>
        </Link>
    );
}

export default function Navbar({ locationId }: { locationId: string }) {
    // In a real app, use usePathname() to detect active route
    // For now we pass it or just mock it
    return (
        <nav className="fixed bottom-6 left-4 right-4 z-50">
            <div className="glass-card flex items-center justify-around p-4 px-6 border border-white/10 premium-shadow">
                <NavItem href={`/rewards/${locationId}`} icon={<Home size={20} />} label="Home" active />
                <NavItem href={`/rewards/${locationId}/rewards`} icon={<Trophy size={20} />} label="Rewards" />
                <NavItem href={`/rewards/${locationId}/history`} icon={<History size={20} />} label="History" />
                <NavItem href={`/rewards/${locationId}/admin`} icon={<Settings size={20} />} label="Admin" />
            </div>
        </nav>
    );
}
