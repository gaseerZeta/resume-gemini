'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Upload,
    FileText,
    Search,
    Sparkles,
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/upload', label: 'Upload', icon: Upload },
    { href: '/resumes', label: 'Resumes', icon: FileText },
    { href: '/match', label: 'Job Match', icon: Search },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-border/50 bg-sidebar">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                    <img src="/zenita-logo.svg" alt="Zenita Logo" className="h-full w-full object-contain" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        Zenita
                    </h1>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-primary/10 text-primary shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                        >
                            <Icon
                                className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary' : ''
                                    }`}
                            />
                            <span>{item.label}</span>
                            {isActive && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-border/50 px-6 py-4">
                <p className="text-xs text-muted-foreground">
                    Powered by <span className="font-semibold gradient-text">Groq · Llama-3</span>
                </p>
            </div>
        </aside>
    );
}
