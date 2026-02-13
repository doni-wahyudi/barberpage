import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
    const phoneNumber = "6281234567890"; // Replace with real barber number
    const message = encodeURIComponent("Hello DCUKUR! I'd like to ask about a royal grooming session.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[90] w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden group"
        >
            {/* Animated Glow */}
            <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white rounded-full pointer-events-none"
            />

            <MessageCircle size={28} className="relative z-10" />

            {/* Tooltip on Hover */}
            <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-[#25D366] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Quick Chat
            </div>
        </motion.a>
    );
};

export default WhatsAppButton;
