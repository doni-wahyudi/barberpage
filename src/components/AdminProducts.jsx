import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Trash2, Edit2, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

const AdminProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        image_url: ''
    });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
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
                image_url: product.image_url || ''
            });
        } else {
            setEditingProduct(null);
            setFormData({ name: '', price: '', image_url: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ name: '', price: '', image_url: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            image_url: formData.image_url || null
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
            alert('Failed to save product.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product.');
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
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
            </header>

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                    <div>
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Inventory</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Manage Products</h2>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#b5952f] transition-all rounded text-sm font-bold text-black"
                    >
                        <Plus size={18} /> Add Product
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : products.length === 0 ? (
                    <div className="glass-card p-12 text-center text-[#a1a1a1] flex flex-col items-center gap-4">
                        <Package size={48} className="opacity-20" />
                        <p>No products available yet.<br />Click "Add Product" to create your first one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {products.map((product) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-card overflow-hidden flex flex-col"
                                >
                                    <div className="h-48 w-full bg-[#141414] relative flex-shrink-0 border-b border-[#333]">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#333]">
                                                <ImageIcon size={48} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
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
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Product Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Matte Clay Pomade"
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Price (IDR) <span className="text-red-500">*</span></label>
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
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Image URL (Optional)</label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white text-sm"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    />
                                    <p className="text-[10px] text-[#555] mt-1">Leave blank to use a default placeholder icon.</p>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 py-3 bg-transparent border border-[#333] hover:border-[#a1a1a1] transition-colors text-white rounded text-sm font-bold uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b5952f] transition-colors text-black rounded text-sm font-bold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
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
