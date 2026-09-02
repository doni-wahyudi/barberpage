import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    CheckCircle, 
    Scissors, 
    Gift, 
    Tag, 
    Percent, 
    Award, 
    ChevronDown, 
    ChevronUp, 
    Check, 
    Sparkles, 
    Loader2, 
    AlertCircle, 
    ExternalLink 
} from 'lucide-react';
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
    
    // Service Sort Order ('popular' | 'name' | 'default')
    const [serviceSort, setServiceSort] = useState('popular');
    const [pickerMode, setPickerMode] = useState('grid'); // 'grid' | 'dial'
    const [activePromoTab, setActivePromoTab] = useState('discount'); // Default expanded to 'discount'

    const [formData, setFormData] = useState({
        name: localStorage.getItem('auro_name') || '',
        phone: localStorage.getItem('auro_phone') || '',
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

    // Referral Code States
    const [referralInput, setReferralInput] = useState('');
    const [appliedReferral, setAppliedReferral] = useState(null);
    const [referralError, setReferralError] = useState('');
    const [referralLoading, setReferralLoading] = useState(false);

    // Auto-check URL parameter `?ref=CODE` when modal opens
    useEffect(() => {
        if (isOpen) {
            const params = new URLSearchParams(window.location.search);
            const refParam = params.get('ref') || params.get('referral');
            if (refParam) {
                const codeUpper = refParam.trim().toUpperCase();
                setReferralInput(codeUpper);
                verifyReferralCode(codeUpper);
            }
        }
    }, [isOpen]);

    const verifyReferralCode = async (codeToVerify) => {
        const cleanCode = (codeToVerify || referralInput).trim().toUpperCase();
        if (!cleanCode) {
            setReferralError('Masukkan kode referral');
            return;
        }

        setReferralLoading(true);
        setReferralError('');

        try {
            const { data, error } = await supabase
                .from('referral_partners')
                .select('*')
                .eq('code', cleanCode)
                .eq('is_active', true)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                setReferralError('Kode referral tidak ditemukan atau tidak aktif');
                setReferralLoading(false);
                return;
            }

            if (data.max_uses && data.current_uses >= data.max_uses) {
                setReferralError('Batas penggunaan kode referral ini telah habis');
                setReferralLoading(false);
                return;
            }

            // Enforce Mutual Exclusion: Clear other discounts & vouchers
            setVoucherData(null);
            setSelectedDiscount(null);

            setAppliedReferral(data);
            setReferralInput(cleanCode);
            setReferralError('');
        } catch (err) {
            console.error('Referral verification error:', err);
            setReferralError('Gagal memverifikasi kode referral');
        } finally {
            setReferralLoading(false);
        }
    };

    const removeReferral = () => {
        setAppliedReferral(null);
        setReferralInput('');
        setReferralError('');
    };

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
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
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
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
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
        const daySchedule = settings?.daily_hours?.find(ds => ds.dayOfWeek === dayOfWeek);
        if (!daySchedule || daySchedule.isHoliday) return false;

        const [startH, startM] = (daySchedule.openingHour || '09:00').split(':').map(Number);
        const [endH, endM] = (daySchedule.closingHour || '21:00').split(':').map(Number);

        const startMins = startH * 60 + startM;
        const endMins = (endH * 60 + endM) - 30;

        if (currentMins < startMins || currentMins > endMins) return false;

        return !bookedSlots.some(b => {
            return Math.abs(currentMins - parseTime(b)) < 60;
        });
    };

    const getPickerHoursForDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = d.getDay();
        const daySchedule = settings?.daily_hours?.find(ds => ds.dayOfWeek === dayOfWeek);
        if (!daySchedule || daySchedule.isHoliday) return { start: '09:00', end: '21:00' };
        
        return {
            start: daySchedule.openingHour || '09:00',
            end: daySchedule.closingHour || '21:00'
        };
    };

    const { start: pickerStartTime, end: pickerEndTime } = getPickerHoursForDate(formData.date);

    // Generate quick time slot pill options based on store opening hours
    const availableTimeSlots = useMemo(() => {
        const [startH, startM] = pickerStartTime.split(':').map(Number);
        const [endH, endM] = pickerEndTime.split(':').map(Number);
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        const slots = [];
        for (let m = startMins; m <= endMins - 30; m += 30) {
            const h = Math.floor(m / 60);
            const mins = m % 60;
            slots.push(`${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
        }
        return slots;
    }, [pickerStartTime, pickerEndTime]);

    // Fetch existing bookings for selected date and barber
    useEffect(() => {
        const fetchBookings = async () => {
            if (!formData.date || !formData.barber) return;

            const { data } = await supabase
                .from('bookings')
                .select('booking_time')
                .eq('booking_date', formData.date)
                .eq('barber_name', formData.barber)
                .in('status', ['pending', 'confirmed']);

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
                name: localStorage.getItem('auro_name') || '',
                phone: localStorage.getItem('auro_phone') || '',
                service: '',
                barber: '',
                date: (() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return todayStr;
                })(),
                time: ''
            });
            setVoucherData(null);
            setSelectedDiscount(null);
            setProofFile(null);
            setFormError('');
            setSuccess(false);
        }
    }, [isOpen]);

    // Fetch dynamic options
    useEffect(() => {
        if (!isOpen) return;
        const fetchOptions = async () => {
            const { data: bData } = await supabase.from('barbers').select('*').eq('is_active', true);
            if (bData) {
                setBarbers(bData);
                if (!formData.barber && bData.length > 0) {
                    setFormData(prev => ({ ...prev, barber: prev.barber || bData[0].name }));
                }
            }

            const [sRes, bRes] = await Promise.all([
                supabase.from('services').select('*').order('sort_order', { ascending: true }),
                supabase.from('bookings').select('service_type')
            ]);

            if (sRes.data) {
                const popMap = {};
                (bRes.data || []).forEach(b => {
                    if (!b.service_type) return;
                    const st = b.service_type.toLowerCase();
                    sRes.data.forEach(s => {
                        if (st.includes(s.name.toLowerCase())) {
                            popMap[s.id] = (popMap[s.id] || 0) + 1;
                        }
                    });
                });

                const enriched = sRes.data.map(s => ({
                    ...s,
                    booking_count: popMap[s.id] || 0
                }));

                setServicesData(enriched);
                setServices(enriched.map(s => s.name));

                // Auto-select first popular service
                if (!formData.service && enriched.length > 0) {
                    const topPopular = [...enriched].sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0))[0];
                    setFormData(prev => ({ ...prev, service: prev.service || topPopular.name }));
                }
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
                service: initialData.service || prev.service,
                barber: initialData.barber || prev.barber,
                date: initialData.date || prev.date,
                time: initialData.time || prev.time,
            }));
        }
    }, [initialData, isOpen]);

    // Intercept back button to close modal
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modal: 'booking' }, '');

            const handlePopState = () => {
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
    }, [isOpen, onClose]);

    // Sort services according to selected user preference
    const sortedServices = useMemo(() => {
        const list = [...servicesData];
        if (serviceSort === 'popular') {
            return list.sort((a, b) => {
                const diff = (b.booking_count || 0) - (a.booking_count || 0);
                if (diff !== 0) return diff;
                return (a.sort_order ?? 999) - (b.sort_order ?? 999);
            });
        } else if (serviceSort === 'name') {
            return list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
        } else { // 'default'
            return list.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        }
    }, [servicesData, serviceSort]);

    const chosenServiceObj = servicesData.find(s => s.name === formData.service);
    const basePrice = chosenServiceObj ? chosenServiceObj.price : 0;
    const subtotal = basePrice;

    // Calculate discounts
    let referralDiscVal = 0;
    let referralCommVal = 0;
    if (appliedReferral) {
        if (appliedReferral.discount_type === 'percent') {
            referralDiscVal = Math.floor((subtotal * appliedReferral.discount_value) / 100);
        } else {
            referralDiscVal = appliedReferral.discount_value;
        }
        if (appliedReferral.commission_type === 'percent') {
            referralCommVal = Math.floor((subtotal * appliedReferral.commission_value) / 100);
        } else {
            referralCommVal = appliedReferral.commission_value;
        }
    }

    let calculatedDiscount = 0;
    if (appliedReferral) {
        calculatedDiscount = referralDiscVal;
    } else if (voucherData) {
        calculatedDiscount = voucherData.discountValue;
    } else if (selectedDiscount) {
        calculatedDiscount = getDiscountDeduction(selectedDiscount, subtotal);
    }

    const grandTotal = Math.max(0, subtotal - calculatedDiscount);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!formData.name.trim()) {
            setFormError('Silakan isi nama lengkap.');
            return;
        }

        if (!validatePhone(formData.phone)) {
            setFormError('Nomor HP tidak valid. Gunakan format Indonesia yang dimulai dengan 08 atau 628.');
            return;
        }

        if (!formData.service) {
            setFormError('Silakan pilih layanan.');
            return;
        }

        if (!formData.barber) {
            setFormError('Silakan pilih kapster.');
            return;
        }

        if (!formData.date) {
            setFormError('Silakan pilih tanggal booking.');
            return;
        }

        if (!formData.time) {
            setFormError('Silakan pilih jam kedatangan.');
            return;
        }

        if (isSlotBooked(formData.time)) {
            setFormError('Slot waktu ini baru saja dipesan pelanggan lain. Silakan pilih jam lain.');
            return;
        }

        setLoading(true);

        try {
            let uploadedUrl = null;
            let discountStatus = 'none';

            if (selectedDiscount && selectedDiscount.requires_proof) {
                if (!proofFile) {
                    setFormError(`Silakan unggah gambar bukti untuk diskon "${selectedDiscount.name}".`);
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
                .in('status', ['pending', 'confirmed'])
                .limit(1);

            if (existing && existing.length > 0) {
                setBookedSlots(prev => [...prev, formData.time]);
                setFormError('Maaf, slot waktu ini baru saja diambil pelanggan lain. Silakan pilih jam lain.');
                setLoading(false);
                return;
            }

            const bookingPayload = {
                customer_name: formData.name.trim(),
                phone_number: formData.phone.trim(),
                service_type: formData.service,
                barber_name: formData.barber,
                booking_date: formData.date,
                booking_time: formData.time,
                status: 'pending',
                total_price: grandTotal,
                voucher_discount: calculatedDiscount,
                voucher_program: appliedReferral ? `REF:${appliedReferral.code}` : (voucherData ? voucherData.programId : (selectedDiscount ? selectedDiscount.name : null)),
                proof_url: uploadedUrl,
                discount_status: discountStatus,
                referral_code: appliedReferral ? appliedReferral.code : null,
                referral_discount: referralDiscVal,
                referral_commission: referralCommVal
            };

            const { data: newBooking, error } = await supabase
                .from('bookings')
                .insert([bookingPayload])
                .select();

            if (error) throw error;

            if (!newBooking || newBooking.length === 0) {
                setFormError('Booking gagal. Anda terdeteksi memiliki lebih dari 2 booking aktif dalam 7 hari terakhir yang tidak selesai.');
                setLoading(false);
                return;
            }

            if (appliedReferral) {
                try {
                    await supabase.from('referral_commissions').insert([{
                        partner_id: appliedReferral.id,
                        code: appliedReferral.code,
                        booking_id: newBooking[0].id,
                        customer_name: formData.name.trim(),
                        customer_phone: formData.phone.trim(),
                        order_amount: subtotal,
                        discount_amount: referralDiscVal,
                        commission_amount: referralCommVal,
                        status: 'pending'
                    }]);
                    await supabase.from('referral_partners')
                        .update({ current_uses: (appliedReferral.current_uses || 0) + 1 })
                        .eq('code', appliedReferral.code);
                } catch (refErr) {
                    console.error('Failed to record referral commission:', refErr);
                }
            }

            if (voucherData && voucherData.claimId) {
                await supabase.from('program_claims')
                    .update({ booking_id: newBooking[0].id })
                    .eq('id', voucherData.claimId);
            }

            localStorage.setItem('auro_name', formData.name.trim());
            localStorage.setItem('auro_phone', formData.phone.trim());

            setSuccess(newBooking[0].id);
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError(error.message || 'Terjadi kesalahan saat memproses booking. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-contain">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/85 backdrop-blur-md"
                    />

                    {/* Modal Window Container (Bottom Sheet on Mobile iPhone, Centered Dialog on Desktop) */}
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0, y: 30 }}
                        transition={{ duration: 0.25 }}
                        className="relative w-full max-w-2xl bg-[#111111] border border-[#d4af37]/30 rounded-t-[28px] sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden my-0 sm:my-auto max-h-[92dvh] flex flex-col z-10 pb-[env(safe-area-inset-bottom,16px)]"
                    >
                        {/* Top Gold Foil Stripe */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#997922] via-[#f1d592] to-[#997922] shrink-0" />

                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[#222] bg-[#141414] flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#d4af37]">
                                        Auro Barbershop
                                    </span>
                                </div>
                                <h3 className="serif text-xl sm:text-2xl font-bold text-white mt-0.5">
                                    Reservasi Jadwal Cukur
                                </h3>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-xl bg-[#1f1f1f] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all"
                                aria-label="Tutup"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {success ? (
                                <div className="py-8 text-center flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] mb-5 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                                        <CheckCircle size={44} />
                                    </div>
                                    <h3 className="serif text-3xl font-bold text-white mb-2">Booking Berhasil! 🔥</h3>
                                    <p className="text-gray-400 text-xs max-w-sm mb-6">
                                        Slot jadwal Anda di Auro Barbershop telah diamankan secara resmi.
                                    </p>

                                    <div className="bg-[#181818] p-4 rounded-2xl border border-[#d4af37]/20 w-full max-w-md mb-6 text-left">
                                        <div className="flex justify-between items-center text-xs pb-2 border-b border-[#2a2a2a]">
                                            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Kode Tiket Anda</span>
                                            <span className="font-mono text-[#d4af37] font-bold">#{success.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                        <p className="text-xs text-gray-300 mt-2">
                                            Layanan: <strong>{formData.service}</strong> ({formData.barber})
                                        </p>
                                        <p className="text-xs text-gray-300">
                                            Jadwal: <strong>{formData.date} • {formData.time} WIB</strong>
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                                        <button
                                            onClick={() => window.open(`/queue/${success}`, '_blank')}
                                            className="gold-button flex-1 !py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            <span>Buka Monitor Antrean</span>
                                            <ExternalLink size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSuccess(false);
                                                onClose();
                                            }}
                                            className="py-3 px-5 rounded-xl border border-[#333] hover:border-gray-500 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
                                        >
                                            Selesai
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {formError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                            <span>{formError}</span>
                                        </div>
                                    )}

                                    {/* 1. DATA DIRI (Nama & HP) */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                                            <User size={14} /> 1. Data Diri Pelanggan
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="relative">
                                                <User size={16} className="absolute left-3.5 top-3.5 text-[#d4af37]" />
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Nama Lengkap (Cth: Budi)"
                                                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 pl-10 focus:outline-none focus:border-[#d4af37] text-xs text-white placeholder:text-gray-600"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-3.5 top-3.5 text-[#d4af37]" />
                                                <input
                                                    required
                                                    type="tel"
                                                    placeholder="Nomor HP / WhatsApp (08...)"
                                                    className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 pl-10 focus:outline-none focus:border-[#d4af37] text-xs text-white font-mono placeholder:text-gray-600"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. PILIH LAYANAN (Interactive & Scrollable) */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                                                <Scissors size={14} /> 2. Pilih Menu Layanan
                                            </label>

                                            {/* Sort Options */}
                                            <div className="flex items-center gap-1 bg-[#181818] p-0.5 rounded-lg border border-[#2a2a2a]">
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceSort('popular')}
                                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                                                        serviceSort === 'popular' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-gray-200'
                                                    }`}
                                                >
                                                    🔥 Populer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceSort('name')}
                                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                                                        serviceSort === 'name' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-gray-200'
                                                    }`}
                                                >
                                                    🔤 Nama
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServiceSort('default')}
                                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                                                        serviceSort === 'default' ? 'bg-[#d4af37] text-black' : 'text-gray-400 hover:text-gray-200'
                                                    }`}
                                                >
                                                    ⚙️ Default
                                                </button>
                                            </div>
                                        </div>

                                        <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2 rounded-xl border border-[#262626] bg-[#0c0c0c] p-1.5 custom-scrollbar">
                                            {sortedServices.map((s, idx) => {
                                                const isSelected = formData.service === s.name;
                                                const isTopPopular = serviceSort === 'popular' && idx < 3 && (s.booking_count || 0) > 0;

                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, service: s.name });
                                                            if (formError) setFormError('');
                                                        }}
                                                        className={`
                                                            w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all duration-200
                                                            ${isSelected 
                                                                ? 'bg-[#d4af37]/15 border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.15)] ring-1 ring-[#d4af37]' 
                                                                : 'bg-[#141414] border-[#222] hover:border-[#d4af37]/40 text-gray-300'
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-[#d4af37] text-black' : 'bg-[#1e1e1e] text-[#d4af37]'}`}>
                                                                {isTopPopular ? '🔥' : '✂️'}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                                        {s.name}
                                                                    </span>
                                                                    {isTopPopular && (
                                                                        <span className="text-[8px] bg-[#d4af37]/20 text-[#d4af37] px-1 py-0.2 rounded font-bold uppercase">
                                                                            Top {idx + 1}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="font-mono font-bold text-xs text-[#d4af37]">
                                                                {formatCurrency(s.price)}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. PILIH KAPSTER */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                                            <User size={14} /> 3. Pilih Kapster
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {barbers.map(b => {
                                                const isSelected = formData.barber === b.name;
                                                const initials = b.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                                return (
                                                    <button
                                                        key={b.id || b.name}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, barber: b.name, time: '' });
                                                            if (formError) setFormError('');
                                                        }}
                                                        className={`
                                                            p-2.5 rounded-xl border flex items-center gap-2.5 transition-all
                                                            ${isSelected 
                                                                ? 'bg-[#d4af37]/15 border-[#d4af37] ring-1 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.15)]' 
                                                                : 'bg-[#161616] border-[#2a2a2a] hover:border-[#d4af37]/40 text-gray-300'
                                                            }
                                                        `}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${isSelected ? 'bg-[#d4af37] text-black' : 'bg-[#222] text-[#d4af37] border border-[#d4af37]/30'}`}>
                                                            {initials}
                                                        </div>
                                                        <div className="text-left truncate">
                                                            <p className="text-xs font-bold text-white truncate">{b.name}</p>
                                                            <p className="text-[9px] text-emerald-400 font-semibold uppercase">Ready</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 4. TANGGAL & WAKTU */}
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                                                <Calendar size={14} /> 4. Jadwal & Jam Kedatangan
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setPickerMode(prev => prev === 'grid' ? 'dial' : 'grid')}
                                                className="text-[10px] uppercase tracking-wider text-gray-400 hover:text-[#d4af37] underline"
                                            >
                                                {pickerMode === 'grid' ? 'Mode Dial Jam' : 'Mode Grid Slot'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, date: todayStr, time: '' })}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${formData.date === todayStr ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#161616] text-gray-300 border-[#2a2a2a] hover:border-[#d4af37]/50'}`}
                                                    >
                                                        Hari Ini
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, date: tomorrowStr, time: '' })}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${formData.date === tomorrowStr ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#161616] text-gray-300 border-[#2a2a2a] hover:border-[#d4af37]/50'}`}
                                                    >
                                                        Besok
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <Calendar size={15} className="absolute left-3 top-3 text-[#d4af37]" />
                                                    <input
                                                        required
                                                        type="date"
                                                        min={todayStr}
                                                        value={formData.date}
                                                        onChange={(e) => {
                                                            const d = new Date(e.target.value + 'T00:00:00');
                                                            const dayOfWeek = d.getDay();
                                                            const daySchedule = settings?.daily_hours?.find(ds => ds.dayOfWeek === dayOfWeek);
                                                            if (daySchedule && daySchedule.isHoliday) {
                                                                alert(`Mohon maaf, Auro Barbershop libur pada hari ${daySchedule.dayName}.`);
                                                                return;
                                                            }
                                                            setFormData({ ...formData, date: e.target.value, time: '' });
                                                        }}
                                                        className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-2.5 pl-9 focus:outline-none focus:border-[#d4af37] text-xs text-white"
                                                        style={{ colorScheme: 'dark' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Time slots container */}
                                            <div>
                                                {pickerMode === 'grid' ? (
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                                        {availableTimeSlots.map(slot => {
                                                            const isBooked = isSlotBooked(slot);
                                                            const isSelected = formData.time === slot;
                                                            const isPast = formData.date === todayStr && slot < getNowTimeStr();

                                                            return (
                                                                <button
                                                                    key={slot}
                                                                    type="button"
                                                                    disabled={isBooked || isPast}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, time: slot });
                                                                        if (formError) setFormError('');
                                                                    }}
                                                                    className={`
                                                                        py-2 rounded-lg font-mono text-[11px] font-bold transition-all border
                                                                        ${isSelected 
                                                                            ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-sm' 
                                                                            : isBooked || isPast
                                                                                ? 'bg-[#141414] border-[#1f1f1f] text-[#444] cursor-not-allowed line-through'
                                                                                : 'bg-[#161616] border-[#2a2a2a] text-gray-300 hover:border-[#d4af37]/60 hover:bg-[#202020]'
                                                                        }
                                                                    `}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <CircularTimePicker
                                                        value={formData.time}
                                                        onChange={(time) => setFormData({ ...formData, time })}
                                                        bookedSlots={bookedSlots}
                                                        interval={5}
                                                        startTime={pickerStartTime}
                                                        endTime={pickerEndTime}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Walk-in Shortcut for Today */}
                                        {formData.date === todayStr && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!formData.barber) {
                                                        setFormError('Pilih Kapster terlebih dahulu untuk cek ketersediaan Walk-In.');
                                                        return;
                                                    }
                                                    if (isNowAvailable()) {
                                                        setFormData({ ...formData, time: getNowTimeStr() });
                                                    }
                                                }}
                                                disabled={formData.barber && !isNowAvailable()}
                                                className={`
                                                    w-full py-2 px-3 rounded-xl text-xs font-mono font-bold border flex items-center justify-center gap-1.5 transition-all
                                                    ${formData.barber && !isNowAvailable() 
                                                        ? 'bg-[#181818] border-[#222] text-[#444] cursor-not-allowed' 
                                                        : 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20'}
                                                `}
                                            >
                                                <Sparkles size={13} />
                                                {!formData.barber 
                                                    ? `Cek Kursi Walk-in Sekarang (${getNowTimeStr()} WIB)...` 
                                                    : (!isNowAvailable() ? 'Kursi Sedang Penuh Saat Ini' : `⚡ Datang Langsung Sekarang (${getNowTimeStr()} WIB)`)}
                                            </button>
                                        )}
                                    </div>

                                    {/* 5. PROMO & VOUCHER ACCORDION */}
                                    <div className="space-y-2 pt-1">
                                        <div className="text-[11px] uppercase font-bold tracking-wider text-gray-400 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5"><Gift size={14} className="text-[#d4af37]" /> Promo & Voucher</span>
                                            {(appliedReferral || voucherData || selectedDiscount) && (
                                                <span className="text-[10px] text-green-400 font-bold uppercase">1 Promo Aktif</span>
                                            )}
                                        </div>

                                        {/* Accordion 1: Promo Spesial Barbershop (FIRST & EXPANDED) */}
                                        {publicDiscounts.length > 0 && (
                                            <div className="border border-[#222] rounded-xl overflow-hidden bg-[#141414]">
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePromoTab(prev => prev === 'discount' ? 'none' : 'discount')}
                                                    className="w-full p-2.5 text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Tag size={13} className="text-[#d4af37]" /> Promo Spesial Barbershop
                                                    </span>
                                                    {selectedDiscount ? (
                                                        <span className="text-xs text-cyan-400 font-mono flex items-center gap-1 font-bold">
                                                            <Check size={12} /> {selectedDiscount.name}
                                                        </span>
                                                    ) : (
                                                        activePromoTab === 'discount' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                    )}
                                                </button>
                                                {activePromoTab === 'discount' && (
                                                    <div className="p-3 pt-0 border-t border-[#222]/50 space-y-2">
                                                        {publicDiscounts.map(disc => {
                                                            const isSel = selectedDiscount?.id === disc.id;
                                                            return (
                                                                <button
                                                                    key={disc.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isSel) {
                                                                            setSelectedDiscount(null);
                                                                            setProofFile(null);
                                                                        } else {
                                                                            setSelectedDiscount(disc);
                                                                            setVoucherData(null);
                                                                            setAppliedReferral(null);
                                                                        }
                                                                    }}
                                                                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-colors ${isSel ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-[#181818] border-[#2a2a2a] text-gray-300 hover:border-gray-500'}`}
                                                                >
                                                                    <span>{disc.name}</span>
                                                                    <span className="font-mono font-bold text-[#d4af37]">
                                                                        {disc.type === 'percent' ? `${disc.value}% OFF` : formatCurrency(disc.value)}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}

                                                        {selectedDiscount && selectedDiscount.requires_proof && (
                                                            <div className="mt-2 p-2.5 bg-[#181818] rounded-lg border border-[#333]">
                                                                <label className="text-[10px] text-gray-300 block mb-1 font-bold">Unggah Bukti Syarat Promo:</label>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => setProofFile(e.target.files[0])}
                                                                    className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[#d4af37] file:text-black cursor-pointer"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Accordion 2: Referral Code */}
                                        <div className="border border-[#222] rounded-xl overflow-hidden bg-[#141414]">
                                            <button
                                                type="button"
                                                onClick={() => setActivePromoTab(prev => prev === 'referral' ? 'none' : 'referral')}
                                                className="w-full p-2.5 text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Percent size={13} className="text-[#d4af37]" /> Masukkan Kode Referral
                                                </span>
                                                {appliedReferral ? (
                                                    <span className="text-xs text-green-400 font-mono flex items-center gap-1 font-bold">
                                                        <Check size={12} /> {appliedReferral.code}
                                                    </span>
                                                ) : (
                                                    activePromoTab === 'referral' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </button>
                                            {activePromoTab === 'referral' && (
                                                <div className="p-3 pt-0 border-t border-[#222]/50">
                                                    {appliedReferral ? (
                                                        <div className="flex items-center justify-between bg-[#d4af37]/10 p-2 rounded-lg border border-[#d4af37]/30 text-xs">
                                                            <span className="text-gray-200">Referral <strong>{appliedReferral.code}</strong> aktif!</span>
                                                            <button type="button" onClick={removeReferral} className="text-red-400 hover:text-red-300 font-bold text-[11px]">Hapus</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Cth: AUROFANS"
                                                                value={referralInput}
                                                                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                                                                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-xs font-mono uppercase text-white focus:outline-none focus:border-[#d4af37]"
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={referralLoading}
                                                                onClick={() => verifyReferralCode(referralInput)}
                                                                className="px-3.5 py-1.5 bg-[#d4af37] text-black font-bold text-xs rounded-lg hover:bg-[#e5c04b] transition-colors flex items-center gap-1"
                                                            >
                                                                {referralLoading ? <Loader2 size={13} className="animate-spin" /> : 'Terapkan'}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {referralError && <p className="text-red-400 text-[10px] mt-1.5">{referralError}</p>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Accordion 3: Student / Partner OTP Voucher */}
                                        <div className="border border-[#222] rounded-xl overflow-hidden bg-[#141414]">
                                            <button
                                                type="button"
                                                onClick={() => setActivePromoTab(prev => prev === 'voucher' ? 'none' : 'voucher')}
                                                className="w-full p-2.5 text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Award size={13} className="text-[#d4af37]" /> Klaim Voucher Mahasiswa / Mitra
                                                </span>
                                                {voucherData ? (
                                                    <span className="text-xs text-green-400 font-mono flex items-center gap-1 font-bold">
                                                        <Check size={12} /> Terklaim
                                                    </span>
                                                ) : (
                                                    activePromoTab === 'voucher' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </button>
                                            {activePromoTab === 'voucher' && (
                                                <div className="p-3 pt-0 border-t border-[#222]/50">
                                                    {voucherData ? (
                                                        <div className="flex items-center justify-between bg-green-500/10 p-2 rounded-lg border border-green-500/30 text-xs">
                                                            <span className="text-gray-200">Voucher <strong>{voucherData.programId}</strong> aktif!</span>
                                                            <button type="button" onClick={() => { setVoucherData(null); setVoucherClaimKey(k => k + 1); }} className="text-red-400 hover:text-red-300 font-bold text-[11px]">Hapus</button>
                                                        </div>
                                                    ) : (
                                                        <VoucherClaim 
                                                            key={voucherClaimKey}
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
                                            )}
                                        </div>
                                    </div>

                                    {/* 6. RINGKASAN PEMBAYARAN */}
                                    <div className="p-4 rounded-2xl bg-[#141414] border border-[#d4af37]/20 space-y-2 text-xs">
                                        <div className="flex justify-between text-gray-400">
                                            <span>Layanan & Kapster</span>
                                            <span className="text-white font-medium">{formData.service || '-'} • {formData.barber || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Jadwal Kedatangan</span>
                                            <span className="text-white font-medium">{formData.date} • <strong className="text-[#d4af37] font-mono">{formData.time || '-'} WIB</strong></span>
                                        </div>

                                        {calculatedDiscount > 0 && (
                                            <div className="flex justify-between text-emerald-400 font-semibold pt-1">
                                                <span>Potongan Diskon / Promo</span>
                                                <span className="font-mono">-{formatCurrency(calculatedDiscount)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-2 border-t border-[#262626] font-bold text-white">
                                            <span className="text-xs uppercase tracking-wider">Total Pembayaran</span>
                                            <span className="text-base font-mono text-[#d4af37]">{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>

                                    {/* SUBMIT BUTTON */}
                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="gold-button w-full !py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={16} />
                                                <span>Menerbitkan Tiket...</span>
                                            </>
                                        ) : (
                                            <span>Konfirmasi & Ambil Tiket Sekarang ✨</span>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingModal;
