import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

const AdminGallery = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingImage, setEditingImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        image_url: '',
    });

    const PREDEFINED_CATEGORIES = ["Classic", "Modern", "Formal", "Casual"];

    const fetchImages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gallery_images')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setImages(data || []);
        } catch (error) {
            console.error('Error fetching gallery images:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/_studio_admin/login');
            } else {
                setAuthChecking(false);
                fetchImages();
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) navigate('/_studio_admin/login');
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleOpenModal = (image = null) => {
        if (image) {
            setEditingImage(image);
            setFormData({
                title: image.title,
                category: image.category || '',
                image_url: image.image_url || '',
            });
        } else {
            setEditingImage(null);
            setFormData({ title: '', category: '', image_url: '' });
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingImage(null);
        setFormData({ title: '', category: '', image_url: '' });
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
            const filePath = `gallery/${fileName}`;

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

        if (!finalImageUrl) {
            alert('Silakan pilih gambar atau masukkan URL gambar.');
            setIsSubmitting(false);
            return;
        }

        const payload = {
            title: formData.title,
            category: formData.category,
            image_url: finalImageUrl
        };

        try {
            if (editingImage) {
                const { error } = await supabase
                    .from('gallery_images')
                    .update(payload)
                    .eq('id', editingImage.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('gallery_images')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchImages();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving image:', error);
            alert('Gagal menyimpan gambar galeri.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus gambar ini dari galeri?')) return;

        try {
            const { error } = await supabase
                .from('gallery_images')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setImages(images.filter(img => img.id !== id));
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('Gagal menghapus gambar galeri.');
        }
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
                    <ArrowLeft size={18} /> Kembali ke Dashboard
                </button>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#d4af37] text-black px-6 py-2.5 rounded font-bold uppercase tracking-widest text-sm hover:bg-[#b5952f] transition-all flex items-center gap-2"
                >
                    <Plus size={18} /> Tambah Foto
                </button>
            </header>

            <div className="max-w-7xl mx-auto">
                <div>
                    <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Manajemen Visual</span>
                    <h2 className="serif text-4xl md:text-5xl font-bold mt-2 mb-8">Galeri Portofolio</h2>
                </div>

                {loading ? (
                    <div className="text-center py-24 object-contain">
                        <div className="inline-block w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-[#a1a1a1]">Memuat galeri...</p>
                    </div>
                ) : images.length === 0 ? (
                    <div className="glass-card flex flex-col items-center justify-center py-24 text-[#a1a1a1]">
                        <ImageIcon size={48} className="mb-4 opacity-20" />
                        <p className="mb-6">Belum ada foto gaya rambut di galeri.</p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-transparent border border-[#d4af37] text-[#d4af37] px-6 py-2 rounded font-bold uppercase tracking-widest text-xs hover:bg-[#d4af37] hover:text-black transition-all"
                        >
                            Tambah Foto Pertama
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {images.map((img) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card overflow-hidden group border border-[#333] hover:border-[#d4af37]/50 transition-colors"
                            >
                                <div className="aspect-[4/5] relative bg-[#111]">
                                    {img.image_url ? (
                                        <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-10">
                                            <ImageIcon size={64} />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(img)}
                                            className="w-8 h-8 rounded bg-black/80 text-white flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors backdrop-blur-sm"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(img.id)}
                                            className="w-8 h-8 rounded bg-black/80 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors backdrop-blur-sm"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                        <span className="text-[#d4af37] text-[10px] uppercase tracking-widest font-bold">{img.category || 'Uncategorized'}</span>
                                        <h3 className="font-serif text-lg font-bold truncate text-white">{img.title}</h3>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[#0f0f0f] border border-[#333] rounded-xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative"
                        >
                            <h3 className="text-2xl font-serif font-bold mb-6 text-white border-b border-[#333] pb-4">
                                {editingImage ? 'Edit Gambar Galeri' : 'Tambah Gambar Baru'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Nama Gaya / Judul</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Cth: Modern Mid Fade"
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white text-sm"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Kategori</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            list="categories"
                                            placeholder="Cth: Classic, Modern, Formal..."
                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white text-sm"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        />
                                        <datalist id="categories">
                                            {PREDEFINED_CATEGORIES.map(cat => <option key={cat} value={cat} />)}
                                        </datalist>
                                    </div>
                                    <p className="text-[10px] text-[#555] mt-1">Gunakan kategori seragam untuk filter yang lebih rapi.</p>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Pilih Foto</label>
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
                                        <p className="text-[10px] text-[#555] mt-1">Upload file atau paste URL gambar yang sudah ada.</p>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-3">
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

export default AdminGallery;
