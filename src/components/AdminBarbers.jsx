import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Trash2, Edit2, ArrowLeft, Loader2 } from 'lucide-react';

const AdminBarbers = () => {
    const navigate = useNavigate();
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBarber, setEditingBarber] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        is_active: true
    });

    const fetchBarbers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('barbers')
                .select('*')
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
                is_active: barber.is_active
            });
        } else {
            setEditingBarber(null);
            setFormData({ name: '', is_active: true });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBarber(null);
        setFormData({ name: '', is_active: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            name: formData.name,
            is_active: formData.is_active
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
            alert('Failed to save barber.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this Capster?')) return;

        try {
            const { error } = await supabase
                .from('barbers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBarbers(barbers.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting barber:', error);
            alert('Failed to delete Capster. Make sure they are not tied to existing bookings.');
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
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
            </header>

            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                    <div>
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Team Management</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Capsters</h2>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-[#d4af37] hover:bg-[#b5952f] transition-all rounded text-sm font-bold text-black"
                    >
                        <Plus size={18} /> Add Capster
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                    </div>
                ) : barbers.length === 0 ? (
                    <div className="glass-card p-12 text-center text-[#a1a1a1] flex flex-col items-center gap-4">
                        <User size={48} className="opacity-20" />
                        <p>No Capsters found.<br />Click "Add Capster" to create your first one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AnimatePresence>
                            {barbers.map((barber) => (
                                <motion.div
                                    key={barber.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`glass-card p-5 flex flex-col items-center text-center relative ${!barber.is_active ? 'opacity-50' : ''}`}
                                >
                                    <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mb-4 text-[#a1a1a1]">
                                        <User size={32} />
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{barber.name}</h3>
                                    <p className={`text-xs uppercase tracking-widest font-bold ${barber.is_active ? 'text-green-500' : 'text-red-500'}`}>
                                        {barber.is_active ? 'Active' : 'Inactive'}
                                    </p>

                                    <div className="mt-6 flex gap-2 w-full pt-4 border-t border-[#333]">
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
                            className="bg-[#121212] border border-[#d4af37]/20 w-full max-w-sm rounded-xl p-6 shadow-2xl relative"
                        >
                            <h3 className="serif text-2xl font-bold mb-6 text-white text-center">
                                {editingBarber ? 'Edit Capster' : 'Add New Capster'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. John"
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer mb-4">
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
                                        <span className="text-sm font-bold">Currently Active?</span>
                                    </label>
                                    <p className="text-xs text-[#555]">Inactive capsters won't show up in the booking form.</p>
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

export default AdminBarbers;
