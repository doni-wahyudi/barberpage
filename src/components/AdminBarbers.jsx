import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Trash2, Edit2, ArrowLeft, Loader2, Image as ImageIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { convertToWebP } from '../utils/imageOptimizer';

const AdminBarbers = () => {
    const navigate = useNavigate();
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        is_active: true,
        specialty: '',
        bio: '',
        photo_url: '',
        sort_order: 0,
        max_daily_bookings: 8
    });

    const fetchBarbers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('barbers')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setBarbers(data || []);
        } catch (error) {
            console.error('Error fetching barbers:', error);
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
                fetchBarbers();
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) navigate('/_studio_admin/login');
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleOpenModal = (barber = null) => {
        if (barber) {
            setEditingBarber(barber);
            setFormData({
                name: barber.name,
                is_active: barber.is_active,
                specialty: barber.specialty || '',
                bio: barber.bio || '',
                photo_url: barber.photo_url || '',
                sort_order: barber.sort_order || 0,
                max_daily_bookings: barber.max_daily_bookings ?? 8
            });
        } else {
            setEditingBarber(null);
            setFormData({ name: '', is_active: true, specialty: '', bio: '', photo_url: '', sort_order: 0, max_daily_bookings: 8 });
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBarber(null);
        setFormData({ name: '', is_active: true, specialty: '', bio: '', photo_url: '', sort_order: 0, max_daily_bookings: 8 });
        setImageFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        let finalPhotoUrl = formData.photo_url;

        // Upload image if a new file is selected
        if (imageFile) {
            try {
                // Convert to WebP before upload
                const webpFile = await convertToWebP(imageFile);
                const fileName = `${Math.random().toString(36).substring(2, 15)}.webp`;
                const filePath = `barbers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('barbers')
                    .upload(filePath, webpFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('barbers')
                    .getPublicUrl(filePath);

                finalPhotoUrl = publicUrl;
            } catch (error) {
                console.error('Error uploading photo:', error);
                alert('Gagal mengunggah foto. Pastikan bucket "images" tersedia dan publik.');
                setIsSubmitting(false);
                return;
            }
        }

        const payload = {
            name: formData.name,
            is_active: formData.is_active,
            specialty: formData.specialty,
            bio: formData.bio,
            photo_url: finalPhotoUrl || null,
            sort_order: formData.sort_order,
            max_daily_bookings: parseInt(formData.max_daily_bookings, 10) || 8
        };

        try {
            if (editingBarber) {
                const { error } = await supabase
                    .from('barbers')
                    .update(payload)
                    .eq('id', editingBarber.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('barbers')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchBarbers();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving barber:', error);
            alert('Gagal menyimpan kapster.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMove = async (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === barbers.length - 1)
        ) return;

        const newBarbers = [...barbers];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Ensure sort_order exists
        newBarbers.forEach((b, i) => { if (b.sort_order === undefined || b.sort_order === null) b.sort_order = i; });

        const currentItem = newBarbers[index];
        const targetItem = newBarbers[swapIndex];

        // Swap
        const tempOrder = currentItem.sort_order;
        currentItem.sort_order = targetItem.sort_order;
        targetItem.sort_order = tempOrder;

        newBarbers[index] = targetItem;
        newBarbers[swapIndex] = currentItem;

        setBarbers([...newBarbers]);

        try {
            await Promise.all([
                supabase.from('barbers').update({ sort_order: currentItem.sort_order }).eq('id', currentItem.id),
                supabase.from('barbers').update({ sort_order: targetItem.sort_order }).eq('id', targetItem.id)
            ]);
        } catch (error) {
            console.error('Error updating sort order:', error);
            fetchBarbers();
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus kapster ini?')) return;

        try {
            const { error } = await supabase
                .from('barbers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBarbers(barbers.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting barber:', error);
            alert('Gagal menghapus kapster. Pastikan mereka tidak terikat dengan reservasi aktif.');
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
                    <ArrowLeft size={20} /> Kembali ke Dasbor
                </button>
            </header>

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                    <div>
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Manajemen Tim</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Kapster</h2>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#b5952f] transition-all rounded text-sm font-bold text-black"
                    >
                        <Plus size={18} /> Tambah Kapster
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : barbers.length === 0 ? (
                    <div className="glass-card p-12 text-center text-[#a1a1a1] flex flex-col items-center gap-4">
                        <User size={48} className="opacity-20" />
                        <p>Belum ada Kapster yang tersedia.<br />Klik "Tambah Kapster" untuk membuat yang pertama.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {barbers.map((barber, index) => (
                                <motion.div
                                    key={barber.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`glass-card overflow-hidden flex flex-col relative ${!barber.is_active ? 'opacity-50 grayscale' : ''}`}
                                >
                                    <div className="absolute top-3 left-3 flex gap-1 z-20">
                                        <button
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            className="w-8 h-8 rounded bg-black/80 text-white flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors backdrop-blur-sm disabled:opacity-30"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === barbers.length - 1}
                                            className="w-8 h-8 rounded bg-black/80 text-white flex items-center justify-center hover:bg-[#d4af37] hover:text-black transition-colors backdrop-blur-sm disabled:opacity-30"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>

                                    <div className="h-64 w-full bg-[#141414] relative border-b border-[#333]">
                                        {barber.photo_url ? (
                                            <img src={barber.photo_url} alt={barber.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#333]">
                                                <User size={64} />
                                            </div>
                                        )}
                                        {!barber.is_active && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-widest">Tidak Aktif</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="mb-4">
                                            <h3 className="font-bold text-xl mb-1">{barber.name}</h3>
                                            <div className="flex justify-between items-center">
                                                <p className="text-[#d4af37] text-xs uppercase tracking-[0.2em] font-bold">{barber.specialty || 'Professional Barber'}</p>
                                                <span className="text-[#a1a1a1] text-xs font-mono">Limit: {barber.max_daily_bookings ?? 8}/hari</span>
                                            </div>
                                        </div>
                                        
                                        {barber.bio && (
                                            <p className="text-[#a1a1a1] text-xs line-clamp-3 mb-4 italic leading-relaxed">"{barber.bio}"</p>
                                        )}

                                        <div className="mt-auto flex gap-2 pt-4 border-t border-[#333]">
                                            <button
                                                onClick={() => handleOpenModal(barber)}
                                                className="flex-1 py-2 text-xs uppercase tracking-widest font-bold bg-[#1a1a1a] hover:bg-[#d4af37]/20 text-[#a1a1a1] hover:text-[#d4af37] transition-colors rounded flex justify-center items-center gap-2"
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(barber.id)}
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
                            className="bg-[#121212] border border-[#d4af37]/20 w-full max-w-lg rounded-xl p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
                        >
                            <h3 className="serif text-3xl font-bold mb-8 text-white text-center">
                                {editingBarber ? 'Edit Profil Kapster' : 'Tambah Kapster Baru'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2 font-bold">Nama <span className="text-red-500">*</span></label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Cth: Budi"
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors text-white"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2 font-bold">Spesialisasi</label>
                                            <input
                                                type="text"
                                                placeholder="Cth: Fade Expert"
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors text-white"
                                                value={formData.specialty}
                                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2 font-bold">Batas Booking Harian</label>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Cth: 8"
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors text-white"
                                                value={formData.max_daily_bookings}
                                                onChange={(e) => setFormData({ ...formData, max_daily_bookings: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2 font-bold">Foto Profil</label>
                                        <div className="space-y-3">
                                            <div className="w-full h-40 rounded-lg overflow-hidden bg-[#111] border border-[#333] flex items-center justify-center relative group">
                                                {(imageFile || formData.photo_url) ? (
                                                    <img
                                                        src={imageFile ? URL.createObjectURL(imageFile) : formData.photo_url}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <img
                                                        src={`${import.meta.env.BASE_URL}placeholder-barber.png`}
                                                        alt="Placeholder"
                                                        className="w-full h-full object-cover opacity-20"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Ganti Foto</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setImageFile(e.target.files[0]);
                                                        }
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            <p className="text-[10px] text-[#555] text-center uppercase tracking-widest">Format: JPG, PNG, WEBP (Auto-Optimized)</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2 font-bold">Bio / Kata-kata Mutiara</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Tuliskan sedikit tentang kapster ini..."
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors text-white resize-none text-sm italic"
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-[#333]'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-sm font-bold">Sedang Aktif (Tersedia untuk Booking)?</span>
                                    </label>
                                </div>

                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 py-4 bg-transparent border border-[#333] hover:border-[#a1a1a1] transition-colors text-white rounded text-sm font-bold uppercase tracking-widest"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 bg-[#d4af37] hover:bg-[#b5952f] transition-colors text-black rounded text-sm font-bold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Profil'}
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

export default AdminBarbers;
