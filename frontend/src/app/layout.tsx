import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FIRE Engine | Freedom Intelligent Routing",
  description: "Advanced AI Routing for Client Tickets",
};

import { Sidebar } from "@/components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-slate-100 antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-background">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
