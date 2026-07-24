import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { LogOut, RefreshCw, X, Check, Search, Calendar as CalendarIcon, Package, Users, Settings, Scissors, UserCog, Star, Image as ImageIcon, Tag, MessageSquareText, Edit, Phone } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingBooking, setEditingBooking] = useState(null);
    const [availableBarbers, setAvailableBarbers] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const { data: bData } = await supabase.from('barbers').select('name').eq('is_active', true);
                if (bData) setAvailableBarbers(bData.map(b => b.name));

                const { data: sData } = await supabase.from('services').select('name, price');
                if (sData) setAvailableServices(sData);
            } catch (err) {
                console.error('Failed to fetch options:', err);
            }
        };
        fetchOptions();
    }, []);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            // 1. Fetch Bookings for the selected filterDate
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*, phone_number') // Ensure phone_number is selected
                .eq('booking_date', filterDate)
                .order('booking_time', { ascending: true });

            if (bookingsError) throw bookingsError;

            // 2. Fetch Loyalty Data for those customers
            const phoneNumbers = [...new Set((bookingsData || []).map(b => b.phone_number).filter(Boolean))];

            let loyalties = {};
            if (phoneNumbers.length > 0) {
                const { data: loyaltyData, error: loyaltyError } = await supabase
                    .from('bookings')
                    .select('phone_number')
                    .in('phone_number', phoneNumbers)
                    .neq('status', 'cancelled'); // Only count non-cancelled bookings

                if (loyaltyError) throw loyaltyError;

                if (loyaltyData) {
                    loyaltyData.forEach(l => {
                        loyalties[l.phone_number] = (loyalties[l.phone_number] || 0) + 1;
                    });
                }
            }

            // 3. Attach loyalty counts to bookings
            const enrichedBookings = (bookingsData || []).map(booking => ({
                ...booking,
                visitCount: loyalties[booking.phone_number] || 0 // Default to 0 if no previous visits found
            }));

            setBookings(enrichedBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookings([]);
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
                fetchBookings();
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) navigate('/_studio_admin/login');
        });

        // Listen for live updates
        const channel = supabase
            .channel('admin-bookings')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                () => {
                    // Refetch to ensure we have the latest
                    fetchBookings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            subscription.unsubscribe();
        };
    }, [filterDate, navigate]);

    const updateStatus = async (booking, updates) => {
        const { error } = await supabase
            .from('bookings')
            .update(updates)
            .eq('id', booking.id);

        if (error) {
            alert('Error updating status');
            return;
        }

        // --- Loyalty & CRM Sync Logic on Completion ---
        if (updates.status === 'completed' && booking.status !== 'completed' && booking.phone_number) {
            try {
                // 1. Get Settings for exact point ratio
                const { data: settings } = await supabase.from('app_settings').select('points_per_1000_spent').eq('id', 1).single();
                const pointsRatio = settings ? settings.points_per_1000_spent : 1;

                // 2. Calculate points earned
                const pointsEarned = Math.floor((booking.total_price || 0) / 1000) * pointsRatio;

                // 3. Fetch current customer data to increment correctly
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('points, total_visits')
                    .eq('phone_number', booking.phone_number)
                    .single();

                const currentPoints = customerData ? customerData.points : 0;
                const currentVisits = customerData ? customerData.total_visits : 0;

                // 4. Upsert Customer with AGGREGATE data
                await supabase.from('customers').upsert({
                    phone_number: booking.phone_number,
                    name: booking.customer_name,
                    points: currentPoints + pointsEarned,
                    total_visits: currentVisits + 1,
                    last_visit: new Date().toISOString(),
                    favorite_barber: booking.barber_name,
                    favorite_service: booking.service_type
                });

                // 5. Record Point Transaction (only if points earned)
                if (pointsEarned > 0) {
                    await supabase.from('point_transactions').insert([{
                        phone_number: booking.phone_number,
                        amount: pointsEarned,
                        description: `Points from booking #${booking.id.split('-')[0]} (${booking.service_type})`
                    }]);
                }

                // 6. Mark referral commission as 'verified' if this booking used a referral code
                if (booking.referral_code) {
                    try {
                        await supabase.from('referral_commissions')
                            .update({ status: 'verified' })
                            .eq('booking_id', booking.id)
                            .eq('status', 'pending');
                    } catch (refErr) {
                        console.error('Failed to verify referral commission:', refErr);
                    }
                }
            } catch (err) {
                console.error("Failed to sync CRM data:", err);
            }
        }

        fetchBookings();
    };

    const deleteBooking = async (booking) => {
        if (!window.confirm(`Yakin ingin menghapus reservasi atas nama "${booking.customer_name}" secara permanen?`)) return;
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', booking.id);

        if (error) {
            alert('Gagal menghapus reservasi: ' + error.message);
            return;
        }

        fetchBookings();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'text-green-400';
            case 'completed': return 'text-[#d4af37]';
            case 'cancelled': return 'text-red-400';
            default: return 'text-blue-400';
        }
    };

    const getQueueStatusColor = (queueStatus) => {
        switch (queueStatus) {
            case 'in_progress': return 'text-green-400';
            case 'late': return 'text-red-500';
            case 'late_arrived': return 'text-orange-400';
            case 'skipped': return 'text-red-400';
            case 'completed': return 'text-[#d4af37]';
            default: return 'text-yellow-400';
        }
    };

    const handleWhatsApp = (booking, type) => {
        // Ensure phone starts with 62 (Indonesia) and remove leading 0
        let phone = booking.phone_number.replace(/\D/g, ''); // remove non-digits
        if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1);
        } else if (!phone.startsWith('62')) {
            phone = '62' + phone;
        }

        const name = booking.customer_name;
        const time = (booking.booking_time || "").substring(0, 5);
        const service = booking.service_type;

        let message = "";
        if (type === 'remind') {
            message = `Halo ${name}, pengingat dari Auro Barbershop. Jadwal reservasi Anda adalah hari ini pukul ${time} untuk layanan ${service}. Kami tunggu kedatangannya ya! 🙏✂️`;
        } else if (type === 'followup') {
            message = `Halo ${name}, terima kasih sudah mampir ke Auro Barbershop hari ini! Gimana hasilnya? Kalau suka, bantu kami dengan rating di sini ya: https://maps.app.goo.gl/6d7BJJDKbcAukKPK8. Sampai jumpa lagi! 🤩💈`;
        }

        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (authChecking) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const navItems = [
        { label: 'Kelola Toko', icon: Package, path: '/_studio_admin/products' },
        { label: 'Layanan', icon: Scissors, path: '/_studio_admin/services' },
        { label: 'Kapster', icon: UserCog, path: '/_studio_admin/capsters' },
        { label: 'Galeri', icon: ImageIcon, path: '/_studio_admin/gallery' },
        { label: 'Kategori', icon: Tag, path: '/_studio_admin/categories' },
        { label: 'Pengaturan Aplikasi', icon: Settings, path: '/_studio_admin/settings' },
        { label: 'Masukan', icon: MessageSquareText, path: '/_studio_admin/feedback' },
        { label: 'CRM & Blacklist', icon: Users, path: '/_studio_admin/insights' }
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-8 pb-24 px-4 sm:px-6 relative">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 space-y-8">
                    <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
                        {navItems.map(({ label, icon: Icon, path }) => (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className="min-h-[52px] flex items-center justify-center gap-2 px-3 py-3 bg-[#141414] hover:bg-[#d4af37]/15 border border-[#333] hover:border-[#d4af37]/70 transition-all rounded text-xs sm:text-sm font-bold text-[#d4af37] text-center leading-tight"
                            >
                                <Icon size={16} className="shrink-0" />
                                <span>{label}</span>
                            </button>
                        ))}
                        <button
                            onClick={async () => await supabase.auth.signOut()}
                            className="min-h-[52px] flex items-center justify-center gap-2 px-3 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/40 text-red-400 transition-colors rounded text-xs sm:text-sm font-bold"
                        >
                            <LogOut size={16} className="shrink-0" /> Keluar
                        </button>
                    </nav>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Kontrol Studio</span>
                            <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Manajemen Reservasi</h2>
                        </div>

                        <div className="flex items-center gap-4 glass-card px-5 py-4 min-w-[194px]">
                            <CalendarIcon size={18} className="text-[#d4af37]" />
                            <input
                                type="date"
                                className="bg-transparent border-none text-white focus:outline-none text-sm cursor-pointer w-full"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#d4af37]/10 bg-[#141414]/50">
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold w-[56%]">Pelanggan & Reservasi</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold w-[18%]">Status</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold w-[26%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='popLayout'>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="p-12 text-center text-[#a1a1a1] italic">
                                                Memuat rincian reservasi...
                                            </td>
                                        </tr>
                                    ) : bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="p-12 text-center text-[#a1a1a1] italic">
                                                Tidak ada janji temu ditemukan untuk tanggal ini.
                                            </td>
                                        </tr>
                                    ) : bookings.map((booking) => (
                                        <motion.tr
                                            key={booking.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b border-[#d4af37]/5 hover:bg-[#141414]/30 transition-colors"
                                        >
                                            <td className="p-6">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-lg truncate flex items-center gap-2">
                                                            {booking.customer_name}
                                                            {booking.visitCount && booking.visitCount > 1 ? (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-bold tracking-widest uppercase ml-2">
                                                                    <Star size={10} className="fill-[#d4af37]" /> {booking.visitCount} kunjungan
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-bold tracking-widest uppercase ml-2">
                                                                    Baru
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <span className="text-xs font-mono text-[#a1a1a1] border border-[#333] px-2 py-0.5 rounded-full bg-[#1a1a1a]">
                                                            {booking.booking_time.substring(0, 5)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-[#a1a1a1] flex items-center gap-3">
                                                        <span>{booking.service_type}</span>
                                                        <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                                                        <span>{booking.barber_name}</span>
                                                    </div>
                                                    <div className="text-xs text-[#555] font-mono mt-1 flex items-center justify-between">
                                                        <span>ID: {booking.id.split('-')[0]} • {booking.phone_number}</span>
                                                    </div>
                                                    {booking.referral_code && (
                                                        <div className="mt-1">
                                                            <span style={{ fontSize: '10px', fontWeight: 'bold', background: 'rgba(212,175,55,0.12)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
                                                                🤝 Ref: {booking.referral_code}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`text-[10px] uppercase font-bold tracking-widest ${getStatusColor(booking.status)}`}>
                                                    Rsv: {booking.status}
                                                </div>
                                                <div className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${getQueueStatusColor(booking.queue_status)}`}>
                                                    Antrian: {booking.queue_status || 'waiting'}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-wrap gap-2">
                                                    {(booking.queue_status === 'waiting' || booking.queue_status === 'late_arrived' || !booking.queue_status) && (
                                                        <button
                                                            onClick={() => updateStatus(booking, { queue_status: 'in_progress' })}
                                                            className="px-2 py-1 text-[10px] font-bold border border-green-400/50 text-green-400 hover:bg-green-400/20 rounded transition-colors"
                                                            title="Mulai Layanan"
                                                        >
                                                            MULAI
                                                        </button>
                                                    )}
                                                    {(booking.queue_status === 'late' || booking.queue_status === 'late_arrived') && (
                                                        <button
                                                            onClick={() => updateStatus(booking, { queue_status: 'skipped', status: 'cancelled' })}
                                                            className="px-2 py-1 text-[10px] font-bold border border-red-500/50 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                                                            title="Lewati Pelanggan Terlambat"
                                                        >
                                                            LEWATI
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleWhatsApp(booking, booking.status === 'completed' ? 'followup' : 'remind')}
                                                        className={`p-1 glass-card hover:bg-green-500/20 text-green-400 transition-colors flex items-center gap-1 px-2`}
                                                        title={booking.status === 'completed' ? 'Kirim Follow-up (WA)' : 'Kirim Pengingat (WA)'}
                                                    >
                                                        <Star size={14} className={booking.status === 'completed' ? 'fill-green-400' : ''} />
                                                        <span className="text-[9px] font-bold">WA</span>
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking, { status: 'confirmed' })}
                                                        className="p-1 glass-card hover:bg-blue-500/20 text-blue-400 transition-colors"
                                                        title="Konfirmasi Reservasi"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking, { status: 'completed', queue_status: 'completed' })}
                                                        className="p-1 glass-card hover:bg-[#d4af37]/20 text-[#d4af37] transition-colors"
                                                        title="Selesaikan Layanan"
                                                    >
                                                        <Scissors size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteBooking(booking)}
                                                        className="p-1 glass-card hover:bg-red-500/20 text-red-500 transition-colors"
                                                        title="Hapus Reservasi"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingBooking(booking)}
                                                        className="p-1 glass-card hover:bg-[#d4af37]/20 text-[#d4af37] transition-colors"
                                                        title="Ubah Rincian Booking"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Edit Booking Modal */}
                <AnimatePresence>
                    {editingBooking && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setEditingBooking(null)}
                                className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative w-full max-w-lg glass-card p-6 md:p-8 shadow-2xl overflow-hidden border border-[#d4af37]/30 bg-[#0c0c0c]"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="serif text-2xl font-bold text-[#d4af37]">Ubah Rincian Booking</h3>
                                    <button onClick={() => setEditingBooking(null)} className="text-[#a1a1a1] hover:text-[#d4af37] transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-1.5 block">Nama Pelanggan</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                            value={editingBooking.customer_name || ''}
                                            onChange={(e) => setEditingBooking({ ...editingBooking, customer_name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-1.5 block">Nomor HP</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                            value={editingBooking.phone_number || ''}
                                            onChange={(e) => setEditingBooking({ ...editingBooking, phone_number: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-1.5 block">Tanggal</label>
                                            <input
                                                type="date"
                                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                                style={{ colorScheme: 'dark' }}
                                                value={editingBooking.booking_date || ''}
                                                onChange={(e) => setEditingBooking({ ...editingBooking, booking_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-1.5 block">Jam</label>
                                            <input
                                                type="time"
                                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors text-white"
                                                style={{ colorScheme: 'dark' }}
                                                value={editingBooking.booking_time ? editingBooking.booking_time.substring(0, 5) : ''}
                                                onChange={(e) => setEditingBooking({ ...editingBooking, booking_time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-1.5 block">Layanan (Item)</label>
                                            <select
                                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors text-white appearance-none"
                                                value={editingBooking.service_type || ''}
                                                onChange={(e) => {
                                                    const serviceName = e.target.value;
                                                    const serviceObj = availableServices.find(s => s.name === serviceName);
                                                    const price = serviceObj ? serviceObj.price : 0;
                                                    let grandTotal = price - (editingBooking.voucher_discount || 0);
                                                    if (grandTotal < 0) grandTotal = 0;
                                                    setEditingBooking({
                                                        ...editingBooking,
                                                        service_type: serviceName,
                                                        total_price: grandTotal
                                                    });
                                                }}
                                            >
                                                {availableServices.map(s => (
                                                    <option key={s.name} value={s.name}>{s.name} (Rp {s.price.toLocaleString('id-ID')})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-1.5 block">Kapster</label>
                                            <select
                                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors text-white appearance-none"
                                                value={editingBooking.barber_name || ''}
                                                onChange={(e) => setEditingBooking({ ...editingBooking, barber_name: e.target.value })}
                                            >
                                                {availableBarbers.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-[#141414] rounded border border-[#d4af37]/10 flex justify-between items-center text-xs font-mono">
                                        <span className="text-[#a1a1a1]">Total Harga (Setelah Potongan):</span>
                                        <span className="text-[#d4af37] font-bold text-sm">
                                            Rp {editingBooking.total_price ? editingBooking.total_price.toLocaleString('id-ID') : 0}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={() => setEditingBooking(null)}
                                        className="flex-1 py-3 px-6 bg-transparent border border-[#333] hover:border-red-500/50 hover:text-red-500 transition-colors text-xs uppercase tracking-widest rounded text-[#a1a1a1] font-bold"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const { error } = await supabase
                                                .from('bookings')
                                                .update({
                                                    customer_name: editingBooking.customer_name,
                                                    phone_number: editingBooking.phone_number,
                                                    booking_date: editingBooking.booking_date,
                                                    booking_time: editingBooking.booking_time,
                                                    service_type: editingBooking.service_type,
                                                    barber_name: editingBooking.barber_name,
                                                    total_price: editingBooking.total_price
                                                })
                                                .eq('id', editingBooking.id);

                                            if (error) {
                                                alert('Gagal menyimpan perubahan: ' + error.message);
                                                return;
                                            }
                                            setEditingBooking(null);
                                            fetchBookings();
                                        }}
                                        className="flex-1 gold-button py-3 px-6 text-xs font-bold uppercase tracking-widest text-center"
                                    >
                                        Simpan Perubahan
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminPanel;
