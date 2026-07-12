import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Phone, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import CircularTimePicker from './CircularTimePicker';
import VoucherClaim from './VoucherClaim';
import { useStoreSettings } from '../utils/useStoreSettings';

const BookingModal = ({ isOpen, onClose, initialData }) => {
    const { settings } = useStoreSettings();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [formError, setFormError] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        service: '',
        barber: '',
        date: (() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const defaultDailyHours = [
                { dayOfWeek: 1, dayName: 'Senin', isHoliday: false },
                { dayOfWeek: 2, dayName: 'Selasa', isHoliday: false },
                { dayOfWeek: 3, dayName: 'Rabu', isHoliday: false },
                { dayOfWeek: 4, dayName: 'Kamis', isHoliday: false },
                { dayOfWeek: 5, dayName: 'Jumat', isHoliday: false },
                { dayOfWeek: 6, dayName: 'Sabtu', isHoliday: true },
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
        })(),
        time: ''
    });
    const [services, setServices] = useState([]);
    const [servicesData, setServicesData] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [voucherData, setVoucherData] = useState(null);
    const [publicDiscounts, setPublicDiscounts] = useState([]);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [voucherClaimKey, setVoucherClaimKey] = useState(0);

    const getDiscountDeduction = (discount, subtotal) => {
        if (!discount) return 0;
        if (discount.min_purchase && subtotal < discount.min_purchase) return 0;
        if (discount.type === 'percent') {
            return Math.floor((subtotal * discount.value) / 100);
        } else {
            return discount.value;
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

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

        const dayOfWeek = now.getDay();
        const daySchedule = settings.daily_hours.find(ds => ds.dayOfWeek === dayOfWeek);
        if (!daySchedule || daySchedule.isHoliday) return false;

        const [startH, startM] = daySchedule.openingHour.split(':').map(Number);
        const [endH, endM] = daySchedule.closingHour.split(':').map(Number);

        const startMins = startH * 60 + startM;
        const endMins = (endH * 60 + endM) - 60; // Last slot starts 60 mins before closing

        if (currentMins < startMins || currentMins > endMins) return false;

        return !bookedSlots.some(b => {
            return Math.abs(currentMins - parseTime(b)) < 60;
        });
    };

    const getPickerHoursForDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = d.getDay();
        const daySchedule = settings.daily_hours.find(ds => ds.dayOfWeek === dayOfWeek);
        if (!daySchedule || daySchedule.isHoliday) return { start: 10, end: 21 };
        
        const start = parseInt(daySchedule.openingHour.split(':')[0], 10);
        const end = parseInt(daySchedule.closingHour.split(':')[0], 10);
        return { start, end };
    };

    const { start: pickerStartTime, end: pickerEndTime } = getPickerHoursForDate(formData.date);


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

    // Reset form when modal state changes
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                name: '',
                phone: '',
                service: '',
                barber: '',
                date: (() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const defaultDailyHours = [
                        { dayOfWeek: 1, dayName: 'Senin', isHoliday: false },
                        { dayOfWeek: 2, dayName: 'Selasa', isHoliday: false },
                        { dayOfWeek: 3, dayName: 'Rabu', isHoliday: false },
                        { dayOfWeek: 4, dayName: 'Kamis', isHoliday: false },
                        { dayOfWeek: 5, dayName: 'Jumat', isHoliday: false },
                        { dayOfWeek: 6, dayName: 'Sabtu', isHoliday: true },
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
                })(),
                time: ''
            });
            setVoucherData(null);
            setSelectedDiscount(null);
            setProofFile(null);
            setFormError('');
        }
    }, [isOpen]);

    // Fetch dynamic options
    useEffect(() => {
        if (!isOpen) return;
        const fetchOptions = async () => {
            const { data: bData } = await supabase.from('barbers').select('*').eq('is_active', true);
            if (bData) setBarbers(bData);

            const { data: sData } = await supabase.from('services').select('name, price');
            if (sData) {
                setServices(sData.map(s => s.name));
                setServicesData(sData);
            }

            const { data: dData } = await supabase.from('discounts')
                .select('*')
                .eq('is_active', true)
                .eq('show_public', true);
            if (dData) {
                setPublicDiscounts(dData);
            }
        };
        fetchOptions();
    }, [isOpen]);

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

    // Intercept back button to close modal
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: 'booking' }, '');

            const handlePopState = (e) => {
                onClose();
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.modal === 'booking') {
                    window.history.back();
                }
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

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

        const selectedBarberObj = barbers.find(b => b.name === formData.barber);
        const maxBookings = selectedBarberObj?.max_daily_bookings ?? 100;
        if (bookedSlots.length >= maxBookings) {
            setFormError(`Mohon maaf, capster ${formData.barber} sudah penuh (Maks. ${maxBookings} booking) untuk tanggal ini. Silakan pilih tanggal atau capster lain.`);
            setLoading(false);
            return;
        }

        try {
            let uploadedUrl = null;
            let discountStatus = 'none';

            if (selectedDiscount && selectedDiscount.requires_proof) {
                if (!proofFile) {
                    setFormError(`Silakan unggah bukti untuk diskon "${selectedDiscount.name}".`);
                    setLoading(false);
                    return;
                }

                try {
                    const fileExt = proofFile.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
                    const filePath = `${fileName}`;
                    const { error: uploadError } = await supabase.storage
                        .from('discount-proofs')
                        .upload(filePath, proofFile);
                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('discount-proofs')
                        .getPublicUrl(filePath);
                    uploadedUrl = publicUrl;
                    discountStatus = 'pending';
                } catch (uploadErr) {
                    console.error('Error uploading proof:', uploadErr);
                    setFormError('Gagal mengunggah gambar bukti. Silakan coba lagi.');
                    setLoading(false);
                    return;
                }
            }

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

            const chosenServiceObj = servicesData.find(s => s.name === formData.service);
            let basePrice = chosenServiceObj ? chosenServiceObj.price : 0;
            let discountValue = voucherData ? voucherData.discountValue : 0;
            let grandTotal = basePrice - discountValue;
            if (grandTotal < 0) grandTotal = 0;

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
                        status: 'pending',
                        total_price: grandTotal,
                        voucher_discount: voucherData ? voucherData.discountValue : 0,
                        voucher_program: voucherData ? voucherData.programId : null,
                        proof_url: uploadedUrl,
                        discount_status: discountStatus
                    }
                ])
                .select();

            if (error) throw error;

            if (!newBooking || newBooking.length === 0) {
                setFormError('Booking gagal. Lo terdeteksi punya lebih dari 2 booking aktif dalam 7 hari terakhir yang gak selesai. Nomor lo otomatis di-blacklist.');
                setLoading(false);
                return;
            }

            if (voucherData && voucherData.claimId) {
                await supabase.from('program_claims')
                    .update({ booking_id: newBooking[0].id })
                    .eq('id', voucherData.claimId);
            }

            setSuccess(newBooking[0].id);
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError(error.message || 'Failed to book. Please check your connection or try again.');
        } finally {
            setLoading(false);
        }
    };

    const chosenServiceObj = servicesData.find(s => s.name === formData.service);
    const selectedBarberObj = barbers.find(b => b.name === formData.barber);
    const maxBookings = selectedBarberObj?.max_daily_bookings ?? 100;
    const isLimitReached = formData.barber && bookedSlots.length >= maxBookings;

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
                        className="relative w-full max-w-lg glass-card p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
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
                                <h3 className="serif text-3xl font-bold mb-2">Booking Aman! 🔥</h3>
                                <p className="text-[#a1a1a1] mb-6">Slot lo udah dikunci. Siap-siap glow up!</p>

                                <div className="bg-[#141414] p-4 rounded-lg border border-[#d4af37]/20 mb-6">
                                    <p className="text-xs uppercase tracking-widest text-[#d4af37] mb-2">Pantau Antrean Live</p>
                                    <p className="text-sm font-mono break-all text-white/80">
                                        {window.location.origin}/queue/{success}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => window.open(`/queue/${success}`, '_blank')}
                                        className="gold-button w-full"
                                    >
                                        Open Monitor
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSuccess(false);
                                            onClose();
                                            setFormData({ name: '', phone: '', service: '', barber: '', date: '', time: '' });
                                            setVoucherData(null);
                                            setSelectedDiscount(null);
                                            setProofFile(null);
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
                                    <h3 className="serif text-2xl font-bold">Secure Your Slot</h3>
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
                                                placeholder="Nama Lengkap Lo"
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
                                                placeholder="Nomor HP Lo"
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
                                                    onChange={(e) => {
                                                        const d = new Date(e.target.value + 'T00:00:00');
                                                        const dayOfWeek = d.getDay();
                                                        const daySchedule = settings.daily_hours.find(ds => ds.dayOfWeek === dayOfWeek);
                                                        if (daySchedule && daySchedule.isHoliday) {
                                                            alert(`Mohon maaf, kami tutup pada hari ${daySchedule.dayName}.`);
                                                            return;
                                                        }
                                                        setFormData({ ...formData, date: e.target.value });
                                                    }}
                                                />
                                            </div>
                                            <div className="relative">
                                                <CircularTimePicker
                                                    value={formData.time}
                                                    onChange={(time) => setFormData({ ...formData, time })}
                                                    bookedSlots={bookedSlots}
                                                    interval={5}
                                                    startTime={pickerStartTime}
                                                    endTime={pickerEndTime}
                                                />
                                            </div>
                                        </div>

                                        {formData.date === new Date().toISOString().split('T')[0] && (
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!formData.barber) {
                                                            setFormError('Pilih Capster dulu ya buat cek ketersediaan walk-in.');
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
                                                            'bg-[#141414] border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10'}
                                                    `}
                                                >
                                                    <Clock size={16} />
                                                    {!formData.barber ? `Cek Walk-in Kunjungan untuk ${getNowTimeStr()}...` : (!isNowAvailable() ? 'Tidak Tersedia (Penuh)' : `Booking Walk-in (${getNowTimeStr()})`)}
                                                </button>
                                            </div>
                                        )}

                                        <select
                                            required
                                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
                                            value={formData.service}
                                            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                        >
                                            <option value="" disabled>Pilih Services</option>
                                            {services.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>

                                        <select
                                            required
                                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
                                            value={formData.barber}
                                            onChange={(e) => setFormData({ ...formData, barber: e.target.value })}
                                        >
                                            <option value="" disabled>Pilih Capster</option>
                                            {barbers.map(b => (
                                                <option key={b.id || b.name} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                        {formData.barber && isLimitReached && (
                                            <p className="text-red-500 text-xs mt-2 border border-red-500/30 p-2 rounded bg-red-500/10">
                                                ⚠️ Capster {formData.barber} sudah penuh hari ini (Maks. {maxBookings} booking). Silakan pilih tanggal atau capster lain.
                                            </p>
                                        )}
                                    </div>

                                    {/* Summary Box */}
                                    {chosenServiceObj && (
                                        <div className="p-4 bg-[#141414]/80 backdrop-blur rounded border border-[#d4af37]/15 text-sm space-y-2">
                                            <p className="flex justify-between"><span className="text-[#a1a1a1]">Tanggal</span> <span className="text-white">{formData.date}</span></p>
                                            <p className="flex justify-between"><span className="text-[#a1a1a1]">Waktu</span> <span className="text-[#d4af37] font-mono">{formData.time || '-'}</span></p>
                                            <p className="flex justify-between"><span className="text-[#a1a1a1]">Kapster</span> <span className="text-white">{formData.barber || '-'}</span></p>
                                            <p className="flex justify-between"><span className="text-[#a1a1a1]">Layanan</span> <span className="text-white">{formData.service} ({formatCurrency(chosenServiceObj.price)})</span></p>
                                            <hr className="border-[#333] my-2" />
                                            <p className="flex justify-between text-xs"><span className="text-[#a1a1a1]">Subtotal</span> <span className="text-white">{formatCurrency(chosenServiceObj.price)}</span></p>
                                            {voucherData && (
                                                <p className="flex justify-between text-xs text-green-500">
                                                    <span>Diskon ({voucherData.programId})</span>
                                                    <span>-{formatCurrency(voucherData.discountValue)}</span>
                                                </p>
                                            )}
                                            <p className="flex justify-between font-bold text-base border-t border-[#d4af37]/20 pt-2 text-[#d4af37]">
                                                <span>Total</span>
                                                <span>{formatCurrency(Math.max(0, chosenServiceObj.price - (voucherData?.discountValue || 0)))}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Public Discounts Selection */}
                                    {publicDiscounts.length > 0 && (chosenServiceObj?.price || 0) > 0 && (
                                        voucherData?.claimId ? (
                                            <div className="bg-[#141414]/90 border border-green-500/20 rounded p-4 text-center text-xs text-[#a1a1a1]">
                                                Voucher program sedang digunakan. Hapus voucher untuk memilih diskon publik.
                                            </div>
                                        ) : (
                                            <div className="bg-[#141414] border border-[#d4af37]/20 rounded p-4 text-left">
                                                <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest block mb-3">
                                                    Diskon Tersedia
                                                </span>
                                                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                                    {publicDiscounts.map((discount) => {
                                                        const isSelected = selectedDiscount?.id === discount.id;
                                                        const subtotal = chosenServiceObj.price;
                                                        const minPurchase = discount.min_purchase || 0;
                                                        const deduction = getDiscountDeduction(discount, subtotal);
                                                        const isDisabled = subtotal < minPurchase;

                                                        return (
                                                            <button
                                                                key={discount.id}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSelectedDiscount(null);
                                                                        setVoucherData(null);
                                                                        setProofFile(null);
                                                                    } else {
                                                                        setSelectedDiscount(discount);
                                                                        setVoucherData({
                                                                            discountValue: deduction,
                                                                            programId: discount.name,
                                                                            claimId: null
                                                                        });
                                                                        setVoucherClaimKey(prev => prev + 1);
                                                                        setProofFile(null);
                                                                    }
                                                                }}
                                                                className={`w-full p-3 rounded border text-left transition-all flex justify-between items-center ${
                                                                    isDisabled ? 'opacity-40 cursor-not-allowed border-[#333]' :
                                                                    isSelected ? 'bg-[#d4af37]/10 border-[#d4af37] text-white' :
                                                                    'bg-[#0d0d0d] border-[#d4af37]/20 hover:border-[#d4af37]/50'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <div className="font-bold text-xs uppercase tracking-wider text-white">
                                                                        {discount.name}
                                                                        {discount.requires_proof && (
                                                                            <span className="ml-2 bg-[#d4af37]/20 text-[#d4af37] text-[9px] px-1.5 py-0.5 rounded font-normal uppercase tracking-normal">
                                                                                Upload Bukti
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#a1a1a1] mt-0.5">
                                                                        {discount.type === 'percent' ? `${discount.value}%` : `Rp ${discount.value.toLocaleString('id-ID')}`}
                                                                        {minPurchase > 0 && ` · Min. Belanja Rp ${minPurchase.toLocaleString('id-ID')}`}
                                                                    </div>
                                                                </div>
                                                                {!isDisabled && (
                                                                    <div className="text-right">
                                                                        <span className="text-xs font-mono font-bold text-[#d4af37]">
                                                                            -Rp {deduction.toLocaleString('id-ID')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Proof Upload UI */}
                                                {selectedDiscount?.requires_proof && (
                                                    <div className="mt-4 pt-4 border-t border-[#333] space-y-2">
                                                        <label className="block text-xs uppercase tracking-widest text-[#d4af37] font-bold">
                                                            Unggah Bukti Pendukung *
                                                        </label>
                                                        <p className="text-[10px] text-[#a1a1a1]">
                                                            Unggah gambar/screenshot bukti kelayakan diskon.
                                                        </p>
                                                        <div className="flex items-center gap-3">
                                                            {proofFile && (
                                                                <div className="w-12 h-12 rounded overflow-hidden border border-[#d4af37]/30 shrink-0 bg-[#0d0d0d]">
                                                                    <img 
                                                                        src={URL.createObjectURL(proofFile)} 
                                                                        alt="Preview bukti" 
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <input
                                                                required
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        setProofFile(e.target.files[0]);
                                                                    }
                                                                }}
                                                                className="w-full text-xs text-[#a1a1a1] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:bg-[#d4af37] file:text-black hover:file:bg-[#b5952f] transition-colors cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    )}

                                    <div className="mt-4 mb-2">
                                        {selectedDiscount ? (
                                            <div className="bg-[#141414]/90 border border-[#d4af37]/20 rounded p-4 text-center text-xs text-[#a1a1a1] flex items-center justify-between">
                                                <span>Diskon publik aktif: <strong>{selectedDiscount.name}</strong></span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDiscount(null);
                                                        setVoucherData(null);
                                                        setProofFile(null);
                                                    }}
                                                    className="text-xs text-[#d4af37] hover:text-[#f1d592] font-bold uppercase tracking-wider pl-2"
                                                >
                                                    Batalkan
                                                </button>
                                            </div>
                                        ) : (
                                            <VoucherClaim 
                                                key={`vc-${voucherClaimKey}`}
                                                onVoucherApplied={(data) => {
                                                    setVoucherData(data);
                                                    if (data) {
                                                        setSelectedDiscount(null);
                                                        setProofFile(null);
                                                    }
                                                }} 
                                                initialPhone={formData.phone} 
                                            />
                                        )}
                                    </div>

                                    <button
                                        disabled={loading || isLimitReached}
                                        type="submit"
                                        className={`gold-button w-full flex items-center justify-center gap-2 ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                                            />
                                        ) : (
                                            'KONFIRMASI BOOKING'
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
