import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useStoreSettings } from '../utils/useStoreSettings';

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

const isDateHoliday = (dateStr, dailyHours) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const daySchedule = dailyHours.find(ds => ds.dayOfWeek === dayOfWeek);
    return daySchedule ? daySchedule.isHoliday : false;
};

const getFirstAvailableDate = (startDate, dailyHours) => {
    let d = new Date(startDate + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
        const dayOfWeek = d.getDay();
        const daySchedule = dailyHours.find(ds => ds.dayOfWeek === dayOfWeek);
        if (daySchedule && !daySchedule.isHoliday) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        d.setDate(d.getDate() + 1);
    }
    return startDate;
};

const LiveSchedule = ({ onSelectSlot }) => {
    const { settings } = useStoreSettings();
    const [bookings, setBookings] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const [selectedDate, setSelectedDate] = useState(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const defaultDailyHours = [
            { dayOfWeek: 1, dayName: 'Senin', isHoliday: false },
            { dayOfWeek: 2, dayName: 'Selasa', isHoliday: false },
            { dayOfWeek: 3, dayName: 'Rabu', isHoliday: false },
            { dayOfWeek: 4, dayName: 'Kamis', isHoliday: false },
            { dayOfWeek: 5, dayName: 'Jumat', isHoliday: false },
            { dayOfWeek: 6, dayName: 'Sabtu', isHoliday: false },
            { dayOfWeek: 0, dayName: 'Minggu', isHoliday: false }
        ];
        let d = new Date(todayStr + 'T00:00:00');
        for (let i = 0; i < 7; i++) {
            const dayOfWeek = d.getDay();
            const daySchedule = defaultDailyHours.find(ds => ds.dayOfWeek === dayOfWeek);
            if (daySchedule && !daySchedule.isHoliday) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            d.setDate(d.getDate() + 1);
        }
        return todayStr;
    });

    const getSlotsForDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = d.getDay();
        const daySchedule = settings.daily_hours.find(ds => ds.dayOfWeek === dayOfWeek);
        if (!daySchedule || daySchedule.isHoliday) return [];

        const slots = [];
        const [startH, startM] = daySchedule.openingHour.split(':').map(Number);
        const [endH, endM] = daySchedule.closingHour.split(':').map(Number);

        let currentMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        while (currentMins <= endMins - 30) {
            const h = Math.floor(currentMins / 60);
            const m = currentMins % 60;
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            currentMins += 30;
        }
        return slots;
    };

    const timeSlots = getSlotsForDate(selectedDate);
    const TOTAL_CAPACITY = Math.floor(Math.max(barbers.length, 1) * (timeSlots.length / 2));
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    // Limit to 7 days from today
    const maxDateObj = new Date();
    maxDateObj.setDate(maxDateObj.getDate() + 7);
    const maxDateStr = maxDateObj.toISOString().split('T')[0];

    const changeDate = (days) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + days);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = today;

        const maxLimit = new Date();
        maxLimit.setDate(maxLimit.getDate() + 7);
        maxLimit.setHours(0, 0, 0, 0);

        if (d >= minDate && d <= maxLimit) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            setSelectedDate(`${year}-${month}-${day}`);
        }
    };

    const fetchBookings = async () => {
        const { data, error } = await supabase
            .from('public_schedule')
            .select('booking_time, barber_name, service_type, status, customer_name')
            .eq('booking_date', selectedDate);

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
    const trafficPercent = TOTAL_CAPACITY > 0 ? Math.round((bookedCount / TOTAL_CAPACITY) * 100) : 0;

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

    const getHolidayDayName = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = d.getDay();
        const daySchedule = settings.daily_hours.find(ds => ds.dayOfWeek === dayOfWeek);
        return daySchedule ? daySchedule.dayName : 'ini';
    };

    const isCurrentDateHoliday = isDateHoliday(selectedDate, settings.daily_hours);

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
                            live refresh
                        </motion.span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">{formatDateLabel(selectedDate)}</h2>
                    </div>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        {/* Quick Buttons */}
                        <div className="flex gap-2 text-xs font-bold uppercase tracking-widest">
                            <button
                                onClick={() => {
                                    setSelectedDate(getFirstAvailableDate(today, settings.daily_hours));
                                }}
                                className={`px-4 py-2 rounded transition-colors ${selectedDate === getFirstAvailableDate(today, settings.daily_hours) ? 'bg-[#d4af37] text-black' : 'bg-[#141414] text-[#a1a1a1] hover:text-[#d4af37] border border-[#d4af37]/20'}`}
                            >
                                Hari Ini
                            </button>
                            <button
                                onClick={() => {
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                                    setSelectedDate(getFirstAvailableDate(tomorrowStr, settings.daily_hours));
                                }}
                                className={`px-4 py-2 rounded transition-colors ${selectedDate === (() => {
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                                    return getFirstAvailableDate(tomorrowStr, settings.daily_hours);
                                })() ? 'bg-[#d4af37] text-black' : 'bg-[#141414] text-[#a1a1a1] hover:text-[#d4af37] border border-[#d4af37]/20'}`}
                            >
                                Besok
                            </button>
                        </div>
 
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
                                    max={maxDateStr}
                                    onChange={(e) => {
                                        const d = new Date(e.target.value + 'T00:00:00');
                                        const dayOfWeek = d.getDay();
                                        const daySchedule = settings.daily_hours.find(ds => ds.dayOfWeek === dayOfWeek);
                                        if (daySchedule && daySchedule.isHoliday) {
                                            alert(`Jadwal tidak tersedia (Tutup pada hari ${daySchedule.dayName}).`);
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
                                disabled={selectedDate >= maxDateStr}
                                className={`p-1 rounded transition-colors ${selectedDate >= maxDateStr ? 'text-[#333] cursor-not-allowed' : 'text-[#a1a1a1] hover:text-[#d4af37]'}`}
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
 
                {isCurrentDateHoliday ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-12 text-center border-red-500/20 bg-red-500/5 mb-8"
                    >
                        <Clock className="mx-auto text-red-500 mb-4 opacity-50" size={48} />
                        <h3 className="text-2xl font-bold text-red-500 uppercase tracking-widest">Barbershop Lagi Off</h3>
                        <p className="text-[#a1a1a1] mt-2">Lagi off nih. Pilih hari lain ya buat booking!</p>


                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={() => changeDate(1)}
                                className="gold-button !px-8"
                            >
                                Lihat Jadwal Besok
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* Traffic Summary - Only show if not Saturday */}
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
                                        {isToday ? 'Traffic Hari Ini' : 'Booking Status'}
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
                    </>
                )}

                {/* Per-Barber Timeline */}
                <div className={`space-y-4 ${isCurrentDateHoliday ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
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
                                                {barberBookings.length}/{timeSlots.length} dipesan
                                            </p>
                                        </div>
                                    </div>
 
                                    <div className="flex-1 overflow-x-auto">
                                        <div className="flex gap-1.5 min-w-max">
                                            {timeSlots.map(slot => {
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

                {/* Scheduled Customers List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-12"
                >
                    <div className="mb-6">
                        <div className="flex items-center gap-3">
                            <Users className="text-[#d4af37]" size={24} />
                            <h3 className="serif text-2xl font-bold">Lineup Booking Hari Ini</h3>
                        </div>
                        <p className="text-xs text-[#a1a1a1] mt-2 leading-relaxed max-w-2xl">
                            Mau reschedule, ganti capster, ubah layanan, atau edit data booking lo? Hubungi admin via <a href="#whatsapp" onClick={(e) => {
                                e.preventDefault();
                                const waBtn = document.querySelector('[aria-label="Chat Auro Barbershop lewat WhatsApp"]');
                                if (waBtn) waBtn.click();
                                else window.open('https://wa.me/6285219461408?text=Halo%20Auro!%20Mau%20reschedule%20/%20edit%20data%20booking%20saya%20nih.', '_blank');
                            }} className="text-[#d4af37] font-semibold hover:underline">tombol WhatsApp di pojok kanan bawah</a>!
                        </p>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="glass-card p-8 text-center text-[#a1a1a1]">
                             Masih kosong melompong nih! Slot capster ready buat lo.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...bookings]
                                .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
                                .map((booking, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="glass-card p-4 flex items-center justify-between hover:border-[#d4af37]/30 transition-colors"
                                    >
                                        <div>
                                            <p className="font-bold text-sm uppercase tracking-wider">{booking.customer_name || 'Hamba Allah'}</p>
                                            <p className="text-xs text-[#a1a1a1] mt-1">Kapster: <span className="text-white">{booking.barber_name}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 justify-end text-[#d4af37] font-mono font-bold text-lg">
                                                <Clock size={14} />
                                                <span>{booking.booking_time.substring(0, 5)}</span>
                                            </div>
                                            <div className="text-[10px] text-[#555] uppercase tracking-widest mt-1">
                                                {booking.status === 'completed' ? 'Selesai' : 'Terjadwal'}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                        </div>
                    )}
                </motion.div>

                {/* Legend */}
                <div className="flex flex-wrap gap-6 mt-8 text-[10px] text-[#a1a1a1] uppercase tracking-widest">
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
