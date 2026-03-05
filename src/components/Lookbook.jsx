import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Image as ImageIcon } from 'lucide-react';

const Lookbook = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const { data, error } = await supabase
                    .from('gallery_images')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false })
                    .limit(6); // Only show top 6 on landing page

                if (error) throw error;
                setImages(data || []);
            } catch (error) {
                console.error('Error fetching lookbook images:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, []);

    return (
        <section id="lookbook" className="py-24 bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                        >
                            Galeri
                        </motion.span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Gaya Rambut Mahakarya</h2>
                    </div>
                    <p className="max-w-md text-[#a1a1a1] text-sm leading-relaxed">
                        Jelajahi karya terbaru kami dan temukan gaya yang mendefinisikan legenda Anda. Setiap potongan rambut adalah mahakarya presisi dan karakter.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#d4af37]/10 min-h-[400px]">
                    {loading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 object-contain">
                            <div className="inline-block w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-[#a1a1a1]">Memuat mahakarya...</p>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 text-[#a1a1a1]">
                            <ImageIcon size={48} className="mb-4 opacity-20" />
                            <p>Galeri masih kosong.</p>
                        </div>
                    ) : (
                        images.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative aspect-square overflow-hidden group border border-[#d4af37]/5 bg-[#141414]"
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-[#d4af37]/20 text-xs uppercase tracking-widest font-bold z-0">
                                    PORTOFOLIO AURO
                                </div>

                                {item.image_url && (
                                    <img
                                        src={item.image_url}
                                        alt={item.title}
                                        className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 z-10"
                                    />
                                )}

                                <motion.div
                                    className="absolute inset-0 bg-black/40 group-hover:bg-black/0 transition-all duration-500 z-20"
                                />

                                <div className="absolute inset-0 z-30 p-8 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                                    <span className="text-[#d4af37] text-[10px] uppercase tracking-widest mb-1">{item.category}</span>
                                    <h3 className="serif text-xl font-bold text-white">{item.title}</h3>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default Lookbook;
