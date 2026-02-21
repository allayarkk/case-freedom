import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("glass rounded-xl p-4 transition-all duration-300", className)}>
            {children}
        </div>
    );
}
