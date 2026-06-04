import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const RefreshButton = () => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        sessionStorage.setItem('scrollPosition', window.scrollY.toString());
        setTimeout(() => {
            window.location.reload();
        }, 500); // Give 500ms for spin animation to execute
    };

    return (
        <div className="fixed bottom-40 right-6 sm:right-8 z-[90] group">
            <motion.button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.06, y: -4 }}
                whileTap={{ scale: 0.94 }}
                className="relative w-14 h-14 bg-[#141414]/95 text-[#d4af37] rounded-full flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.45)] overflow-hidden border border-[#d4af37]/45 backdrop-blur-md transition-colors hover:bg-[#d4af37] hover:text-[#0a0a0a] hover:border-[#f1d592] disabled:opacity-80"
                aria-label="Segarkan halaman"
            >
                {/* Animated Glow */}
                <motion.div
                    animate={{ scale: [1, 1.45, 1], opacity: [0.18, 0, 0.18] }}
                    transition={{ duration: 2.6, repeat: Infinity }}
                    className="absolute inset-0 bg-[#d4af37] rounded-full pointer-events-none"
                />

                <span className="absolute inset-1 rounded-full border border-white/5 pointer-events-none" />
                
                <motion.div
                    animate={isRefreshing ? { rotate: 360 } : {}}
                    transition={{ duration: 0.5, ease: "linear" }}
                    className="relative z-10"
                >
                    <RefreshCw size={24} className={isRefreshing ? "" : "group-hover:rotate-45 transition-transform duration-300"} />
                </motion.div>
            </motion.button>

            {/* Tooltip on Hover */}
            <div className="pointer-events-none absolute right-[4.25rem] top-1/2 -translate-y-1/2 w-max max-w-[220px] rounded border border-[#d4af37]/35 bg-[#141414]/95 px-4 py-2 text-left shadow-2xl opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">Segarkan</p>
                <p className="mt-1 text-xs leading-relaxed text-[#e1e1e1]">Perbarui jadwal & jam operasional toko.</p>
            </div>
        </div>
    );
};

export default RefreshButton;
