import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    CheckCircle, 
    ArrowLeft, 
    Scissors, 
    Loader2, 
    Search, 
    Tag, 
    Gift, 
    ChevronDown, 
    ChevronUp, 
    Sparkles, 
    Check, 
    Upload, 
    Percent, 
    Award,
    AlertCircle
} from 'lucide-react';
import CircularTimePicker from './CircularTimePicker';
import VoucherClaim from './VoucherClaim';
import { useStoreSettings } from '../utils/useStoreSettings';

// Feature Flag: Set to true if product store / add-ons are enabled in the future
const ENABLE_PRODUCT_STORE = false;

const MobileBooking = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // Step 1: Layanan & Jadwal | Step 2: Data Diri & Konfirmasi
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [formError, setFormError] = useState('');
    const { settings } = useStoreSettings();

    // Service Sort Order ('popular' | 'name' | 'default')
    const [serviceSort, setServiceSort] = useState('popular');

    // Time picker view mode: 'grid' (pill slots) or 'dial' (circular)
    const [pickerMode, setPickerMode] = useState('grid');

    // Loyalty State
    const [userPoints, setUserPoints] = useState(0);
    const [appSettings, setAppSettings] = useState(null);
    const [usePoints, setUsePoints] = useState(false);
    const [voucherData, setVoucherData] = useState(null);
    const [specialMark, setSpecialMark] = useState(null);
    const [publicDiscounts, setPublicDiscounts] = useState([]);
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [voucherClaimKey, setVoucherClaimKey] = useState(0);
    const [proofFile, setProofFile] = useState(null);

    // Referral Code States
    const [referralInput, setReferralInput] = useState('');
    const [appliedReferral, setAppliedReferral] = useState(null);
    const [referralError, setReferralError] = useState('');
    const [referralLoading, setReferralLoading] = useState(false);

    // Promo Section Accordion State ('discount' | 'referral' | 'voucher' | 'none') - Default expanded to 'discount'
    const [activePromoTab, setActivePromoTab] = useState('discount');

    const [formData, setFormData] = useState({
        type: 'service',
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
        time: '',
        addons: []
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
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

    // Auto-apply referral code from URL ?ref=CODE on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const refParam = params.get('ref') || params.get('referral');
        if (refParam) {
            const codeUpper = refParam.trim().toUpperCase();
            setReferralInput(codeUpper);
            verifyReferralCode(codeUpper);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        const endMins = (endH * 60 + endM) - 30; // Last booking starts 30 mins before closing

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
    const availableTimeSlots = React.useMemo(() => {
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

    // Fetch live booked slots for chosen date and barber
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
                setBookedSlots(data.map(b => b.booking_time.substring(0, 5)));
            }
        };

        const fetchData = async () => {
            const [servicesRes, barbersRes, catsRes, discountsRes, prodsRes, bookingsHistoryRes] = await Promise.all([
                supabase.from('services').select('*').order('sort_order', { ascending: true }),
                supabase.from('barbers').select('*').eq('is_active', true),
                supabase.from('categories').select('*').order('name', { ascending: true }),
                supabase.from('discounts').select('*').eq('is_active', true).eq('show_public', true),
                supabase.from('products').select('*').order('sort_order', { ascending: true }),
                supabase.from('bookings').select('service_type')
            ]);

            // Calculate popularity score for each service
            const popularityMap = {};
            (bookingsHistoryRes.data || []).forEach(b => {
                if (!b.service_type) return;
                const st = b.service_type.toLowerCase();
                (servicesRes.data || []).forEach(s => {
                    if (st.includes(s.name.toLowerCase())) {
                        popularityMap[s.id] = (popularityMap[s.id] || 0) + 1;
                    }
                });
            });

            if (servicesRes.data) {
                const enriched = servicesRes.data.map(s => ({
                    ...s,
                    booking_count: popularityMap[s.id] || 0
                }));
                setServices(enriched);

                // Auto-select top popular service if none selected
                if (!formData.service && enriched.length > 0) {
                    const topPopular = [...enriched].sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0))[0];
                    setFormData(prev => ({ ...prev, service: prev.service || topPopular.name }));
                }
            }
            if (barbersRes.data) {
                setBarbers(barbersRes.data);
                if (!formData.barber && barbersRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, barber: prev.barber || barbersRes.data[0].name }));
                }
            }
            if (catsRes.data) setCategories(catsRes.data);
            if (discountsRes.data) setPublicDiscounts(discountsRes.data);
            if (prodsRes.data) setProducts(prodsRes.data);
        };

        const fetchLoyaltySettings = async () => {
            const { data: appSet } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
            if (appSet) setAppSettings(appSet);

            if (formData.phone) {
                const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
                if (cleanPhone.length >= 9) {
                    const { data: customer } = await supabase.from('customers')
                        .select('points, special_mark')
                        .eq('phone_number', cleanPhone)
                        .maybeSingle();
                    if (customer) {
                        setUserPoints(customer.points || 0);
                        setSpecialMark(customer.special_mark || null);
                    } else {
                        setUserPoints(0);
                        setSpecialMark(null);
                    }
                } else {
                    setUserPoints(0);
                    setSpecialMark(null);
                }
            } else {
                setUserPoints(0);
                setSpecialMark(null);
            }
        };

        fetchBookings();
        fetchData();
        fetchLoyaltySettings();
    }, [formData.date, formData.barber, formData.phone]);

    // Sync step changes with browser history for a smooth native feel
    useEffect(() => {
        if (!window.history.state || window.history.state.step === undefined) {
            window.history.replaceState({ step: 1 }, '');
        }

        const handlePopState = (e) => {
            if (e.state && e.state.step === 'success') {
                navigate('/');
            } else if (e.state && e.state.step !== undefined) {
                setStep(e.state.step);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [navigate]);

    useEffect(() => {
        if (successId) {
            window.history.replaceState({ step: 'success' }, '');
            return;
        }

        const historyStep = window.history.state?.step;
        if (historyStep !== step && historyStep !== 'success') {
            window.history.pushState({ step }, '');
        }
    }, [step, successId]);

    // Validation for Indonesian Phone number (08 / 628)
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

    const handleVoucherApplied = (data) => {
        if (appliedReferral) return; // Mutual exclusion
        setVoucherData(data);
        setSelectedDiscount(null);
        setProofFile(null);
    };

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
                return;
            }
            if (data.max_uses && data.current_uses >= data.max_uses) {
                setReferralError('Batas penggunaan kode referral ini telah habis');
                return;
            }
            // Mutual exclusion: clear other discounts
            setVoucherData(null);
            setSelectedDiscount(null);
            setProofFile(null);
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

    // Sort services according to selected user preference ('popular' | 'name' | 'default')
    const sortedServices = React.useMemo(() => {
        const list = [...services];
        if (serviceSort === 'popular') {
            return list.sort((a, b) => {
                const diff = (b.booking_count || 0) - (a.booking_count || 0);
                if (diff !== 0) return diff;
                return (a.sort_order ?? 999) - (b.sort_order ?? 999);
            });
        } else if (serviceSort === 'name') {
            return list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
        } else { // 'default' (kustom admin sort_order)
            return list.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        }
    }, [services, serviceSort]);

    // Calculate current chosen service object and pricing
    const chosenServiceObj = services.find(s => s.name === formData.service);
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
        if (selectedDiscount.type === 'percent') {
            calculatedDiscount = Math.floor((subtotal * selectedDiscount.value) / 100);
        } else {
            calculatedDiscount = selectedDiscount.value;
        }
    }

    const grandTotal = Math.max(0, subtotal - calculatedDiscount);

    const handleNext = () => {
        setFormError('');
        if (!formData.service) {
            setFormError('Silakan pilih layanan cukur.');
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
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(1);
        } else {
            navigate('/');
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setFormError('');

        if (!formData.name.trim()) {
            setFormError('Silakan isi nama lengkap.');
            return;
        }

        if (!validatePhone(formData.phone)) {
            setFormError('Nomor HP tidak valid. Gunakan format Indonesia yang dimulai dengan 08 atau 628.');
            return;
        }

        if (isSlotBooked(formData.time)) {
            setFormError('Maaf, slot waktu ini baru saja dipesan pelanggan lain. Silakan kembali ke Langkah 1 dan pilih jam lain.');
            return;
        }

        setLoading(true);

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

            // Check double-booking slot in database before writing
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
                setFormError('Maaf, slot ini baru saja diambil pelanggan lain. Silakan pilih waktu lain.');
                setLoading(false);
                return;
            }

            const { data: newBooking, error } = await supabase
                .from('bookings')
                .insert([{
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
                }])
                .select();

            if (error) throw error;

            if (!newBooking || newBooking.length === 0) {
                setFormError('Booking gagal. Anda terdeteksi memiliki lebih dari 2 booking aktif dalam 7 hari terakhir yang tidak selesai.');
                setLoading(false);
                return;
            }

            // Log referral commission if applied
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

            // Save user info for returning bookings
            localStorage.setItem('auro_name', formData.name.trim());
            localStorage.setItem('auro_phone', formData.phone.trim());

            setSuccessId(newBooking[0].id);
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError(error.message || 'Terjadi kesalahan saat memproses booking. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    // Quick Date change helpers
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

    // ==========================================
    // RENDER STEP 1: LAYANAN, CAPSTER & JADWAL
    // ==========================================
    const renderStep1 = () => (
        <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6 w-full"
        >
            {/* Step Header */}
            <div className="text-center">
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#d4af37] font-bold">Langkah 1 dari 2</span>
                <h2 className="serif text-2xl sm:text-3xl font-bold mt-1 text-white">Pilih Layanan & Jadwal</h2>
                <p className="text-xs text-[#a1a1a1] mt-1">Tentukan model potongan, capster idola, dan waktu kunjungan lo.</p>
            </div>

            {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-400 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{formError}</span>
                </div>
            )}

            {/* 1. Pilih Layanan (Scrollable Box with User Sort Controls) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                        <Scissors size={14} /> 1. Menu Layanan
                    </label>

                    {/* Interactive Sort Options */}
                    <div className="flex items-center gap-1 bg-[#161616] p-0.5 rounded-lg border border-[#2a2a2a]">
                        <button
                            type="button"
                            onClick={() => setServiceSort('popular')}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                                serviceSort === 'popular'
                                    ? 'bg-[#d4af37] text-black shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            🔥 Populer
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceSort('name')}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                                serviceSort === 'name'
                                    ? 'bg-[#d4af37] text-black shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            🔤 Nama
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceSort('default')}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                                serviceSort === 'default'
                                    ? 'bg-[#d4af37] text-black shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            ⚙️ Default
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5">
                    <span>{sortedServices.length} Pilihan Layanan</span>
                    <span>Scroll ke bawah untuk melihat lainnya ↕</span>
                </div>

                <div className="max-h-[330px] overflow-y-auto pr-1.5 space-y-2 rounded-xl border border-[#222]/80 bg-[#0e0e0e]/50 p-1.5">
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
                                    w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all duration-200 relative
                                    ${isSelected 
                                        ? 'bg-[#d4af37]/15 border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-[#d4af37]' 
                                        : 'bg-[#141414] border-[#292929] hover:border-[#d4af37]/40 text-gray-300'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-[#d4af37] text-black' : 'bg-[#1f1f1f] text-[#d4af37]'}`}>
                                        {isTopPopular ? '🔥' : '✂️'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                {s.name}
                                            </span>
                                            {isTopPopular && (
                                                <span className="text-[9px] bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                                    Top {idx + 1}
                                                </span>
                                            )}
                                        </div>
                                        {s.description && (
                                            <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 max-w-[170px] sm:max-w-[240px]">
                                                {s.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 pl-2">
                                    <span className="font-mono font-bold text-xs sm:text-sm text-[#d4af37]">
                                        {formatCurrency(s.price)}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Pilih Kapster (Avatar Cards) */}
            <div className="space-y-2.5">
                <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <User size={14} /> 2. Pilih Kapster
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
                                    p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-200
                                    ${isSelected 
                                        ? 'bg-[#d4af37]/15 border-[#d4af37] ring-1 ring-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                                        : 'bg-[#141414] border-[#d4af37]/15 hover:border-[#d4af37]/40 text-gray-300'
                                    }
                                `}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold ${isSelected ? 'bg-[#d4af37] text-black' : 'bg-[#222] text-[#d4af37] border border-[#d4af37]/30'}`}>
                                    {initials}
                                </div>
                                <span className="text-xs font-bold text-center truncate w-full">{b.name}</span>
                                <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-semibold">Ready</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Pilih Tanggal (Quick Pills + Custom Date Picker) */}
            <div className="space-y-2.5">
                <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <Calendar size={14} /> 3. Tanggal Booking
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, date: todayStr, time: '' })}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${formData.date === todayStr ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#141414] text-gray-300 border-[#333] hover:border-[#d4af37]/50'}`}
                    >
                        Hari Ini
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, date: tomorrowStr, time: '' })}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${formData.date === tomorrowStr ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#141414] text-gray-300 border-[#333] hover:border-[#d4af37]/50'}`}
                    >
                        Besok
                    </button>
                </div>
                <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-3.5 text-[#d4af37]" />
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
                        className="w-full bg-[#141414] border border-[#d4af37]/20 rounded-xl p-3 pl-10 focus:outline-none focus:border-[#d4af37] text-xs text-white"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            </div>

            {/* 4. Pilih Slot Waktu */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-[#d4af37] flex items-center gap-1.5">
                        <Clock size={14} /> 4. Jam Kedatangan
                    </label>
                    <button
                        type="button"
                        onClick={() => setPickerMode(prev => prev === 'grid' ? 'dial' : 'grid')}
                        className="text-[10px] uppercase tracking-wider text-gray-400 hover:text-[#d4af37] underline"
                    >
                        {pickerMode === 'grid' ? 'Mode Dial Jam' : 'Mode Grid Slot'}
                    </button>
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
                            w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold border flex items-center justify-center gap-2 transition-all
                            ${formData.barber && !isNowAvailable() 
                                ? 'bg-[#181818] border-[#222] text-[#444] cursor-not-allowed' 
                                : 'bg-[#d4af37]/10 border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/20'}
                        `}
                    >
                        <Sparkles size={14} />
                        {!formData.barber 
                            ? `Cek Kursi Walk-in Sekarang (${getNowTimeStr()} WIB)...` 
                            : (!isNowAvailable() ? 'Kursi Sedang Penuh Saat Ini' : `⚡ Datang Langsung Sekarang (${getNowTimeStr()} WIB)`)}
                    </button>
                )}

                {pickerMode === 'grid' ? (
                    <div className="grid grid-cols-4 gap-2 pt-1">
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
                                        py-2.5 rounded-lg font-mono text-xs font-bold transition-all duration-150 border
                                        ${isSelected 
                                            ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-[1.02]' 
                                            : isBooked || isPast
                                                ? 'bg-[#121212] border-[#1a1a1a] text-[#444] cursor-not-allowed line-through'
                                                : 'bg-[#161616] border-[#333] text-gray-200 hover:border-[#d4af37]/60 hover:bg-[#1f1f1f]'
                                        }
                                    `}
                                >
                                    {slot}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="pt-2">
                        <CircularTimePicker
                            value={formData.time}
                            onChange={(time) => setFormData({ ...formData, time })}
                            bookedSlots={bookedSlots}
                            interval={5}
                            startTime={pickerStartTime}
                            endTime={pickerEndTime}
                        />
                    </div>
                )}
            </div>

            {/* Primary Action Button */}
            <button
                type="button"
                onClick={handleNext}
                className="gold-button w-full !py-4 text-sm font-bold shadow-lg mt-2 flex items-center justify-center gap-2"
            >
                Lanjut ke Data Diri & Konfirmasi ➔
            </button>

            {/* Check Order Link */}
            <Link
                to="/check"
                className="py-3 px-4 bg-[#141414] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors text-xs uppercase tracking-widest rounded-xl text-center text-gray-400 hover:text-[#d4af37] flex justify-center items-center gap-2 w-full font-bold"
            >
                <Search size={14} /> Sudah pernah booking? Cek Status Tiket
            </Link>
        </motion.div>
    );

    // ==========================================
    // RENDER STEP 2: DATA DIRI & PROMO
    // ==========================================
    const renderStep2 = () => (
        <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-5 w-full"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs text-[#a1a1a1] hover:text-[#d4af37] flex items-center gap-1.5 font-bold uppercase tracking-wider"
                >
                    <ArrowLeft size={16} /> Ubah Jadwal
                </button>
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#d4af37] font-bold">Langkah 2 dari 2</span>
            </div>

            <div className="text-center -mt-1">
                <h2 className="serif text-2xl sm:text-3xl font-bold text-white">Data Diri & Konfirmasi</h2>
                <p className="text-xs text-[#a1a1a1] mt-0.5">Masukkan nama & no HP untuk menerbitkan tiket antrean lo.</p>
            </div>

            {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-400 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{formError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input Nama Lengkap */}
                <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-gray-300 ml-1">
                        Nama Lengkap
                    </label>
                    <div className="relative">
                        <User size={16} className="absolute left-3.5 top-3.5 text-[#d4af37]" />
                        <input
                            required
                            type="text"
                            placeholder="Cth: Budi Wijaya"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded-xl p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors text-sm text-white placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Input Nomor HP */}
                <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-bold tracking-wider text-gray-300 ml-1">
                        Nomor HP / WhatsApp
                    </label>
                    <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-3.5 text-[#d4af37]" />
                        <input
                            required
                            type="tel"
                            placeholder="08... atau 628..."
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded-xl p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors text-sm text-white font-mono tracking-wider placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Special Customer Badge */}
                {specialMark && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-gradient-to-r from-[#d4af37]/20 via-[#d4af37]/10 to-transparent border border-[#d4af37]/40 rounded-xl flex items-center gap-3"
                    >
                        <span className="text-xl">👑</span>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Pelanggan Spesial</p>
                            <p className="text-xs font-extrabold text-[#d4af37] uppercase tracking-wide">{specialMark}</p>
                        </div>
                    </motion.div>
                )}

                {/* Booking Summary Card (Invoice Format) */}
                <div className="glass-card p-4 rounded-xl border border-[#d4af37]/20 bg-[#121212] space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                        <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">Ringkasan Reservasi</span>
                        <span className="text-emerald-400 font-bold font-mono text-[11px]">✓ Slot Tersedia</span>
                    </div>

                    <div className="flex justify-between text-gray-300">
                        <span>Layanan</span>
                        <strong className="text-white">{formData.service}</strong>
                    </div>

                    <div className="flex justify-between text-gray-300">
                        <span>Kapster</span>
                        <span className="text-white font-medium">{formData.barber}</span>
                    </div>

                    <div className="flex justify-between text-gray-300">
                        <span>Jadwal</span>
                        <span className="text-white font-medium">{formData.date} • <strong className="text-[#d4af37] font-mono">{formData.time} WIB</strong></span>
                    </div>

                    <div className="flex justify-between text-gray-300 pt-1">
                        <span>Tarif Layanan</span>
                        <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>

                    {/* Applied Discounts display */}
                    {appliedReferral && (
                        <div className="flex justify-between text-[#d4af37] font-semibold">
                            <span>🤝 Kode Referral ({appliedReferral.code})</span>
                            <span className="font-mono">-{formatCurrency(referralDiscVal)}</span>
                        </div>
                    )}

                    {voucherData && (
                        <div className="flex justify-between text-green-400 font-semibold">
                            <span>🎓 Voucher ({voucherData.programId})</span>
                            <span className="font-mono">-{formatCurrency(voucherData.discountValue)}</span>
                        </div>
                    )}

                    {selectedDiscount && (
                        <div className="flex justify-between text-cyan-400 font-semibold">
                            <span>🎟️ Promo ({selectedDiscount.name})</span>
                            <span className="font-mono">-{formatCurrency(calculatedDiscount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-sm font-extrabold border-t border-[#333] pt-2.5 text-white">
                        <span>Total Pembayaran</span>
                        <span className="text-base font-mono text-[#d4af37]">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>

                {/* Grouped Promo & Voucher Accordion */}
                <div className="space-y-2 pt-1">
                    <div className="text-[11px] uppercase font-bold tracking-wider text-gray-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Gift size={14} className="text-[#d4af37]" /> Punya Promo / Voucher?</span>
                        {(appliedReferral || voucherData || selectedDiscount) && (
                            <span className="text-[10px] text-green-400 font-bold uppercase">1 Promo Aktif</span>
                        )}
                    </div>

                    {/* Accordion 1: Promo Spesial Barbershop (FIRST & EXPANDED BY DEFAULT) */}
                    {publicDiscounts.length > 0 && (
                        <div className="border border-[#222] rounded-xl overflow-hidden bg-[#141414]">
                            <button
                                type="button"
                                onClick={() => setActivePromoTab(prev => prev === 'discount' ? 'none' : 'discount')}
                                className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Tag size={14} className="text-[#d4af37]" /> Promo Spesial Barbershop
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
                                                className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-colors ${isSel ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:border-gray-500'}`}
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
                                            <label className="text-[11px] text-gray-300 block mb-1 font-bold">Unggah Bukti Syarat Promo:</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setProofFile(e.target.files[0])}
                                                className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#d4af37] file:text-black"
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
                            className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Percent size={14} className="text-[#d4af37]" /> Masukkan Kode Referral
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
                                    <div className="flex items-center justify-between bg-[#d4af37]/10 p-2.5 rounded-lg border border-[#d4af37]/30 text-xs">
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
                                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-[#d4af37]"
                                        />
                                        <button
                                            type="button"
                                            disabled={referralLoading}
                                            onClick={() => verifyReferralCode(referralInput)}
                                            className="px-4 py-2 bg-[#d4af37] text-black font-bold text-xs rounded-lg hover:bg-[#e5c04b] transition-colors flex items-center gap-1"
                                        >
                                            {referralLoading ? <Loader2 size={14} className="animate-spin" /> : 'Terapkan'}
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
                            className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-gray-300 hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Award size={14} className="text-[#d4af37]" /> Klaim Voucher Mahasiswa / Mitra
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
                                    <div className="flex items-center justify-between bg-green-500/10 p-2.5 rounded-lg border border-green-500/30 text-xs">
                                        <span className="text-gray-200">Voucher <strong>{voucherData.programId}</strong> aktif!</span>
                                        <button type="button" onClick={() => { setVoucherData(null); setVoucherClaimKey(k => k + 1); }} className="text-red-400 hover:text-red-300 font-bold text-[11px]">Hapus</button>
                                    </div>
                                ) : (
                                    <VoucherClaim 
                                        key={voucherClaimKey}
                                        onVoucherApplied={handleVoucherApplied} 
                                        initialPhone={formData.phone} 
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-[11px] text-gray-400 text-center pt-2">
                    🔒 Data aman. Tiket antrean langsung diterbitkan setelah konfirmasi.
                </div>

                {/* Final Submit CTA Button */}
                <button
                    disabled={loading}
                    type="submit"
                    className="gold-button w-full !py-4 text-sm font-bold shadow-2xl flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Menerbitkan Tiket...</span>
                        </>
                    ) : (
                        <span>Konfirmasi & Ambil Tiket Sekarang ✨</span>
                    )}
                </button>
            </form>
        </motion.div>
    );

    // ==========================================
    // RENDER SUCCESS SCREEN
    // ==========================================
    const renderSuccess = () => (
        <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-6 w-full"
        >
            <div className="w-20 h-20 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] mb-5 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                <CheckCircle size={48} />
            </div>
            <h3 className="serif text-3xl font-bold mb-2 text-white">Booking Berhasil! 🔥</h3>
            <p className="text-xs text-[#a1a1a1] max-w-xs mb-8">
                Slot jadwal lo di Auro Barbershop sudah tersimpan secara resmi.
            </p>

            <button
                onClick={() => navigate(`/queue/${successId}`)}
                className="gold-button w-full !py-4 text-sm font-bold shadow-xl mb-3 flex items-center justify-center gap-2"
            >
                <span>Buka Monitor Antrean Live ➔</span>
            </button>

            <button
                onClick={() => navigate('/')}
                className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
            >
                Kembali ke Beranda
            </button>
        </motion.div>
    );

    return (
        <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col font-sans relative overflow-x-hidden">
            {/* Header with iOS Notch Safe Padding */}
            <header className="sticky top-0 z-20 w-full border-b border-[#d4af37]/10 bg-[#121212]/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
                <div className="flex items-center justify-between px-4 py-3 w-full max-w-md mx-auto">
                    {!successId ? (
                        <button 
                            type="button"
                            onClick={handleBack} 
                            className="text-[#a1a1a1] hover:text-[#d4af37] transition flex-shrink-0 p-1.5 active:scale-95"
                            aria-label="Kembali"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    ) : (
                        <div className="w-6" />
                    )}
                    <div className="flex-1 flex justify-center">
                        <img src={`${import.meta.env.BASE_URL}auro_logo.webp?v=3`} alt="Auro Logo" className="h-9 object-contain" />
                    </div>
                    <div className="w-6 flex-shrink-0"></div>
                </div>
            </header>

            {/* Main Container with iOS Bottom Bar Safe Padding */}
            <main className="flex-1 flex flex-col items-center px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,16px)+32px)] w-full max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {successId ? renderSuccess() : (
                        step === 1 ? renderStep1() : renderStep2()
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default MobileBooking;
