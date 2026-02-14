import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BARBERS = ['Master Aris', 'Senior Budi', 'Artisan Catur'];
const TIME_SLOTS = [
    "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];
const TOTAL_CAPACITY = BARBERS.length * TIME_SLOTS.length;

const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Today's Schedule";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow's Schedule";
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const LiveSchedule = ({ onSelectSlot }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    const changeDate = (offset) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + offset);
        const minDate = new Date();
        minDate.setHours(0, 0, 0, 0);
        if (d >= minDate) {
            setSelectedDate(d.toISOString().split('T')[0]);
        }
    };

    const fetchBookings = async () => {
        const { data, error } = await supabase
            .from('bookings')
            .select('booking_time, barber_name, service_type, status')
            .eq('booking_date', selectedDate)
            .neq('status', 'cancelled');

        if (error) {
            console.error('Error fetching schedule:', error);
        } else {
            setBookings(data || []);
        }
        setLastUpdated(new Date());
        setLoading(false);
    };

    useEffect(() => {
        setLoading(true);
        fetchBookings();
        const interval = setInterval(fetchBookings, 30000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    const bookedCount = bookings.length;
    const trafficPercent = Math.round((bookedCount / TOTAL_CAPACITY) * 100);

    const getTrafficLabel = () => {
        if (trafficPercent < 30) return { text: 'Low Traffic', color: 'text-green-400', barColor: 'bg-green-400' };
        if (trafficPercent < 65) return { text: 'Moderate', color: 'text-yellow-400', barColor: 'bg-yellow-400' };
        return { text: 'Busy', color: 'text-red-400', barColor: 'bg-red-400' };
    };

    const traffic = getTrafficLabel();

    const getSlotForBarber = (barber, time) => {
        return bookings.find(
            b => b.barber_name === barber && b.booking_time?.substring(0, 5) === time
        );
    };

    const now = new Date();
    const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`;

    return (
        <section id="schedule" className="py-24 bg-[#0a0a0a] border-t border-[#d4af37]/10">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                        >
                            Live Updates
                        </motion.span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">{formatDateLabel(selectedDate)}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-2 glass-card px-3 py-2">
                            <button
                                onClick={() => changeDate(-1)}
                                disabled={selectedDate <= today}
                                className={`p-1 rounded transition-colors ${selectedDate <= today ? 'text-[#333] cursor-not-allowed' : 'text-[#a1a1a1] hover:text-[#d4af37]'}`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-[#d4af37]" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={today}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent border-none text-white text-xs focus:outline-none cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                            <button
                                onClick={() => changeDate(1)}
                                className="p-1 rounded text-[#a1a1a1] hover:text-[#d4af37] transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        {/* Refresh indicator */}
                        <div className="flex items-center gap-2 text-[#a1a1a1] text-xs">
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            <span className="hidden md:inline">
                                {lastUpdated
                                    ? `${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                                    : '...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Traffic Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-card p-6 md:p-8 mb-8"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <Users size={20} className="text-[#d4af37]" />
                            <span className="text-sm font-semibold uppercase tracking-wider">
                                {isToday ? 'Current Traffic' : 'Booking Status'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold uppercase tracking-widest ${traffic.color}`}>
                                {traffic.text}
                            </span>
                            <span className="text-[#a1a1a1] text-xs">
                                {bookedCount}/{TOTAL_CAPACITY} slots booked
                            </span>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                        <motion.div
                            key={selectedDate}
                            initial={{ width: 0 }}
                            animate={{ width: `${trafficPercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full ${traffic.barColor}`}
                        />
                    </div>
                </motion.div>

                {/* Per-Barber Timeline */}
                <div className="space-y-4">
                    {BARBERS.map((barber, bIndex) => {
                        const barberBookings = bookings.filter(b => b.barber_name === barber);
                        return (
                            <motion.div
                                key={barber}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: bIndex * 0.1 }}
                                className="glass-card p-5 md:p-6"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                    <div className="flex items-center gap-3 min-w-[160px]">
                                        <div className="w-8 h-8 rounded-full bg-[#d4af37]/10 flex items-center justify-center">
                                            <span className="text-[#d4af37] text-xs font-bold">
                                                {barber.split(' ')[0][0]}{barber.split(' ')[1]?.[0] || ''}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{barber}</p>
                                            <p className="text-[10px] text-[#a1a1a1]">
                                                {barberBookings.length}/{TIME_SLOTS.length} booked
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-x-auto">
                                        <div className="flex gap-1.5 min-w-max">
                                            {TIME_SLOTS.map(slot => {
                                                const booking = getSlotForBarber(barber, slot);
                                                const isPast = isToday && slot < currentHour;
                                                const isCurrent = isToday && slot === currentHour;

                                                return (
                                                    <div
                                                        key={slot}
                                                        onClick={() => {
                                                            if (!booking && !isPast && onSelectSlot) {
                                                                onSelectSlot({ barber, time: slot, date: selectedDate });
                                                            }
                                                        }}
                                                        className={`
                                                            relative group flex flex-col items-center justify-center 
                                                            w-16 h-14 rounded text-center transition-all duration-300
                                                            ${isCurrent ? 'ring-1 ring-[#d4af37]/50' : ''}
                                                            ${booking
                                                                ? 'bg-[#d4af37]/15 border border-[#d4af37]/30'
                                                                : isPast
                                                                    ? 'bg-[#1a1a1a] border border-[#1f1f1f] opacity-40'
                                                                    : 'bg-[#1a1a1a] border border-[#1f1f1f] cursor-pointer hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5'
                                                            }
                                                        `}
                                                    >
                                                        <span className="text-[9px] text-[#a1a1a1] font-mono">{slot}</span>
                                                        {booking ? (
                                                            <span className="text-[8px] text-[#d4af37] font-bold mt-0.5 truncate max-w-[56px] px-0.5">
                                                                {booking.service_type.split(' ')[0]}
                                                            </span>
                                                        ) : (
                                                            <span className={`text-[8px] mt-0.5 ${isPast ? 'text-[#333]' : 'text-[#555]'}`}>
                                                                {isPast ? '—' : 'Open'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-6 mt-6 text-[10px] text-[#a1a1a1] uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#d4af37]/15 border border-[#d4af37]/30" />
                        <span>Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#1a1a1a] border border-[#1f1f1f]" />
                        <span>Available</span>
                    </div>
                    {isToday && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded ring-1 ring-[#d4af37]/50 bg-[#1a1a1a]" />
                            <span>Current Hour</span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default LiveSchedule;
