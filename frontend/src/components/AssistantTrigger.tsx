"use client";

import { Sparkles, X } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";

export function AssistantTrigger() {
    const { isOpen, toggleAssistant } = useAssistant();
    return (
        <button
            onClick={toggleAssistant}
            className={`p-2 rounded-md transition-all flex items-center gap-1.5 group border border-transparent 
                ${isOpen ? 'bg-[#182833] text-white border-[#233642]' : 'text-[#5b6f7c] hover:bg-white/5 hover:text-white'}`}
        >
            {isOpen ? <X size={20} /> : <Sparkles size={20} className="text-primary animate-pulse" />}
        </button>
    );
}
