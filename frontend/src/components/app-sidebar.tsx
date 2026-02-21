"use client";

import * as React from "react";
import {
    LayoutDashboard,
    Users,
    FileText,
    PieChart,
    Upload,
    MessageSquare,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { Card } from "@/components/ui/Card";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Managers", href: "/managers" },
    { icon: FileText, label: "Tickets", href: "/tickets" },
    { icon: PieChart, label: "Analytics", href: "/analytics" },
    { icon: Upload, label: "Import CSV", href: "/import" },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-xl">
                                    F
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">FIRE Engine</span>
                                    <span className="text-xs text-muted-foreground truncate">Intelligent Routing</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                                        tooltip={item.label}
                                    >
                                        <Link href={item.href}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <div className="p-4 group-data-[collapsible=icon]:hidden">
                    <Card className="bg-primary/10 border-primary/20 p-4">
                        <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">AI Assistant</p>
                        <p className="text-sm text-slate-300 mb-4">Ask anything about your tickets</p>
                        <button className="w-full py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold transition-colors">
                            Chat
                        </button>
                    </Card>
                </div>
                <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center p-2">
                    <SidebarMenuButton tooltip="AI Assistant">
                        <MessageSquare />
                    </SidebarMenuButton>
                </div>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
