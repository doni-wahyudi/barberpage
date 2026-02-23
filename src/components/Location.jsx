import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Mail, Instagram, ExternalLink } from 'lucide-react';

const Location = () => {
    const operatingHours = [
        { day: "Senin - Jumat", time: "10:00 - 22:00" },
        { day: "Sabtu", time: "Tutup" },
        { day: "Minggu", time: "10:00 - 22:00" }
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
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Temukan Kami</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2 mb-8">Studio Kami</h2>

                        <div className="space-y-8">
                            <div className="flex gap-6">
                                <div className="w-12 h-12 glass-card flex items-center justify-center flex-shrink-0">
                                    <MapPin className="text-[#d4af37]" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-1 uppercase tracking-widest text-sm">Lokasi</h4>
                                    <p className="text-[#a1a1a1] text-sm leading-relaxed">
                                        Jl. Abdul Muis No.41, Gedong Meneng<br />
                                        Kec. Rajabasa, Kota Bandar Lampung<br />
                                        Lampung 35141
                                    </p>
                                    <a
                                        href="https://maps.app.goo.gl/qekLjzMcHjg8KhVf7"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[#d4af37] text-xs mt-3 uppercase tracking-widest font-bold hover:underline"
                                    >
                                        Buka di Maps <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="w-12 h-12 glass-card flex items-center justify-center flex-shrink-0">
                                    <Clock className="text-[#d4af37]" size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white mb-3 uppercase tracking-widest text-sm">Jam Operasional</h4>
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
                                    <h4 className="font-bold text-white mb-1 uppercase tracking-widest text-sm">Kontak</h4>
                                    <p className="text-[#a1a1a1] text-sm">+62 852 1946 1408</p>
                                    <p className="text-[#a1a1a1] text-sm font-mono mt-1">IG: aurobarbershop.id</p>
                                    <p className="text-[#a1a1a1] text-sm font-mono">TikTok: aurobarbershop.id</p>
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
                        <div className="aspect-video w-full glass-card overflow-hidden group relative">
                            {/* Google Maps Embed */}
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15888.807354673673!2d105.2348!3d-5.3852!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e40db0366b72fa1%3A0xeaecc742898c1995!2sJl.%20Abdul%20Muis%20No.41%2C%20Gedong%20Meneng%2C%20Kec.%20Rajabasa%2C%20Kota%20Bandar%20Lampung%2C%20Lampung%2035141!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid"
                                width="100%"
                                height="100%"
                                style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(80%) hue-rotate(180deg)', mixBlendMode: 'luminosity' }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="absolute inset-0 z-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                            ></iframe>

                            {/* Overlay with CTA */}
                            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-all duration-500 z-10 flex items-center justify-center pointer-events-none">
                                <a
                                    href="https://maps.app.goo.gl/qekLjzMcHjg8KhVf7"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gold-button !text-xs pointer-events-auto"
                                >
                                    Dapatkan Petunjuk Arah
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
