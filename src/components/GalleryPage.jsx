import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';

const CATEGORIES = ["Semua", "Classic", "Modern", "Formal", "Casual"];

const GalleryPage = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("Semua");

    useEffect(() => {
        const fetchAllImages = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('gallery_images')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setImages(data || []);
            } catch (error) {
                console.error('Error fetching gallery page images:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllImages();
        
        // Scroll to top when page is opened
        window.scrollTo(0, 0);
    }, []);

    const filteredImages = selectedCategory === "Semua"
        ? images
        : images.filter(img => img.category?.toLowerCase() === selectedCategory.toLowerCase());

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#d4af37]/3 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto">
                {/* Back Navigation */}
                <header className="mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-[#a1a1a1] hover:text-[#d4af37] transition-colors group text-sm uppercase tracking-widest font-bold"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> kembali ke beranda
                    </button>
                </header>

                {/* Section Header */}
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="uppercase tracking-[0.3em] text-[#d4af37] text-xs font-bold"
                    >
                        Auro Lookbook
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="serif text-4xl md:text-6xl font-bold mt-2 mb-6 italic"
                    >
                        Galeri <span className="text-[#d4af37]">Hairstyle</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-xl mx-auto text-[#a1a1a1] text-sm leading-relaxed"
                    >
                        Eksplorasi lookbook haircut terlengkap dari capster profesional Auro Barbershop. Pilih gaya terkeren lo dan booking sekarang!
                    </motion.p>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 border ${
                                selectedCategory === category
                                    ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_4px_15px_rgba(212,175,55,0.25)]'
                                    : 'bg-[#141414]/80 text-[#a1a1a1] border-[#d4af37]/10 hover:border-[#d4af37]/40 hover:text-white'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Image Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="animate-spin text-[#d4af37] mb-4" size={36} />
                        <p className="text-[#a1a1a1] font-mono text-xs uppercase tracking-widest">Memuat inspirasi...</p>
                    </div>
                ) : filteredImages.length === 0 ? (
                    <div className="glass-card flex flex-col items-center justify-center py-24 text-[#a1a1a1] border border-[#d4af37]/10 rounded-2xl max-w-xl mx-auto">
                        <ImageIcon size={48} className="mb-4 opacity-25" />
                        <p className="text-sm">Belum ada foto gaya rambut untuk kategori ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredImages.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative aspect-square overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-[#141414] group shadow-xl"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center text-[#d4af37]/10 text-xs uppercase tracking-widest font-bold z-0">
                                        AURO LOOKBOOK
                                    </div>

                                    {item.image_url && (
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 z-10"
                                        />
                                    )}

                                    <div className="absolute inset-0 bg-black/45 group-hover:bg-black/10 transition-all duration-500 z-20" />

                                    <div className="absolute inset-0 z-30 p-8 flex flex-col justify-end translate-y-3 group-hover:translate-y-0 opacity-80 group-hover:opacity-100 transition-all duration-500">
                                        <span className="text-[#d4af37] text-[10px] uppercase font-black tracking-widest mb-1">{item.category}</span>
                                        <h3 className="serif text-xl font-bold text-white shadow-sm">{item.title}</h3>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GalleryPage;
