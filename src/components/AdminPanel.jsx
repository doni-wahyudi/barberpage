import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { LogOut, RefreshCw, X, Check, Search, Calendar as CalendarIcon, Package, Users, Settings, Scissors, UserCog, Star } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

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

        // --- Loyalty Points Logic on Completion ---
        if (updates.status === 'completed' && booking.status !== 'completed' && booking.total_price > 0 && booking.phone_number) {
            try {
                // 1. Get Settings for exact point ratio
                const { data: settings } = await supabase.from('app_settings').select('points_per_1000_spent').eq('id', 1).single();
                const pointsRatio = settings ? settings.points_per_1000_spent : 1;

                // 2. Calculate points earned
                const pointsEarned = Math.floor(booking.total_price / 1000) * pointsRatio;

                if (pointsEarned > 0) {
                    // 3. Upsert Customer Points
                    const { data: customerData } = await supabase.from('customers').select('points').eq('phone_number', booking.phone_number).single();
                    const currentPoints = customerData ? customerData.points : 0;

                    await supabase.from('customers').upsert({
                        phone_number: booking.phone_number,
                        name: booking.customer_name,
                        points: currentPoints + pointsEarned
                    });

                    // 4. Record Transaction
                    await supabase.from('point_transactions').insert([{
                        phone_number: booking.phone_number,
                        amount: pointsEarned,
                        description: `Earned points from transaction(${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(booking.total_price)})`
                    }]);
                }
            } catch (err) {
                console.error("Failed to award points:", err);
            }
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
            default: return 'text-yellow-400';
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
            <header className="max-w-7xl mx-auto flex justify-end mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/_studio_admin/products')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4af37]/20 border border-[#333] hover:border-[#d4af37] transition-all rounded text-sm font-bold text-[#d4af37]"
                    >
                        <Package size={16} /> Manage Shop
                    </button>
                    <button
                        onClick={() => navigate('/_studio_admin/services')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4af37]/20 border border-[#333] hover:border-[#d4af37] transition-all rounded text-sm font-bold text-[#d4af37]"
                    >
                        <Scissors size={16} /> Services
                    </button>
                    <button
                        onClick={() => navigate('/_studio_admin/capsters')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4af37]/20 border border-[#333] hover:border-[#d4af37] transition-all rounded text-sm font-bold text-[#d4af37]"
                    >
                        <UserCog size={16} /> Capsters
                    </button>
                    <button
                        onClick={() => navigate('/_studio_admin/settings')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4af37]/20 border border-[#333] hover:border-[#d4af37] transition-all rounded text-sm font-bold text-[#d4af37]"
                    >
                        <Settings size={16} /> App Settings
                    </button>
                    <button
                        onClick={() => navigate('/_studio_admin/insights')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#d4af37]/20 border border-[#333] hover:border-[#d4af37] transition-all rounded text-sm font-bold text-[#d4af37]"
                    >
                        <Users size={16} /> Customer CRM
                    </button>
                    <button
                        onClick={async () => await supabase.auth.signOut()}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors rounded text-sm font-bold"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Studio Control</span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Booking Management</h2>
                    </div>

                    <div className="flex items-center gap-4 glass-card p-4">
                        <Calendar size={18} className="text-[#d4af37]" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-white focus:outline-none text-sm cursor-pointer"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#d4af37]/10 bg-[#141414]/50">
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold">Customer</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold">Service</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold">Barber</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold">Time</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold">Status</th>
                                    <th className="p-6 text-[#d4af37] uppercase tracking-widest text-[10px] font-bold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='popLayout'>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-[#a1a1a1] italic">
                                                Polishing the details...
                                            </td>
                                        </tr>
                                    ) : bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-[#a1a1a1] italic">
                                                No appointments found for this date.
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
                                                                    <Star size={10} className="fill-[#d4af37]" /> {booking.visitCount} visits
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-bold tracking-widest uppercase ml-2">
                                                                    New
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
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`text - [10px] uppercase font - bold tracking - widest ${getStatusColor(booking.status)} `}>
                                                    App: {booking.status}
                                                </div>
                                                <div className={`text - [10px] uppercase font - bold tracking - widest mt - 1 ${getQueueStatusColor(booking.queue_status)} `}>
                                                    Queue: {booking.queue_status || 'waiting'}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex flex-wrap gap-2">
                                                    {(booking.queue_status === 'waiting' || booking.queue_status === 'late_arrived' || !booking.queue_status) && (
                                                        <button
                                                            onClick={() => updateStatus(booking, { queue_status: 'in_progress' })}
                                                            className="px-2 py-1 text-[10px] font-bold border border-green-400/50 text-green-400 hover:bg-green-400/20 rounded transition-colors"
                                                            title="Start Service"
                                                        >
                                                            START
                                                        </button>
                                                    )}
                                                    {(booking.queue_status === 'late' || booking.queue_status === 'late_arrived') && (
                                                        <button
                                                            onClick={() => updateStatus(booking, { queue_status: 'skipped', status: 'cancelled' })}
                                                            className="px-2 py-1 text-[10px] font-bold border border-red-500/50 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                                                            title="Skip Late Customer"
                                                        >
                                                            SKIP
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => updateStatus(booking, { status: 'confirmed' })}
                                                        className="p-1 glass-card hover:bg-blue-500/20 text-blue-400 transition-colors"
                                                        title="Confirm Booking"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking, { status: 'completed', queue_status: 'completed' })}
                                                        className="p-1 glass-card hover:bg-[#d4af37]/20 text-[#d4af37] transition-colors"
                                                        title="Complete Masterpiece"
                                                    >
                                                        <Scissors size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking, { status: 'cancelled', queue_status: 'skipped' })}
                                                        className="p-1 glass-card hover:bg-red-500/20 text-red-500 transition-colors"
                                                        title="Cancel Appointment"
                                                    >
                                                        <X size={14} />
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
            </div>
        </div >
    );
};

export default AdminPanel;
