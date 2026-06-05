import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Crown, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const tabs = [
    { id: 'week', label: 'Minggu Ini' },
    { id: 'month', label: 'Bulan Ini' },
    { id: 'quarter', label: 'Kuartal Ini' },
    { id: 'year', label: 'Tahun Ini' }
];

const Leaderboard = () => {
    const [activeTab, setActiveTab] = useState('week');
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data: custData, error: custErr } = await supabase
                    .from('customers')
                    .select('phone_number, name');
                if (custErr) throw custErr;

                const { data: txData, error: txErr } = await supabase
                    .from('point_transactions')
                    .select('phone_number, amount, created_at');
                if (txErr) throw txErr;

                setCustomers(custData || []);
                setTransactions(txData || []);
            } catch (error) {
                console.error('Error fetching leaderboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatName = (fullName) => {
        if (!fullName) return 'AUROPeep';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        // Keep first word and first character of subsequent word
        const secondPart = parts[1][0] ? `${parts[1][0]}.` : '';
        return `${parts[0]} ${secondPart}`;
    };

    const getLeaderboardData = (period) => {
        const cutoffDate = new Date();
        if (period === 'week') {
            cutoffDate.setDate(cutoffDate.getDate() - 7);
        } else if (period === 'month') {
            cutoffDate.setDate(cutoffDate.getDate() - 30);
        } else if (period === 'quarter') {
            cutoffDate.setDate(cutoffDate.getDate() - 90);
        } else if (period === 'year') {
            cutoffDate.setDate(cutoffDate.getDate() - 365);
        }

        // Group and sum positive points earned in the period
        const pointMap = {};
        transactions.forEach(tx => {
            const txDate = new Date(tx.created_at);
            if (txDate >= cutoffDate && tx.amount > 0) {
                pointMap[tx.phone_number] = (pointMap[tx.phone_number] || 0) + tx.amount;
            }
        });

        // Map to customer details
        const board = customers.map(c => {
            const periodPoints = pointMap[c.phone_number] || 0;
            return {
                phone_number: c.phone_number,
                name: formatName(c.name),
                points: periodPoints
            };
        })
        .filter(c => c.points > 0) // Only show customers who earned points
        .sort((a, b) => b.points - a.points); // Sort descending

        return board;
    };

    const currentBoard = getLeaderboardData(activeTab);

    return (
        <section id="leaderboard" className="py-24 bg-[#0a0a0a] border-t border-[#d4af37]/5 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
                    >
                        <Trophy size={12} className="text-[#d4af37]" /> 🔥 AUROPeeps Flex
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="serif text-4xl md:text-5xl font-bold text-white mb-4 italic"
                    >
                        The Ultimate <span className="text-[#d4af37]">Points Flex</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-[#a1a1a1] text-sm max-w-lg mx-auto"
                    >
                        Spesial buat AUROPeeps yang rajin glow up dan flexing poin loyalitas terbanyak. Lo di peringkat berapa?
                    </motion.p>
                </div>

                {/* Tab buttons */}
                <div className="flex justify-center mb-10">
                    <div className="flex bg-[#121212] border border-[#d4af37]/10 rounded-full p-1.5 w-full max-w-lg justify-between shadow-2xl relative z-10">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative py-2.5 px-4 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-300 w-1/4 text-center ${
                                    activeTab === tab.id ? 'text-[#0a0a0a]' : 'text-[#a1a1a1] hover:text-white'
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute inset-0 bg-[#d4af37] rounded-full -z-0"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Leaderboard content */}
                <div className="glass-card bg-[#121212]/80 border border-[#d4af37]/15 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                            <p className="text-[#a1a1a1] text-xs font-mono uppercase tracking-widest">Checking point lo, bentar ya...</p>
                        </div>
                    ) : currentBoard.length === 0 ? (
                        <div className="text-center py-16">
                            <Award className="mx-auto text-[#d4af37]/20 mb-4" size={48} />
                            <p className="text-[#a1a1a1] text-sm">Masih sepi nih, belum ada yang kumpulin poin.</p>
                            <p className="text-[#555] text-xs mt-1">Gas jadi yang pertama dengan booking capster lo sekarang!</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {currentBoard.slice(0, 10).map((player, idx) => {
                                const rank = idx + 1;
                                let rankBadge = null;
                                let rankBg = 'bg-[#1a1a1a]/40 border-white/5';
                                let nameColor = 'text-white/95';

                                if (rank === 1) {
                                    rankBadge = <Crown size={16} className="text-[#0a0a0a] fill-[#0a0a0a]" />;
                                    rankBg = 'bg-gradient-to-r from-[#d4af37] to-[#f3d582] border-[#f5db99] shadow-[0_4px_20px_rgba(212,175,55,0.25)]';
                                    nameColor = 'text-[#0a0a0a] font-black';
                                } else if (rank === 2) {
                                    rankBadge = <Award size={16} className="text-[#e1e1e1] fill-[#e1e1e1]" />;
                                    rankBg = 'bg-[#2a2a2a] border-white/10';
                                    nameColor = 'text-white font-extrabold';
                                } else if (rank === 3) {
                                    rankBadge = <Award size={16} className="text-[#cd7f32] fill-[#cd7f32]" />;
                                    rankBg = 'bg-[#221c16] border-[#cd7f32]/25';
                                    nameColor = 'text-white/90 font-bold';
                                }

                                return (
                                    <motion.div
                                        key={player.phone_number}
                                        initial={{ opacity: 0, x: -15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${rankBg}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Rank Indicator */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                                rank === 1 ? 'bg-[#0a0a0a] text-[#d4af37]' : 'bg-[#0a0a0a]/50 text-[#a1a1a1]'
                                            }`}>
                                                {rank}
                                            </div>

                                            {/* Name */}
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm tracking-wide ${nameColor}`}>{player.name}</span>
                                                {rankBadge && <span className="inline-block shrink-0">{rankBadge}</span>}
                                            </div>
                                        </div>

                                        {/* Points display */}
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-mono text-sm font-bold uppercase tracking-wider ${
                                                rank === 1 ? 'text-[#0a0a0a]' : 'text-[#d4af37]'
                                            }`}>
                                                {player.points}
                                            </span>
                                            <span className={`text-[10px] uppercase font-bold tracking-widest ${
                                                rank === 1 ? 'text-[#0a0a0a]/70' : 'text-[#a1a1a1]'
                                            }`}>
                                                Pts
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Leaderboard;
