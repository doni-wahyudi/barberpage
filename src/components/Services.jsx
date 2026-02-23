import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Services = ({ onSelectService }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data, error } = await supabase
                    .from('services')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                if (data) setServices(data);
            } catch (err) {
                console.error("Failed to fetch services:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, []);
    return (
        <section id="services" className="py-24 bg-[#0a0a0a] relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                    >
                        The Menu
                    </motion.span>
                    <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Executive Services</h2>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {services.map((service, index) => (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.6 }}
                                whileHover={{ y: -10 }}
                                className="glass-card overflow-hidden flex flex-col group cursor-default"
                            >
                                {/* Service Image Placeholder */}
                                <div className="h-48 w-full bg-[#141414] relative overflow-hidden">
                                    {service.image_url ? (
                                        <img
                                            src={service.image_url}
                                            alt={service.name}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-50 group-hover:opacity-100"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#333]">
                                            <Scissors size={48} className="mb-2 opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                    <div className="absolute bottom-4 left-6 text-[#d4af37] group-hover:scale-110 transition-transform duration-500">
                                        <Scissors size={32} />
                                    </div>
                                </div>

                                <div className="p-8 pt-4 flex flex-col gap-4 flex-1">
                                    <div>
                                        <div className="flex justify-between items-baseline mb-2">
                                            <h3 className="serif text-xl font-bold">{service.name}</h3>
                                            <span className="text-[#d4af37] font-bold font-mono text-sm">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(service.price)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[#a1a1a1] leading-relaxed line-clamp-3">
                                            {service.description || "Premium haircut experience by Auro Barbershop."}
                                        </p>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-[#d4af37]/10 flex justify-between items-center">
                                        <button
                                            onClick={() => onSelectService && onSelectService(service.name)}
                                            className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold hover:translate-x-2 transition-transform inline-flex items-center gap-2"
                                        >
                                            Book This Service
                                        </button>
                                        {service.is_redeemable && (
                                            <span className="text-[9px] bg-[#d4af37]/10 text-[#d4af37] px-2 py-1 rounded font-mono font-bold">
                                                REDEEM: {service.points_required} PTS
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Services;
