import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Calendar, Clock, User, Phone, CheckCircle, ArrowLeft, Scissors, Coffee, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const MobileBooking = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [formError, setFormError] = useState('');

    const [formData, setFormData] = useState({
        type: 'service', // 'service' or 'product' (for future)
        name: localStorage.getItem('auro_name') || '',
        phone: localStorage.getItem('auro_phone') || '',
        service: '',
        barber: '',
        date: new Date().toISOString().split('T')[0],
        time: ''
    });

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

    useEffect(() => {
        const fetchBookings = async () => {
            if (!formData.date || !formData.barber || formData.type !== 'service') return;
            const { data } = await supabase
                .from('bookings')
                .select('booking_time')
                .eq('booking_date', formData.date)
                .eq('barber_name', formData.barber)
                .neq('status', 'cancelled');

            if (data) {
                setBookedSlots(data.map(b => b.booking_time.substring(0, 5)));
            }
        };
        fetchBookings();
    }, [formData.date, formData.barber, formData.type]);

    // Consistent phone validation
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

    const handleNext = () => {
        setFormError('');
        if (step === 1) {
            if (formData.type === 'service' && (!formData.service || !formData.barber || !formData.date || !formData.time)) {
                setFormError('Please select all required options to proceed.');
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(prev => prev - 1);
        else navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!validatePhone(formData.phone)) {
            setFormError('Please enter a valid phone number starting with 08 or 628.');
            return;
        }

        if (formData.type === 'service' && isSlotBooked(formData.time)) {
            setFormError('This slot was just taken. Please choose another time.');
            return;
        }

        setLoading(true);

        try {
            if (formData.type === 'service') {
                // Double booking check
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
                    setFormError('Sorry, slot taken. Please go back and choose another time.');
                    setLoading(false);
                    return;
                }

                const { data: newBooking, error } = await supabase
                    .from('bookings')
                    .insert([{
                        customer_name: formData.name,
                        phone_number: formData.phone,
                        service_type: formData.service,
                        barber_name: formData.barber,
                        booking_date: formData.date,
                        booking_time: formData.time,
                        status: 'pending'
                    }])
                    .select();

                if (error) throw error;

                // Save user info for future bookings
                localStorage.setItem('auro_name', formData.name);
                localStorage.setItem('auro_phone', formData.phone);

                setSuccessId(newBooking[0].id);
            } else {
                // Future handling for 'product' purchases
                alert('Product purchases coming soon!');
                setLoading(false);
            }
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError('Failed to book. Please try again.');
        } finally {
            if (!formError && formData.type === 'service') setLoading(false);
        }
    };

    // --- RENDER HELPERS ---



    const renderStep2Details = () => (
        <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5 w-full"
        >
            <h2 className="serif text-3xl font-bold mb-2 text-center">Choose Details</h2>
            {formError && <p className="text-red-500 text-xs text-center border border-red-500/30 p-2 rounded bg-red-500/10 mb-2">{formError}</p>}

            <div className="space-y-4">
                <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                    <input
                        required
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors text-sm text-white"
                        style={{ colorScheme: 'dark' }}
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                    />
                </div>

                <select
                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
                    value={formData.barber}
                    onChange={(e) => setFormData({ ...formData, barber: e.target.value, time: '' })}
                >
                    <option value="" disabled>Select Barber</option>
                    <option value="Master Aris">Master Aris</option>
                    <option value="Senior Budi">Senior Budi</option>
                    <option value="Artisan Catur">Artisan Catur</option>
                </select>

                <select
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

                {formData.date === new Date().toISOString().split('T')[0] && (
                    <div className="mt-6 mb-2">
                        <p className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Walk-In (In-Store)</p>
                        <button
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
                                py-3 w-full text-sm font-mono font-bold rounded transition-colors border flex items-center justify-center gap-2
                                ${formData.barber && !isNowAvailable() ? 'bg-[#1a1a1a] border-[#1f1f1f] text-[#333] cursor-not-allowed' :
                                    (!timeSlots.includes(formData.time) && formData.time !== '') ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' :
                                        'bg-[#141414] border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10'}
                            `}
                        >
                            <Clock size={16} />
                            {!formData.barber ? `Check Walk-In for ${getNowTimeStr()}...` : (!isNowAvailable() ? 'Unavailable (Chair Booked)' : `Book Now (${getNowTimeStr()})`)}
                        </button>
                    </div>
                )}

                <p className="text-xs uppercase tracking-widest text-[#a1a1a1] mt-6 mb-2">Later Slots</p>
                <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map(slot => {
                        const isBooked = isSlotBooked(slot);
                        const isSelected = formData.time === slot;
                        return (
                            <button
                                key={slot}
                                disabled={isBooked}
                                onClick={() => setFormData({ ...formData, time: slot })}
                                className={`
                                    py-2 text-xs font-mono rounded transition-colors border
                                    ${isBooked ? 'bg-[#1a1a1a] border-[#1f1f1f] text-[#333] cursor-not-allowed' :
                                        isSelected ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]' :
                                            'bg-[#141414] border-[#d4af37]/20 text-[#a1a1a1] hover:border-[#d4af37]/50'}
                                `}
                            >
                                {slot}
                            </button>
                        );
                    })}
                </div>
            </div>

            <button onClick={handleNext} className="gold-button w-full mt-6">
                Continue to Details
            </button>
            <Link
                to="/check"
                className="mt-4 py-4 px-6 bg-[#141414] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded-lg text-center text-[#d4af37] flex justify-center items-center gap-2 w-full shadow-lg font-bold"
            >
                <Search size={18} /> Find My Active Booking
            </Link>
        </motion.div>
    );

    const renderStep3Contact = () => (
        <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5 w-full"
        >
            <h2 className="serif text-3xl font-bold mb-2 text-center">Your Info</h2>
            {formError && <p className="text-red-500 text-xs text-center border border-red-500/30 p-2 rounded bg-red-500/10 mb-2">{formError}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <User size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                    <input
                        required
                        type="text"
                        placeholder="Full Name (e.g. John Doe)"
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
                        placeholder="Phone (08... or 628...)"
                        title="Must start with 08 or 628"
                        className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors font-mono tracking-wider"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                <div className="p-4 bg-[#141414] rounded border border-[#d4af37]/10 mt-6 text-sm">
                    <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Date</span> <span>{formData.date}</span></p>
                    <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Time</span> <span className="text-[#d4af37] font-mono">{formData.time}</span></p>
                    <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Barber</span> <span>{formData.barber}</span></p>
                    <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Service</span> <span>{formData.service}</span></p>
                </div>

                <div className="text-xs text-[#a1a1a1] text-center my-4">
                    Your phone number acts as your ticket ID.
                </div>

                <button
                    disabled={loading}
                    type="submit"
                    className="gold-button w-full flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Reservation'}
                </button>
            </form>
        </motion.div>
    );

    const renderSuccess = () => (
        <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-8 w-full"
        >
            <div className="text-[#d4af37] mb-6"><CheckCircle size={80} /></div>
            <h3 className="serif text-3xl font-bold mb-2">Confirmed</h3>
            <p className="text-[#a1a1a1] mb-8">Your royal seat is reserved.</p>

            <button
                onClick={() => navigate(`/queue/${successId}`)}
                className="gold-button w-full mb-4"
            >
                Open Queue Monitor Now
            </button>

            {/* Coffee & Product Offer */}
            <div className="mt-6 pt-6 border-t border-[#d4af37]/10 w-full text-center">
                <p className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-4">While you wait</p>
                <button
                    onClick={() => { alert("Product & Coffee purchases are coming in a future update!"); }}
                    className="glass-card p-4 flex items-center justify-center gap-4 hover:border-[#d4af37]/50 transition-all opacity-50 cursor-not-allowed group w-full"
                >
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center min-w-[40px]">
                        <Coffee size={20} className="text-[#555]" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-[#555]">Products & Coffee</h3>
                        <p className="text-[10px] text-[#a1a1a1] uppercase tracking-wider">Coming Soon</p>
                    </div>
                </button>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-[#555] mt-6">
                Save this link or use the "Check Order" tool later.
            </p>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans relative">
            <header className="p-6 flex items-center justify-between border-b border-[#d4af37]/10 bg-[#121212] sticky top-0 z-10 w-full max-w-md mx-auto">
                {!successId && (
                    <button onClick={handleBack} className="text-[#a1a1a1] hover:text-[#d4af37] transition">
                        <ArrowLeft size={24} />
                    </button>
                )}
                {successId && <div className="w-6" />}
                <div className="flex-1 flex justify-center">
                    <img src={`${import.meta.env.BASE_URL}auro_logo.png`} alt="Auro Logo" className="h-6 object-contain" />
                </div>
                <div className="w-6"></div>
            </header>

            <main className="flex-1 flex flex-col items-center p-6 pt-12 w-full max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {successId ? renderSuccess() : (
                        step === 1 ? renderStep2Details() :
                            renderStep3Contact()
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default MobileBooking;
