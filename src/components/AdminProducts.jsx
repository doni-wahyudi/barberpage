import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Trash2, Edit2, ArrowLeft, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        image_url: '',
        is_redeemable: false,
        points_required: '0'
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Enforce Authentication
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/_studio_admin/login');
            } else {
                setAuthChecking(false);
                fetchProducts();
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) navigate('/_studio_admin/login');
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                price: product.price.toString(),
                image_url: product.image_url || '',
                is_redeemable: product.is_redeemable || false,
                points_required: (product.points_required || 0).toString()
            });
        } else {
            setEditingProduct(null);
            setFormData({ name: '', price: '', image_url: '', is_redeemable: false, points_required: '0' });
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ name: '', price: '', image_url: '', is_redeemable: false, points_required: '0' });
        setImageFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        let finalImageUrl = formData.image_url;

        // Upload image if a new file is selected
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `products/${fileName}`;

            try {
                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(filePath, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('images')
                    .getPublicUrl(filePath);

                finalImageUrl = publicUrl;
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Gagal mengunggah gambar. Pastikan bucket "images" tersedia dan publik.');
                setIsSubmitting(false);
                return;
            }
        }

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            image_url: finalImageUrl || null,
            is_redeemable: formData.is_redeemable,
            points_required: parseInt(formData.points_required, 10) || 0
        };

        try {
            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchProducts();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Gagal menyimpan produk.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Gagal menghapus produk.');
        }
    };

    const handleMove = async (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === products.length - 1)
        ) return;

        const newProducts = [...products];
        let needsFullSync = false;

        // Initialize sort_order if they are identical or empty
        for (let i = 0; i < newProducts.length; i++) {
            if (newProducts[i].sort_order === null || newProducts[i].sort_order === undefined) {
                newProducts[i].sort_order = i;
                needsFullSync = true;
            }
        }
        if (newProducts[index].sort_order === newProducts[direction === 'up' ? index - 1 : index + 1].sort_order) {
            needsFullSync = true;
            newProducts.forEach((p, i) => p.sort_order = i);
        }

        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const currentItem = newProducts[index];
        const targetItem = newProducts[swapIndex];

        // Swap their sort orders
        const tempOrder = currentItem.sort_order;
        currentItem.sort_order = targetItem.sort_order;
        targetItem.sort_order = tempOrder;

        // Swap in array
        newProducts[index] = targetItem;
        newProducts[swapIndex] = currentItem;

        setProducts([...newProducts]);

        try {
            if (needsFullSync) {
                const promises = newProducts.map(p =>
                    supabase.from('products').update({ sort_order: p.sort_order }).eq('id', p.id)
                );
                await Promise.all(promises);
            } else {
                await Promise.all([
                    supabase.from('products').update({ sort_order: currentItem.sort_order }).eq('id', currentItem.id),
                    supabase.from('products').update({ sort_order: targetItem.sort_order }).eq('id', targetItem.id)
                ]);
            }
        } catch (error) {
            console.error('Error updating sort order:', error);
            fetchProducts();
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    if (authChecking) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-12 pb-24 px-6 relative">
            <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
                <button
                    onClick={() => navigate('/_studio_admin')}
                    className="flex items-center gap-2 text-[#a1a1a1] hover:text-[#d4af37] transition-colors"
                >
                    <ArrowLeft size={20} /> Kembali ke Dasbor
                </button>
            </header>

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                    <div>
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Inventaris</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Kelola Produk</h2>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#b5952f] transition-all rounded text-sm font-bold text-black"
                    >
                        <Plus size={18} /> Tambah Produk
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : products.length === 0 ? (
                    <div className="glass-card p-12 text-center text-[#a1a1a1] flex flex-col items-center gap-4">
                        <Package size={48} className="opacity-20" />
                        <p>Belum ada produk yang tersedia.<br />Klik "Tambah Produk" untuk membuat produk pertama Anda.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {products.map((product, index) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-card overflow-hidden flex flex-col relative"
                                >
                                    <div className="absolute top-3 left-3 flex gap-1 z-20">
                                        <button
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            className="w-8 h-8 rounded bg-black/80 text-white flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors backdrop-blur-sm disabled:opacity-30 disabled:hover:bg-black/80 disabled:hover:text-white"
                                            title="Geser Kiri/Atas"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === products.length - 1}
                                            className="w-8 h-8 rounded bg-black/80 text-white flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors backdrop-blur-sm disabled:opacity-30 disabled:hover:bg-black/80 disabled:hover:text-white"
                                            title="Geser Kanan/Bawah"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                    {product.is_redeemable && (
                                        <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest z-10">
                                            {product.points_required} Poin Hadiah
                                        </div>
                                    )}
                                    <div className="h-48 w-full bg-[#141414] relative flex-shrink-0 border-b border-[#333]">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#333]">
                                                <ImageIcon size={48} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col pt-6">
                                        <h3 className="font-bold text-lg mb-1 line-clamp-2">{product.name}</h3>
                                        <p className="text-[#d4af37] font-mono font-bold mb-4">{formatPrice(product.price)}</p>

                                        <div className="mt-auto flex gap-2 pt-4 border-t border-[#333]">
                                            <button
                                                onClick={() => handleOpenModal(product)}
                                                className="flex-1 py-2 text-xs uppercase tracking-widest font-bold bg-[#1a1a1a] hover:bg-[#d4af37]/20 text-[#a1a1a1] hover:text-[#d4af37] transition-colors rounded flex justify-center items-center gap-2"
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="py-2 px-4 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors rounded flex justify-center items-center"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleCloseModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#121212] border border-[#d4af37]/20 w-full max-w-md rounded-xl p-6 shadow-2xl relative"
                        >
                            <h3 className="serif text-2xl font-bold mb-6 text-white text-center">
                                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Nama Produk <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Cth: Pomade"
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Harga (IDR) <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 85000"
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors font-mono tracking-wider text-white"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Gambar Produk</label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            {(imageFile || formData.image_url) && (
                                                <div className="w-16 h-16 rounded overflow-hidden bg-[#111] border border-[#333] shrink-0">
                                                    <img
                                                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setImageFile(e.target.files[0]);
                                                        setFormData({ ...formData, image_url: '' });
                                                    }
                                                }}
                                                className="w-full text-sm text-[#a1a1a1] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#d4af37] file:text-black hover:file:bg-[#b5952f] transition-colors cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 text-[#555]">
                                            <div className="h-px bg-[#333] flex-1"></div>
                                            <span className="text-[10px] uppercase font-bold tracking-widest">ATAU URL</span>
                                            <div className="h-px bg-[#333] flex-1"></div>
                                        </div>
                                        <input
                                            type="url"
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white text-sm"
                                            value={formData.image_url}
                                            onChange={(e) => {
                                                setFormData({ ...formData, image_url: e.target.value });
                                                setImageFile(null);
                                            }}
                                        />
                                        <p className="text-[10px] text-[#555] mt-1">Biarkan kosong untuk menggunakan ikon bawaan. Upload file akan mengganti URL URL.</p>
                                    </div>
                                </div>

                                <div className="border-t border-[#333] pt-4 mt-2">
                                    <label className="flex items-center gap-3 cursor-pointer mb-4">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={formData.is_redeemable}
                                                onChange={(e) => setFormData({ ...formData, is_redeemable: e.target.checked })}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_redeemable ? 'bg-[#d4af37]' : 'bg-[#333]'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${formData.is_redeemable ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-sm font-bold">Tersedia sebagai Hadiah?</span>
                                    </label>

                                    {formData.is_redeemable && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                        >
                                            <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2">Poin yang Dibutuhkan untuk Menukar</label>
                                            <input
                                                required={formData.is_redeemable}
                                                type="number"
                                                min="0"
                                                placeholder="Cth: 500"
                                                className="w-full bg-[#1a1a1a] border border-[#d4af37]/50 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors font-mono tracking-wider text-[#d4af37]"
                                                value={formData.points_required}
                                                onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 py-3 bg-transparent border border-[#333] hover:border-[#a1a1a1] transition-colors text-white rounded text-sm font-bold uppercase tracking-widest"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b5952f] transition-colors text-black rounded text-sm font-bold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AdminProducts;
