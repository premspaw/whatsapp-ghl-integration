import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Loyalty Rewards | Elevate Your Experience",
  description: "Earn points and unlock exclusive rewards",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jakarta.variable} ${outfit.variable} antialiased selection:bg-teal-500/30`}
      >
        {/* Aesthetic Background Elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[#05070a]" />
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/5 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s' }} />

          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-150" />
        </div>

        <main className="min-h-screen max-w-md mx-auto relative px-4 pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
