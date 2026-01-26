
import React from 'react';
import './GodVortex.css';

interface GodVortexProps {
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    auraColor?: 'gold' | 'purple' | 'blue' | 'rose' | 'cyan';
    intensity?: 'low' | 'normal' | 'high';
    animationSpeed?: 'slow' | 'normal' | 'fast';
    isActive?: boolean;
    className?: string;
    label?: string; // Support label from reference
}

export const GodVortex: React.FC<GodVortexProps> = ({
    children,
    size = 'md',
    auraColor = 'gold',
    intensity = 'normal',
    animationSpeed = 'normal',
    isActive = true,
    className = '',
    label
}) => {

    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    const colorMap = {
        gold: '255, 215, 0',
        purple: '168, 85, 247',
        blue: '59, 130, 246',
        rose: '244, 63, 94',
        cyan: '6, 182, 212'
    };

    const rgb = colorMap[auraColor] || colorMap.gold;

    // Calculate duration based on speed
    const baseSpeed = animationSpeed === 'slow' ? 6 : animationSpeed === 'fast' ? 2 : 4;

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div
                className={`god-vortex-wrapper ${sizeClasses[size]}`}
                style={{
                    '--vortex-rgb': rgb,
                    '--vortex-speed': `${baseSpeed}s`,
                    '--pulse-speed': `${baseSpeed * 0.75}s`
                } as React.CSSProperties}
            >
                {isActive && (
                    <>
                        {/* 1. Nebula Cloud (Main Aura) - Breathing & Wobbling */}
                        <div className="absolute inset-[-40%] rounded-[40%] bg-[radial-gradient(circle,rgba(var(--vortex-rgb),0.3)_0%,transparent_70%)] animate-liquid-wobble blur-lg mix-blend-screen pointer-events-none"></div>

                        {/* 2. Vortex Spin - High Energy Inner Ring */}
                        <div className="absolute inset-[-10%] rounded-full mix-blend-screen animate-spin-vortex opacity-80 pointer-events-none"
                            style={{
                                background: `conic-gradient(from 0deg, transparent 0%, rgba(var(--vortex-rgb), 0.1) 20%, rgba(var(--vortex-rgb), 0.8) 50%, rgba(var(--vortex-rgb), 0.1) 80%)`,
                                maskImage: 'radial-gradient(closest-side, transparent 65%, black 100%)',
                                WebkitMaskImage: 'radial-gradient(closest-side, transparent 65%, black 100%)'
                            }}
                        ></div>

                        {/* 3. Reverse Energy Flow - Complex interleave */}
                        <div className="absolute inset-[-5%] rounded-full mix-blend-screen animate-spin-vortex-reverse opacity-60 pointer-events-none"
                            style={{
                                background: `conic-gradient(from 180deg, transparent 0%, rgba(var(--vortex-rgb), 0) 30%, rgba(var(--vortex-rgb), 0.6) 60%, transparent 100%)`,
                                maskImage: 'radial-gradient(closest-side, transparent 70%, black 100%)',
                                WebkitMaskImage: 'radial-gradient(closest-side, transparent 70%, black 100%)'
                            }}
                        ></div>

                        {/* 4. Core Singularity Border */}
                        <div className="absolute inset-0 rounded-full border border-[rgba(var(--vortex-rgb),0.6)] animate-pulse-core shadow-[0_0_10px_rgba(var(--vortex-rgb),0.4)]"></div>
                    </>
                )}

                {/* Particle Emitters for 'high' intensity */}
                {isActive && intensity === 'high' && (
                    <div className="absolute inset-0 pointer-events-none overflow-visible">
                        <div className="particle p1"></div>
                        <div className="particle p2"></div>
                        <div className="particle p3"></div>
                    </div>
                )}

                {/* Avatar / Content */}
                <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-2 border-[rgba(var(--vortex-rgb),0.3)] bg-[#0B0E14] shadow-2xl">
                    {children}
                </div>
            </div>

            {/* Optional Label (Level/Rank) */}
            {label && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[rgba(var(--vortex-rgb),0.1)] border border-[rgba(var(--vortex-rgb),0.2)]" style={{ color: `rgb(${rgb})` }}>
                    {label}
                </span>
            )}
        </div>
    );
};
