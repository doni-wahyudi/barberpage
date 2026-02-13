import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Mail, Instagram, ExternalLink } from 'lucide-react';

const Location = () => {
    const operatingHours = [
        { day: "Monday - Friday", time: "10:00 AM - 09:00 PM" },
        { day: "Saturday", time: "10:00 AM - 08:00 PM" },
        { day: "Sunday", time: "Closed" }
    ];

    return (
        <section id="location" className="py-24 bg-[#0a0a0a] border-t border-[#d4af37]/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Find Us</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2 mb-8">The Studio</h2>

                        <div className="space-y-8">
                            <div className="flex gap-6">
                                <div className="w-12 h-12 glass-card flex items-center justify-center flex-shrink-0">
                                    <MapPin className="text-[#d4af37]" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1 uppercase tracking-widest text-sm">Location</h4>
                                    <p className="text-[#a1a1a1] text-sm leading-relaxed">
                                        Royal Plaza Block B1-14<br />
                                        Central Business District, Jakarta<br />
                                        12345, Indonesia
                                    </p>
                                    <a
                                        href="https://maps.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[#d4af37] text-xs mt-3 uppercase tracking-widest font-bold hover:underline"
                                    >
                                        Open in Maps <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-12 h-12 glass-card flex items-center justify-center flex-shrink-0">
                                    <Clock className="text-[#d4af37]" size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white mb-3 uppercase tracking-widest text-sm">Operating Hours</h4>
                                    <div className="space-y-2">
                                        {operatingHours.map((item, i) => (
                                            <div key={i} className="flex justify-between border-b border-[#d4af37]/5 pb-2">
                                                <span className="text-xs text-[#a1a1a1]">{item.day}</span>
                                                <span className="text-xs text-[#d4af37] font-mono">{item.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-12 h-12 glass-card flex items-center justify-center flex-shrink-0">
                                    <Phone className="text-[#d4af37]" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1 uppercase tracking-widest text-sm">Contact</h4>
                                    <p className="text-[#a1a1a1] text-sm">+62 812 3456 7890</p>
                                    <p className="text-[#a1a1a1] text-sm font-mono">hello@dcukur.com</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <div className="aspect-video w-full glass-card overflow-hidden group">
                            {/* Background Map Placeholder */}
                            <div className="absolute inset-0 bg-[#141414] flex items-center justify-center flex-col gap-4">
                                <div className="w-20 h-20 rounded-full border border-[#d4af37]/20 flex items-center justify-center animate-pulse">
                                    <MapPin className="text-[#d4af37]/30" size={40} />
                                </div>
                                <span className="text-[#d4af37]/20 uppercase tracking-[0.5em] text-[10px]">Satellite View Placeholder</span>
                            </div>

                            {/* Overlay with CTA */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500 z-10 flex items-center justify-center">
                                <a
                                    href="https://maps.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gold-button !text-xs"
                                >
                                    Get Directions
                                </a>
                            </div>
                        </div>

                        {/* Ambient gold glow */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#d4af37]/5 blur-[80px] rounded-full" />
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default Location;
