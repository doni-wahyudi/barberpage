import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Trash2, Check, Scissors, X, Filter, Calendar } from 'lucide-react';

const AdminPanel = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchBookings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('booking_date', filterDate)
            .order('booking_time', { ascending: true });

        if (error) console.error('Error fetching bookings:', error);
        else setBookings(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBookings();
    }, [filterDate]);

    const updateStatus = async (id, newStatus) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) alert('Error updating status');
        else fetchBookings();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'text-green-400';
            case 'completed': return 'text-[#d4af37]';
            case 'cancelled': return 'text-red-400';
            default: return 'text-blue-400';
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-24 px-6">
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
                                                <div className="font-bold">{booking.customer_name}</div>
                                                <div className="text-[10px] text-[#a1a1a1]">{booking.phone_number}</div>
                                            </td>
                                            <td className="p-6 text-sm italic">{booking.service_type}</td>
                                            <td className="p-6">
                                                <span className="text-[10px] border border-[#d4af37]/20 px-2 py-0.5 rounded text-[#d4af37]">
                                                    {booking.barber_name}
                                                </span>
                                            </td>
                                            <td className="p-6 font-mono text-xs">{booking.booking_time.substring(0, 5)}</td>
                                            <td className={`p-6 text-[10px] uppercase font-bold tracking-widest ${getStatusColor(booking.status)}`}>
                                                {booking.status}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'confirmed')}
                                                        className="p-2 glass-card hover:bg-green-500/20 text-green-400 transition-colors"
                                                        title="Confirm"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'completed')}
                                                        className="p-2 glass-card hover:bg-[#d4af37]/20 text-[#d4af37] transition-colors"
                                                        title="Complete"
                                                    >
                                                        <Scissors size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'cancelled')}
                                                        className="p-2 glass-card hover:bg-red-500/20 text-red-400 transition-colors"
                                                        title="Cancel"
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
        </div>
    );
};

export default AdminPanel;
