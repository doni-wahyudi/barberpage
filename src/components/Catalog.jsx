import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Catalog = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .neq('is_active', false)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });

                if (data) setProducts(data);
            } catch (err) {
                console.error("Failed to fetch products:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const handleOrder = (product) => {
        const message = `Halo Auro Barbershop! Saya tertarik untuk membeli produk: ${product.name} (${formatPrice(product.price)}). Apakah masih tersedia?`;
        const waUrl = `https://wa.me/6285219461408?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    return (
        <section id="catalog" className="py-24 bg-[#0a0a0a] relative border-t border-[#d4af37]/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                    >
                        Produk Perawatan
                    </motion.span>
                    <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Katalog Eksklusif</h2>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500/50">
                        <AlertCircle size={48} className="mx-auto mb-4" />
                        <p>Gagal memuat katalog: {error}</p>
                        <p className="text-xs mt-2 text-[#a1a1a1]">Pastikan tabel 'products' memiliki kolom 'is_active' dan 'stock'.</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12 text-[#a1a1a1]">
                        <Package size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Katalog produk akan segera hadir.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {products.map((product, index) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card flex flex-col group overflow-hidden"
                            >
                                <div className="h-48 md:h-64 bg-[#141414] relative overflow-hidden flex items-center justify-center">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-80 group-hover:opacity-100 group-hover:scale-105"
                                        />
                                    ) : (
                                        <Package size={48} className="text-[#333]" />
                                    )}

                                    {product.stock <= 0 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-full">
                                                Stok Habis
                                            </span>
                                        </div>
                                    )}

                                    {product.stock > 0 && product.stock <= 5 && (
                                        <div className="absolute top-2 right-2">
                                            <span className="bg-[#d4af37] text-black text-[8px] font-bold px-2 py-1 uppercase tracking-tighter rounded">
                                                Stok Terbatas
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 md:p-6 flex flex-col flex-1">
                                    <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-1">{product.name}</h3>
                                    <p className="text-[#d4af37] font-mono text-xs md:text-sm font-bold mb-4">
                                        {formatPrice(product.price)}
                                    </p>

                                    <button
                                        disabled={product.stock <= 0}
                                        onClick={() => handleOrder(product)}
                                        className={`mt-auto w-full py-3 rounded text-[10px] uppercase font-bold tracking-widest transition-all flex items-center justify-center gap-2 
                                            ${product.stock > 0
                                                ? 'bg-transparent border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37] hover:text-black hover:border-[#d4af37]'
                                                : 'bg-transparent border border-[#333] text-[#333] cursor-not-allowed'}`}
                                    >
                                        <ShoppingBag size={14} />
                                        {product.stock > 0 ? 'Beli Via WhatsApp' : 'Habis'}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Catalog;
