import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Phone, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BookingModal = ({ isOpen, onClose, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        service: '',
        barber: '',
        date: '',
        time: ''
    });

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

    const timeSlots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
        "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
        "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
    ];

    const parseTime = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const isSlotBooked = (slot) => {
        if (!slot) return false;
        const slotMins = parseTime(slot);
        return bookedSlots.some(b => Math.abs(slotMins - parseTime(b)) < 60);
    };

    const getNowTimeStr = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const isNowAvailable = () => {
        if (formData.date !== new Date().toISOString().split('T')[0]) return false;
        if (!formData.barber) return false;

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        if (currentMins < 9 * 60 || currentMins > 20 * 60) return false;

        return !bookedSlots.some(b => {
            return Math.abs(currentMins - parseTime(b)) < 60;
        });
    };

    // Fetch existing bookings for selected date and barber
    useEffect(() => {
        const fetchBookings = async () => {
            if (!formData.date || !formData.barber) return;

            const { data, error } = await supabase
                .from('bookings')
                .select('booking_time')
                .eq('booking_date', formData.date)
                .eq('barber_name', formData.barber)
                .neq('status', 'cancelled');

            if (data) {
                const booked = data.map(b => b.booking_time.substring(0, 5));
                setBookedSlots(booked);
            }
        };

        fetchBookings();
    }, [formData.date, formData.barber, isOpen]);

    // Pre-fill fields when opened with initial data
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(prev => ({
                ...prev,
                service: initialData.service || '',
                barber: initialData.barber || '',
                date: initialData.date || '',
                time: initialData.time || '',
            }));
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!validatePhone(formData.phone)) {
            setFormError('Please enter a valid phone number starting with 08 or 628.');
            return;
        }

        if (isSlotBooked(formData.time)) {
            setFormError('This slot was just taken. Please choose another time.');
            return;
        }

        setLoading(true);

        try {
            // Server-side double-booking check right before insert
            const { data: existing } = await supabase
                .from('bookings')
                .select('id')
                .eq('booking_date', formData.date)
                .eq('booking_time', formData.time)
                .eq('barber_name', formData.barber)
                .neq('status', 'cancelled')
                .limit(1);

            if (existing && existing.length > 0) {
                setBookedSlots(prev => [...prev, formData.time]);
                setFormError('Sorry, this slot was just booked by someone else. Please choose another time.');
                setLoading(false);
                return;
            }

            const { data: newBooking, error } = await supabase
                .from('bookings')
                .insert([
                    {
                        customer_name: formData.name,
                        phone_number: formData.phone,
                        service_type: formData.service,
                        barber_name: formData.barber,
                        booking_date: formData.date,
                        booking_time: formData.time,
                        status: 'pending'
                    }
                ])
                .select();

            if (error) throw error;

            setSuccess(newBooking[0].id);
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError('Failed to book. Please check your connection or try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg glass-card p-6 md:p-8 shadow-2xl overflow-hidden"
                    >
                        {success ? (
                            <div className="py-12 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-block text-[#d4af37] mb-6"
                                >
                                    <CheckCircle size={80} />
                                </motion.div>
                                <h3 className="serif text-3xl font-bold mb-2">Booking Confirmed</h3>
                                <p className="text-[#a1a1a1] mb-6">Your royal seat is reserved. See you soon!</p>

                                <div className="bg-[#141414] p-4 rounded-lg border border-[#d4af37]/20 mb-6">
                                    <p className="text-xs uppercase tracking-widest text-[#d4af37] mb-2">Your Queue Monitor</p>
                                    <p className="text-sm font-mono break-all text-white/80">
                                        {window.location.origin}/barberpage/queue/{success}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => window.open(`/barberpage/queue/${success}`, '_blank')}
                                        className="gold-button w-full"
                                    >
                                        Open Monitor
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSuccess(false);
                                            onClose();
                                            setFormData({ name: '', phone: '', service: '', barber: '', date: '', time: '' });
                                        }}
                                        className="py-3 px-6 bg-transparent border border-[#333] hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded text-white"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="serif text-2xl font-bold">Reserve Your Seat</h3>
                                    <button onClick={onClose} className="text-[#a1a1a1] hover:text-[#d4af37]">
                                        <X size={24} />
                                    </button>
                                </div>

                                {formError && <p className="text-red-500 text-xs text-center border border-red-500/30 p-2 rounded bg-red-500/10 mb-4">{formError}</p>}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <User size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                                            <input
                                                required
                                                type="text"
                                                placeholder="Full Name"
                                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="relative">
                                            <Phone size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                                            <input
                                                required
                                                type="tel"
                                                placeholder="Phone Number"
                                                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <Calendar size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                                                <input
                                                    required
                                                    type="date"
                                                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors text-sm text-white"
                                                    style={{ colorScheme: 'dark' }}
                                                    value={formData.date}
                                                    onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Clock size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                                                <select
                                                    required
                                                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors text-sm appearance-none"
                                                    value={formData.time}
                                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                >
                                                    <option value="" disabled>Select Time</option>
                                                    {timeSlots.map(slot => {
                                                        const booked = isSlotBooked(slot);
                                                        return (
                                                            <option
                                                                key={slot}
                                                                value={slot}
                                                                disabled={booked}
                                                                className={booked ? 'text-white/20' : ''}
                                                            >
                                                                {slot} {booked ? '(Full)' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>

                                        {formData.date === new Date().toISOString().split('T')[0] && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!formData.barber) {
                                                            setFormError('Please select a Barber first to view walk-in availability.');
                                                            return;
                                                        }
                                                        if (isNowAvailable()) {
                                                            setFormData({ ...formData, time: getNowTimeStr() });
                                                        }
                                                    }}
                                                    disabled={formData.barber && !isNowAvailable()}
                                                    className={`
                                                        py-2.5 w-full text-sm font-mono font-bold rounded transition-colors border flex items-center justify-center gap-2
                                                        ${formData.barber && !isNowAvailable() ? 'bg-[#1a1a1a] border-[#1f1f1f] text-[#333] cursor-not-allowed' :
                                                            (!timeSlots.includes(formData.time) && formData.time !== '') ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' :
                                                                'bg-[#141414] border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10'}
                                                    `}
                                                >
                                                    <Clock size={16} />
                                                    {!formData.barber ? `Check Walk-In for ${getNowTimeStr()}...` : (!isNowAvailable() ? 'Unavailable (Chair Booked)' : `Book Walk-In (${getNowTimeStr()})`)}
                                                </button>
                                            </div>
                                        )}

                                        <select
                                            required
                                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
                                            value={formData.service}
                                            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                        >
                                            <option value="" disabled>Select Service</option>
                                            <option value="Mid Fade">Mid Fade</option>
                                            <option value="Comma Hair">Comma Hair</option>
                                            <option value="Buzzcut">Buzzcut</option>
                                            <option value="Two Block">Two Block</option>
                                        </select>

                                        <select
                                            required
                                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
                                            value={formData.barber}
                                            onChange={(e) => setFormData({ ...formData, barber: e.target.value, time: '' })}
                                        >
                                            <option value="" disabled>Select Barber</option>
                                            <option value="Master Aris">Master Aris</option>
                                            <option value="Senior Budi">Senior Budi</option>
                                            <option value="Artisan Catur">Artisan Catur</option>
                                        </select>
                                    </div>

                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="gold-button w-full flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                                            />
                                        ) : (
                                            'Confirm Booking'
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingModal;
