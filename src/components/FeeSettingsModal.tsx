
import React, { useState } from 'react';
import { UserProfile, FeeConfig } from '../types';

interface FeeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile;
    onUpdateProfile: (profile: UserProfile) => void;
}

const FeeSettingsModal: React.FC<FeeSettingsModalProps> = ({ isOpen, onClose, userProfile, onUpdateProfile }) => {
    const [localFees, setLocalFees] = useState<FeeConfig>(userProfile.fees || { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' });

    if (!isOpen) return null;

    const handleSave = () => {
        onUpdateProfile({ ...userProfile, fees: localFees });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 bg-[#151A25]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-percent text-indigo-400"></i> Fee Structure
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Define how trading fees are calculated for your trades on {userProfile.primaryExchange}.</p>
                </div>

                <div className="p-6 space-y-6">

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white uppercase tracking-wider">Calculation Method</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="feeType"
                                    checked={localFees.type === 'PERCENTAGE'}
                                    onChange={() => setLocalFees({ ...localFees, type: 'PERCENTAGE' })}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm text-slate-300">Percentage (%)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="feeType"
                                    checked={localFees.type === 'FIXED'}
                                    onChange={() => setLocalFees({ ...localFees, type: 'FIXED' })}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm text-slate-300">Fixed (USD)</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Maker Fee {localFees.type === 'PERCENTAGE' ? '(%)' : '($)'}</label>
                            <input
                                type="number"
                                value={localFees.maker}
                                onChange={(e) => setLocalFees({ ...localFees, maker: parseFloat(e.target.value) })}
                                className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taker Fee {localFees.type === 'PERCENTAGE' ? '(%)' : '($)'}</label>
                            <input
                                type="number"
                                value={localFees.taker}
                                onChange={(e) => setLocalFees({ ...localFees, taker: parseFloat(e.target.value) })}
                                className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                        <p className="text-xs text-indigo-300">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            Calculations assume a round-trip trade (Entry + Exit). Estimates in the log will use the <strong>Taker</strong> fee for worst-case scenario.
                        </p>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-800 bg-[#0B0E14] flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeeSettingsModal;
