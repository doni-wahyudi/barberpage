import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const CheckOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        phone: ''
    });

    // Consistent phone validation (08 or 628 prefix)
    const validatePhone = (phone) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone.startsWith('08') && !cleanPhone.startsWith('628')) {
            return false;
        }
        if (cleanPhone.length < 9 || cleanPhone.length > 15) {
            return false;
        }
        return true;
    };

    const handleCheck = async (e) => {
        e.preventDefault();
        setError('');

        if (!validatePhone(formData.phone)) {
            setError('Silakan masukkan nomor telepon Indonesia yang valid (diawali 08 atau 628).');
            return;
        }

        setLoading(true);

        // Get today's date in YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        try {
            const { data, error: sbError } = await supabase
                .from('bookings')
                .select('id, status, queue_status')
                .ilike('customer_name', formData.name.trim()) // case-insensitive match
                .eq('phone_number', formData.phone.trim())
                .gte('booking_date', today) // Any upcoming booking
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })
                .limit(1);

            if (sbError) throw sbError;

            if (data && data.length > 0) {
                // Redirect directly to their queue monitor
                const bookingId = data[0].id;
                navigate(`/queue/${bookingId}`);
            } else {
                setError("Kami tidak dapat menemukan reservasi aktif dengan nama dan nomor telepon tersebut.");
            }
        } catch (err) {
            console.error('Check order error:', err);
            setError('Koneksi bermasalah. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans relative">
            {/* Header */}
            <header className="p-6 flex items-center justify-between border-b border-[#d4af37]/10 bg-[#121212] sticky top-0 z-10 w-full max-w-md mx-auto">
                <button onClick={() => navigate(-1)} className="text-[#a1a1a1] hover:text-[#d4af37] transition">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="serif font-bold text-xl tracking-wider uppercase text-center flex-1">
                    Cek <span className="text-[#d4af37]">Reservasi</span>
                </h1>
                <div className="w-6"></div> {/* Spacer */}
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full glass-card p-8 rounded-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#d4af37]"></div>

                    <div className="text-center mb-8">
                        <Search className="mx-auto text-[#d4af37] mb-4" size={40} />
                        <h2 className="serif text-2xl font-bold mb-2">Cari Antrean Anda</h2>
                        <p className="text-[#a1a1a1] text-sm">
                            Masukkan detail yang Anda gunakan saat reservasi.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleCheck} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-[#a1a1a1] ml-1">
                                Nama Lengkap Sesuai Reservasi
                            </label>
                            <input
                                required
                                type="text"
                                placeholder="Cth: Budi Wijaya"
                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-[#a1a1a1] ml-1">
                                Nomor HP
                            </label>
                            <input
                                required
                                type="tel"
                                placeholder="08... atau 628..."
                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors font-mono tracking-wider"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="gold-button w-full flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                'Cari Antrean'
                            )}
                        </button>
                    </form>
                </motion.div>
            </main>
        </div>
    );
};

export default CheckOrder;
