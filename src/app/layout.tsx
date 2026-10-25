import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CampAI — CampusOS | Next-Gen AI Campus Operating System",
    template: "%s | CampAI CampusOS",
  },
  description:
    "An enterprise-grade, accessible, multi-tenant campus operating platform with Student, Faculty, and Admin personas, CamAI copilot, and sub-millisecond PostgreSQL workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.removeAttribute('data-theme');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] transition-colors duration-150">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
