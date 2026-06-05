import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { User, Scissors, Star } from 'lucide-react';

const Team = () => {
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBarbers = async () => {
            try {
                const { data, error } = await supabase
                    .from('barbers')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) throw error;
                setBarbers(data || []);
            } catch (error) {
                console.error('Error fetching team:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBarbers();
    }, []);

    if (loading || barbers.length === 0) return null;

    return (
        <section id="team" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#d4af37]/5 rounded-full blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.span 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="uppercase tracking-[0.4em] text-[#d4af37] text-xs font-bold"
                    >
                        Master of Craft
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="serif text-4xl md:text-6xl font-bold mt-4 mb-6"
                    >
                        Kenali <span className="gold-gradient italic">Seniman</span> Kami
                    </motion.h2>
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent w-48 mx-auto"
                    />
                </div>

                <div className="flex flex-wrap justify-center gap-10">
                    {barbers.map((barber, index) => (
                        <motion.div
                            key={barber.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative w-full sm:w-[360px] md:w-[380px] flex-shrink-0"
                        >
                            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#d4af37]/10 bg-[#141414]">
                                {barber.photo_url ? (
                                    <img 
                                        src={barber.photo_url} 
                                        alt={barber.name} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <img 
                                        src={`${import.meta.env.BASE_URL}placeholder-barber.png`} 
                                        alt="Master Barber Placeholder" 
                                        className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-110"
                                    />
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                
                                {/* Content Overlay */}
                                <div className="absolute inset-0 flex flex-col justify-end p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="mb-4">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-bold uppercase tracking-widest mb-3">
                                            <Scissors size={10} /> {barber.specialty || 'Master Barber'}
                                        </span>
                                        <h3 className="serif text-3xl font-bold text-white group-hover:text-[#d4af37] transition-colors">{barber.name}</h3>
                                    </div>
                                    
                                    <p className="text-[#a1a1a1] text-sm italic line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 leading-relaxed">
                                        "{barber.bio || 'Mendedikasikan diri untuk memberikan potongan rambut terbaik dengan presisi dan gaya.'}"
                                    </p>
                                    
                                    <div className="flex items-center gap-4 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                                        <div className="flex items-center gap-1 text-[#d4af37]">
                                            <Star size={14} className="fill-[#d4af37]" />
                                            <span className="text-xs font-bold">TOP RATED</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Accent Decoration */}
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-r border-b border-[#d4af37]/20 rounded-br-2xl -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Team;
