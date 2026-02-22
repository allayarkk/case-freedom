import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AssistantSidebar } from '@/components/AssistantSidebar';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'FIRE Engine | Intelligent Routing',
  description: 'Freedom Intelligence Routing Engine',
};

import { AssistantProvider } from '@/context/AssistantContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} bg-[#0d161d] text-[#cbd3d9]`}>
        <AssistantProvider>
          <SidebarProvider defaultOpen={false}>
            <div className="flex h-screen w-full overflow-hidden">
              <AppSidebar />
              <main className="flex-1 overflow-auto relative">
                <div className="absolute top-4 left-4 z-50">
                  <SidebarTrigger className="text-[#5b6f7c] hover:text-white" />
                </div>
                {children}
                <AssistantSidebar />
              </main>
            </div>
          </SidebarProvider>
        </AssistantProvider>
      </body>
    </html>
  );
}
