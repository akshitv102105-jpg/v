import React, { useState, useRef, useEffect } from 'react';
import { View, UserProfile } from '../types';
import { GodVortex } from './GodVortex';

interface NavbarProps {
    activeView: View;
    onViewChange: (view: View) => void;
    userProfile: UserProfile;
    rank?: { name: string, color: string, shadow: string, desc: string };
    tradeStats?: { current: number, nextTarget: number };
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange, userProfile, rank, tradeStats }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.mobile-menu-trigger')) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavClick = (view: View) => {
        onViewChange(view);
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    const navItems = [
        { id: 'dashboard' as View, label: 'Dashboard', icon: 'fa-table-columns' },
        { id: 'playbook' as View, label: 'Playbook', icon: 'fa-book-open' },
        { id: 'analytics' as View, label: 'Analytics', icon: 'fa-chart-simple' },
        { id: 'journal' as View, label: 'Journal', icon: 'fa-book' },
        { id: 'habit-tracker' as View, label: 'Habits', icon: 'fa-check-double' },
        { id: 'data-lab' as View, label: 'Data Lab', icon: 'fa-flask' },
        { id: 'achievements' as View, label: 'Awards', icon: 'fa-trophy' },
        { id: 'guru-ji' as View, label: 'Guru Ji', icon: 'custom-guru' },
    ];

    return (
        <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0B0E14]/80 px-6 backdrop-blur-md">
            <div className="flex items-center gap-4 md:gap-12">

                {/* Mobile Menu Trigger */}
                <button
                    className="md:hidden mobile-menu-trigger p-2 text-slate-400 hover:text-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
                </button>

                {/* Mobile Logo */}
                <div className="md:hidden text-lg font-bold text-white tracking-tight">
                    Vyuha
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeView === item.id
                                ? 'bg-white/5 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {item.icon === 'custom-guru' ? (
                                <img
                                    src="/guru_real.png"
                                    alt="Guru"
                                    className="w-10 h-10 object-contain animate-[bounce_3s_infinite] drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]"
                                />
                            ) : (
                                <i className={`fa-solid ${item.icon} ${activeView === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`}></i>
                            )}
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6">
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-colors outline-none group relative"
                    >
                        {/* Dynamic Aura/Glow Background */}
                        {rank && (
                            <div className={`absolute inset-0 rounded-lg opacity-20 transition-all duration-1000 group-hover:opacity-30 ${rank.shadow.replace('shadow-', 'bg-')}`}></div>
                        )}

                        <div className="text-right hidden sm:block relative z-10">
                            {/* Only display the nickname, synced from user profile */}
                            {userProfile.nickname ? (
                                <p className="text-sm font-bold text-white leading-tight">{userProfile.nickname}</p>
                            ) : (
                                <div className="h-4 w-20 bg-slate-800 rounded animate-pulse mb-1"></div>
                            )}
                            {/* Rank Name Display */}
                            {rank && (
                                <div className="flex flex-col items-end">
                                    <p className={`text-[10px] uppercase font-black tracking-widest leading-none ${rank.color} drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]`}>
                                        {rank.name}
                                    </p>
                                    {tradeStats && tradeStats.nextTarget > 0 && (
                                        <p className="text-[8px] text-slate-500 font-mono mt-0.5">
                                            {tradeStats.current}/{tradeStats.nextTarget} Trades
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Avatar Container with Rank Border/Glow */}
                        {/* Avatar Container with Rank Border/Glow */}
                        {rank && ['Elite', 'GOD'].includes(rank.name) ? (
                            <GodVortex
                                size="sm"
                                auraColor={rank.name === 'GOD' ? 'purple' : 'rose'}
                                intensity={rank.name === 'GOD' ? 'high' : 'normal'}
                                className="mr-1"
                            >
                                {userProfile.avatarImage ? (
                                    <img src={userProfile.avatarImage} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-slate-800 flex items-center justify-center">
                                        <i className="fa-solid fa-user text-slate-400 text-xs"></i>
                                    </div>
                                )}
                            </GodVortex>
                        ) : (
                            <div className={`relative h-9 w-9 rounded-full flex items-center justify-center transition-all duration-500 ${rank ? rank.shadow : 'shadow-inner border border-slate-700'}`}
                                style={rank ? { boxShadow: `0 0 15px ${rank.color.replace('text-', 'var(--tw-colors-')}` } : {}}
                            >
                                {/* Rotating Ring for Warrior */}
                                {rank && rank.name === 'Warrior' && (
                                    <div className={`absolute -inset-1 rounded-full border border-dashed border-white/30 animate-[spin_10s_linear_infinite] opacity-50`}></div>
                                )}

                                {userProfile.avatarImage ? (
                                    <div className="h-full w-full rounded-full overflow-hidden border border-white/10">
                                        <img src={userProfile.avatarImage} alt="Profile" className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-full w-full rounded-full bg-slate-800 flex items-center justify-center">
                                        <i className="fa-solid fa-user text-slate-400 text-sm"></i>
                                    </div>
                                )}
                            </div>
                        )}
                        <i className={`fa-solid fa-chevron-down text-xs text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} relative z-10`}></i>
                    </button>

                    {/* User Dropdown */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-800 bg-[#151A25] shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-3 border-b border-slate-800 mb-2 sm:hidden">
                                <p className="text-sm font-bold text-white">{userProfile.nickname}</p>
                            </div>

                            <button onClick={() => handleNavClick('profile')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#1E2330] hover:text-white flex items-center gap-3 transition-colors">
                                <i className="fa-regular fa-user w-4"></i> Profile
                            </button>
                            <button onClick={() => handleNavClick('portfolio')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#1E2330] hover:text-white flex items-center gap-3 transition-colors">
                                <i className="fa-solid fa-wallet w-4"></i> Portfolio
                            </button>
                            <button onClick={() => handleNavClick('settings')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#1E2330] hover:text-white flex items-center gap-3 transition-colors">
                                <i className="fa-solid fa-cog w-4"></i> Settings
                            </button>

                            <div className="my-2 border-t border-slate-800"></div>

                            <button className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors">
                                <i className="fa-solid fa-arrow-right-from-bracket w-4"></i> Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div ref={mobileMenuRef} className="absolute top-16 left-0 w-full bg-[#151A25] border-b border-slate-800 p-4 md:hidden flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${activeView === item.id
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
