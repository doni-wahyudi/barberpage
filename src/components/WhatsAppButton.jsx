import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
    const phoneNumber = "6285219461408"; // Auro Barbershop number
    const message = encodeURIComponent("Halo Auro! Mau tanya seputar booking, reschedule, atau edit data booking gua nih.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <div className="fixed bottom-8 right-6 sm:right-8 z-[90] group">
            <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.06, y: -4 }}
                whileTap={{ scale: 0.94 }}
                className="relative w-14 h-14 bg-[#141414]/95 text-[#d4af37] rounded-full flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.45)] overflow-hidden border border-[#d4af37]/45 backdrop-blur-md transition-colors hover:bg-[#d4af37] hover:text-[#0a0a0a] hover:border-[#f1d592]"
                aria-label="Chat Auro Barbershop lewat WhatsApp"
            >
                {/* Animated Glow */}
                <motion.div
                    animate={{ scale: [1, 1.45, 1], opacity: [0.18, 0, 0.18] }}
                    transition={{ duration: 2.6, repeat: Infinity }}
                    className="absolute inset-0 bg-[#d4af37] rounded-full pointer-events-none"
                />

                <span className="absolute inset-1 rounded-full border border-white/5 pointer-events-none" />
                <MessageCircle size={27} className="relative z-10" />
            </motion.a>

            {/* Tooltip on Hover */}
            <div className="pointer-events-none absolute right-[4.25rem] top-1/2 -translate-y-1/2 w-max max-w-[220px] rounded border border-[#d4af37]/35 bg-[#141414]/95 px-4 py-2 text-left shadow-2xl opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">Chat WhatsApp</p>
                <p className="mt-1 text-xs leading-relaxed text-[#e1e1e1]">Tanya jadwal, layanan, reschedule, atau edit booking lo.</p>
            </div>
        </div>
    );
};

export default WhatsAppButton;
