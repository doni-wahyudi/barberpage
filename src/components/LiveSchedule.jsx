import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const TIME_SLOTS = [
    "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
];
const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Jadwal Hari Ini";
    if (date.getTime() === tomorrow.getTime()) return "Jadwal Besok";
    return date.toLocaleDateString('id-ID', { weekday: 'long', month: 'long', day: 'numeric' });
};

const LiveSchedule = ({ onSelectSlot }) => {
    const [bookings, setBookings] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const getInitialDate = () => {
        const d = new Date();
        if (d.getDay() === 6) { d.setDate(d.getDate() + 1); }
        return d.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getInitialDate());
    const TOTAL_CAPACITY = Math.floor(Math.max(barbers.length, 1) * (TIME_SLOTS.length / 2));
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    const changeDate = (days) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + days);

        // Skip Saturday (6)
        if (d.getDay() === 6) {
            d.setDate(d.getDate() + (days > 0 ? 1 : -1));
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = today;

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

        const { data: barberData } = await supabase
            .from('barbers')
            .select('name')
            .eq('is_active', true);

        if (barberData) {
            setBarbers(barberData.map(b => b.name));
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
        if (trafficPercent < 30) return { text: 'Sepi', color: 'text-green-400', barColor: 'bg-green-400' };
        if (trafficPercent < 65) return { text: 'Sedang', color: 'text-yellow-400', barColor: 'bg-yellow-400' };
        return { text: 'Sibuk', color: 'text-red-400', barColor: 'bg-red-400' };
    };

    const traffic = getTrafficLabel();

    const parseTime = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const getSlotState = (barber, slot) => {
        const slotMins = parseTime(slot);

        const activeBooking = bookings.find(b => {
            if (b.barber_name !== barber) return false;
            const bMins = parseTime(b.booking_time.substring(0, 5));
            return bMins <= slotMins && slotMins < bMins + 60;
        });

        if (activeBooking) return { booking: activeBooking, isBlocked: true };

        const isOverlap = bookings.some(b => {
            if (b.barber_name !== barber) return false;
            const bMins = parseTime(b.booking_time.substring(0, 5));
            return Math.abs(bMins - slotMins) < 60;
        });

        return { booking: null, isBlocked: isOverlap };
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
                            Pembaruan Langsung
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
                                    onChange={(e) => {
                                        const date = new Date(e.target.value);
                                        if (date.getDay() === 6) {
                                            alert('Jadwal tidak tersedia (Tutup pada hari Sabtu).');
                                            return;
                                        }
                                        setSelectedDate(e.target.value);
                                    }}
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
                                {isToday ? 'Keramaian Saat Ini' : 'Status Reservasi'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold uppercase tracking-widest ${traffic.color}`}>
                                {traffic.text}
                            </span>
                            <span className="text-[#a1a1a1] text-xs">
                                {bookedCount}/{TOTAL_CAPACITY} slot dipesan
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
                    {barbers.map((barber, bIndex) => {
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
                                                {barberBookings.length}/{TIME_SLOTS.length} dipesan
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-x-auto">
                                        <div className="flex gap-1.5 min-w-max">
                                            {TIME_SLOTS.map(slot => {
                                                const { booking, isBlocked } = getSlotState(barber, slot);
                                                const isPast = isToday && slot < currentHour;
                                                const isCurrent = isToday && slot === currentHour;

                                                return (
                                                    <div
                                                        key={slot}
                                                        onClick={() => {
                                                            if (!isBlocked && !isPast && onSelectSlot) {
                                                                onSelectSlot({ barber, time: slot, date: selectedDate });
                                                            }
                                                        }}
                                                        className={`
                                                            relative group flex flex-col items-center justify-center 
                                                            w-16 h-14 rounded text-center transition-all duration-300 shrink-0
                                                            ${isCurrent ? 'ring-1 ring-[#d4af37]/50' : ''}
                                                            ${booking
                                                                ? 'bg-[#d4af37]/15 border border-[#d4af37]/30'
                                                                : isPast
                                                                    ? 'bg-[#1a1a1a] border border-[#1f1f1f] opacity-40'
                                                                    : isBlocked
                                                                        ? 'bg-[#1a1a1a] border border-[#1f1f1f] opacity-50 cursor-not-allowed'
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
                                                            <span className={`text-[8px] mt-0.5 ${isPast || isBlocked ? 'text-[#333]' : 'text-[#555]'}`}>
                                                                {isPast ? '—' : isBlocked ? 'Antre' : 'Kosong'}
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
                        <span>Dipesan</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#1a1a1a] border border-[#1f1f1f]" />
                        <span>Tersedia</span>
                    </div>
                    {isToday && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded ring-1 ring-[#d4af37]/50 bg-[#1a1a1a]" />
                            <span>Jam Saat Ini</span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default LiveSchedule;
