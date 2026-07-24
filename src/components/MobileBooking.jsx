import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Calendar, Clock, User, Phone, CheckCircle, ArrowLeft, Scissors, Coffee, Loader2, Search, Package, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import CircularTimePicker from './CircularTimePicker';
import VoucherClaim from './VoucherClaim';
import { useStoreSettings } from '../utils/useStoreSettings';

const MobileBooking = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState(null);
    const [formError, setFormError] = useState('');
    const { settings } = useStoreSettings();

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

    const handleVoucherApplied = (data) => {
        if (appliedReferral) return; // Block voucher if referral is applied
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

    const [formData, setFormData] = useState({
        type: 'service', // 'service' or 'product' (for future)
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
        time: '',
        addons: []
    });

    // Time generation block removed since CircularTimePicker handles its own array.
    // parseTime & isSlotBooked now live in both places, or we keep them here for backend validation.
    const parseTime = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
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

        const fetchData = async () => {
            const [productsRes, servicesRes, barbersRes, catsRes, discountsRes] = await Promise.all([
                supabase.from('products').select('*').order('sort_order', { ascending: true }),
                supabase.from('services').select('*').order('sort_order', { ascending: true }),
                supabase.from('barbers').select('*').eq('is_active', true),
                supabase.from('categories').select('*').order('name', { ascending: true }),
                supabase.from('discounts').select('*').eq('is_active', true).eq('show_public', true)
            ]);
            if (productsRes.data) setProducts(productsRes.data);
            if (servicesRes.data) setServices(servicesRes.data);
            if (barbersRes.data) setBarbers(barbersRes.data);
            if (catsRes.data) setCategories(catsRes.data);
            if (discountsRes.data) setPublicDiscounts(discountsRes.data);
        };

        const fetchLoyaltySettings = async () => {
            const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
            if (settings) setAppSettings(settings);

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
    }, [formData.date, formData.barber, formData.type, formData.phone]);

    // Sync step changes with browser history
    useEffect(() => {
        // Initialize history state on mount
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
            // Replace history state so they can't go back to checkout form steps
            window.history.replaceState({ step: 'success' }, '');
            return;
        }

        // Only push state if we are moving to a step that is different from current history state
        const historyStep = window.history.state?.step;
        if (historyStep !== step && historyStep !== 'success') {
            window.history.pushState({ step }, '');
        }
    }, [step, successId]);

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
        if (step === 1 && formData.type === 'product') {
            setStep(3); // Skip Date/Time/Barber if only buying products
            return;
        }
        if (step === 2) {
            if (formData.type === 'service') {
                if (!formData.service || !formData.barber || !formData.date || !formData.time) {
                    setFormError('Please select all required options to proceed.');
                    return;
                }
                const selectedBarberObj = barbers.find(b => b.name === formData.barber);
                const maxBookings = selectedBarberObj?.max_daily_bookings ?? 8;
                if (bookedSlots.length >= maxBookings) {
                    setFormError(`Mohon maaf, capster ${formData.barber} sudah penuh (Maks. ${maxBookings} booking) untuk tanggal ini. Silakan pilih tanggal atau capster lain.`);
                    return;
                }
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step > 1) {
            window.history.back();
        } else {
            navigate('/');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!validatePhone(formData.phone)) {
            setFormError('Please enter a valid phone number starting with 08 or 628.');
            return;
        }

        if (formData.type === 'service') {
            const selectedBarberObj = barbers.find(b => b.name === formData.barber);
            const maxBookings = selectedBarberObj?.max_daily_bookings ?? 8;
            if (bookedSlots.length >= maxBookings) {
                setFormError(`Mohon maaf, capster ${formData.barber} sudah penuh (Maks. ${maxBookings} booking) untuk tanggal ini. Silakan pilih tanggal atau capster lain.`);
                setLoading(false);
                return;
            }
        }

        if (formData.type === 'service' && isSlotBooked(formData.time)) {
            setFormError('This slot was just taken. Please choose another time.');
            setLoading(false);
            return;
        }

        setLoading(true);

        // --- Calculate Total Price ---
        let basePrice = 0;
        let pointsToDeduct = 0;
        let discountValue = 0;
        let referralDiscVal = 0;
        let referralCommVal = 0;
        let chosenServiceObj = null;
        let redeemedItemName = '';

        if (formData.type === 'service' && formData.service) {
            chosenServiceObj = services.find(s => s.name === formData.service);
            if (chosenServiceObj) basePrice = chosenServiceObj.price;
        }

        let addonPrice = 0;
        const chosenProducts = [];
        formData.addons.forEach(addonName => {
            const product = products.find(p => p.name === addonName);
            if (product) {
                addonPrice += product.price;
                chosenProducts.push(product);
            }
        });

        // Find best item to redeem
        if (usePoints && userPoints > 0 && !appliedReferral) {
            let bestRedeemableItem = null;
            let highestPrice = -1;

            if (formData.type === 'service' && chosenServiceObj?.is_redeemable && userPoints >= chosenServiceObj.points_required) {
                bestRedeemableItem = chosenServiceObj;
                highestPrice = chosenServiceObj.price;
            }

            chosenProducts.forEach(p => {
                if (p.is_redeemable && userPoints >= p.points_required && p.price > highestPrice) {
                    bestRedeemableItem = p;
                    highestPrice = p.price;
                }
            });

            if (bestRedeemableItem) {
                discountValue += bestRedeemableItem.price;
                pointsToDeduct = bestRedeemableItem.points_required;
                redeemedItemName = bestRedeemableItem.name;
            }
        }

        // Referral discount takes full precedence (no stacking)
        if (appliedReferral) {
            if (appliedReferral.discount_type === 'percent') {
                referralDiscVal = Math.floor(((basePrice + addonPrice) * appliedReferral.discount_value) / 100);
            } else {
                referralDiscVal = appliedReferral.discount_value;
            }
            if (appliedReferral.commission_type === 'percent') {
                referralCommVal = Math.floor(((basePrice + addonPrice) * appliedReferral.commission_value) / 100);
            } else {
                referralCommVal = appliedReferral.commission_value;
            }
            discountValue = referralDiscVal;
        } else if (voucherData) {
            discountValue += voucherData.discountValue;
        }

        let grandTotal = (basePrice + addonPrice) - discountValue;
        if (grandTotal < 0) grandTotal = 0;

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
                    setFormError('Maaf, slot ini baru saja diambil. Silakan pilih waktu lain.');
                    setLoading(false);
                    return;
                }

                const finalService = formData.addons?.length > 0
                    ? `${formData.service} (+ ${formData.addons.join(' & ')})`
                    : formData.service;

                const { data: newBooking, error } = await supabase
                    .from('bookings')
                    .insert([{
                        customer_name: formData.name,
                        phone_number: formData.phone,
                        service_type: finalService,
                        barber_name: formData.barber,
                        booking_date: formData.date,
                        booking_time: formData.time,
                        status: 'pending',
                        total_price: grandTotal,
                        voucher_discount: appliedReferral ? referralDiscVal : (voucherData ? voucherData.discountValue : 0),
                        voucher_program: appliedReferral ? `REF:${appliedReferral.code}` : (voucherData ? voucherData.programId : null),
                        proof_url: uploadedUrl,
                        discount_status: discountStatus,
                        referral_code: appliedReferral ? appliedReferral.code : null,
                        referral_discount: referralDiscVal,
                        referral_commission: referralCommVal
                    }])
                    .select();

                if (error) throw error;

                if (!newBooking || newBooking.length === 0) {
                    setFormError('Booking gagal. Lo terdeteksi punya lebih dari 2 booking aktif dalam 7 hari terakhir yang gak selesai. Nomor lo otomatis di-blacklist.');
                    setLoading(false);
                    return;
                }

                // Log referral commission
                if (appliedReferral) {
                    try {
                        await supabase.from('referral_commissions').insert([{
                            partner_id: appliedReferral.id,
                            code: appliedReferral.code,
                            booking_id: newBooking[0].id,
                            customer_name: formData.name,
                            customer_phone: formData.phone,
                            order_amount: basePrice + addonPrice,
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

                // Save user info for future bookings
                localStorage.setItem('auro_name', formData.name);
                localStorage.setItem('auro_phone', formData.phone);

                setSuccessId(newBooking[0].id);
            } else {
                // Product-only purchase
                if (formData.addons.length === 0) {
                    setFormError('Silakan pilih minimal satu produk dari toko.');
                    setLoading(false);
                    return;
                }

                const finalOrder = `Shop Purchase: ${formData.addons.join(', ')}`;

                const { data: newBooking, error } = await supabase
                    .from('bookings')
                    .insert([{
                        customer_name: formData.name,
                        phone_number: formData.phone,
                        service_type: finalOrder,
                        barber_name: 'Store Pickup',
                        booking_date: new Date().toISOString().split('T')[0],
                        booking_time: getNowTimeStr(),
                        status: 'pending',
                        total_price: grandTotal,
                        proof_url: uploadedUrl,
                        discount_status: discountStatus
                    }])
                    .select();

                if (error) throw error;

                if (!newBooking || newBooking.length === 0) {
                    setFormError('Booking gagal. Lo terdeteksi punya lebih dari 2 booking aktif dalam 7 hari terakhir yang gak selesai. Nomor lo otomatis di-blacklist.');
                    setLoading(false);
                    return;
                }

                localStorage.setItem('auro_phone', formData.phone);

                // Deduct points if used
                if (usePoints && pointsToDeduct > 0) {
                    await supabase.from('customers').update({ points: userPoints - pointsToDeduct }).eq('phone_number', formData.phone);
                }
                // 5. Record Point Transaction (only if points earned)
                if (pointsEarned > 0) {
                    await supabase.from('point_transactions').insert([{
                        phone_number: booking.phone_number,
                        amount: pointsEarned,
                        description: `Points from booking #${booking.id.split('-')[0]} (${booking.service_type})`
                    }]);
                }

                // 6. Mark referral commission as 'verified' if this booking used a referral
                if (booking.referral_code) {
                    try {
                        await supabase.from('referral_commissions')
                            .update({ status: 'verified' })
                            .eq('booking_id', booking.id)
                            .eq('status', 'pending');
                    } catch (refErr) {
                        console.error('Failed to verify referral commission:', refErr);
                    }
                }

                setSuccessId(newBooking[0].id);
            }
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError(error.message || 'Failed to book. Please try again.');
        } finally {
            if (!formError && formData.type === 'service') setLoading(false);
        }
    };

    // --- RENDER HELPERS ---

    const renderStep1TypeSelection = () => (
        <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4 w-full"
        >
            <h2 className="serif text-3xl font-bold mb-6 text-center">Apa yang Anda butuhkan?</h2>

            <button
                onClick={() => { setFormData({ ...formData, type: 'service' }); handleNext(); }}
                className="glass-card p-6 flex flex-col items-center justify-center gap-4 hover:border-[#d4af37]/50 transition-all group"
            >
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scissors size={28} className="text-[#d4af37]" />
                </div>
                <h3 className="font-bold text-lg uppercase tracking-widest text-[#d4af37]">Layanan Cukur</h3>
                <p className="text-xs text-[#a1a1a1] uppercase tracking-wider text-center">Booking dengan capster Auro</p>
            </button>

            <button
                onClick={() => { setFormData({ ...formData, type: 'product' }); setStep(3); }}
                className="glass-card p-6 flex flex-col items-center justify-center gap-4 hover:border-[#d4af37]/50 transition-all group w-full"
            >
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Coffee size={28} className="text-[#d4af37]" />
                </div>
                <h3 className="font-bold text-lg uppercase tracking-widest text-[#d4af37]">Toko</h3>
                <p className="text-xs text-[#a1a1a1] uppercase tracking-wider text-center">Beli hair product terkeren</p>
            </button>

            <Link
                to="/check"
                className="mt-4 py-4 px-6 bg-[#141414] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded-lg text-center text-[#d4af37] flex justify-center items-center gap-2 w-full shadow-lg font-bold"
            >
                <Search size={18} /> Cek Status Booking
            </Link>
        </motion.div>
    );

    const renderStep2Details = () => {
        const selectedBarberObj = barbers.find(b => b.name === formData.barber);
        const maxBookings = selectedBarberObj?.max_daily_bookings ?? 8;
        const isLimitReached = formData.barber && bookedSlots.length >= maxBookings;

        return (
            <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5 w-full"
        >
            <h2 className="serif text-3xl font-bold mb-2 text-center">Pilih Hari & Waktu</h2>
            {formError && <p className="text-red-500 text-xs text-center border border-red-500/30 p-2 rounded bg-red-500/10 mb-2">{formError}</p>}

            <div className="space-y-4">
                <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                    <input
                        required
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors text-sm text-white"
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

                <select
                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors appearance-none"
                    value={formData.barber}
                    onChange={(e) => setFormData({ ...formData, barber: e.target.value })}
                >
                    <option value="" disabled>Pilih Kapster</option>
                    {barbers.map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
                </select>
                {formData.barber && isLimitReached && (
                    <p className="text-red-500 text-xs mt-2 border border-red-500/30 p-2 rounded bg-red-500/10">
                        ⚠️ Capster {formData.barber} sudah penuh hari ini (Maks. {maxBookings} booking). Silakan pilih tanggal atau capster lain.
                    </p>
                )}

                <select
                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors appearance-none"
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                >
                    <option value="" disabled>Pilih Layanan</option>
                    {services.map(s => <option key={s.id} value={s.name}>{s.name} - Rp {s.price.toLocaleString('id-ID')}</option>)}
                </select>

                {formData.date === new Date().toISOString().split('T')[0] && (
                    <div className="mt-6 mb-2">
                        <p className="text-xs uppercase tracking-widest text-[#a1a1a1] mb-2">Walk-In (Datang Langsung)</p>
                        <button
                            onClick={() => {
                                if (!formData.barber) {
                                    setFormError('Pilih Kapster terlebih dahulu untuk melihat ketersediaan Walk-in.');
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
                                    'bg-[#141414] border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10'}
                            `}
                        >
                            <Clock size={16} />
                            {!formData.barber ? `Cek Walk-In untuk ${getNowTimeStr()}...` : (!isNowAvailable() ? 'Penuh (Kursi Sedang Digunakan)' : `Pesan Sekarang (${getNowTimeStr()})`)}
                        </button>
                    </div>
                )}

                <div className="relative z-50">
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

            <button 
                disabled={isLimitReached} 
                onClick={handleNext} 
                className={`gold-button w-full mt-6 ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Lanjut ke Detail
            </button>
            <Link
                to="/check"
                className="mt-4 py-4 px-6 bg-[#141414] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded-lg text-center text-[#d4af37] flex justify-center items-center gap-2 w-full shadow-lg font-bold"
            >
                <Search size={18} /> Cek Status Booking
            </Link>
        </motion.div>
        );
    };

    const toggleAddon = (item) => {
        setFormData(prev => {
            const current = prev.addons || [];
            if (current.includes(item)) {
                return { ...prev, addons: current.filter(a => a !== item) };
            } else {
                return { ...prev, addons: [...current, item] };
            }
        });
    };

    const renderStep3Addons = () => (
        <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5 w-full"
        >
            <h2 className="serif text-3xl font-bold mb-2 text-center">
                {formData.type === 'service' ? 'Add-on Hair Product' : 'Toko Auro'}
            </h2>
            <p className="text-[#a1a1a1] text-center text-sm mb-4">
                {formData.type === 'service'
                    ? 'Mau sekalian nambahin produk perawatan rambut biar rambut lo makin badai?'
                    : 'Pilih hair product premium buat lo bawa pulang.'}
            </p>

            <div className="flex flex-col gap-4">
                {/* Category Filter */}
                {categories.length > 0 && (
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide no-scrollbar">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all whitespace-nowrap border ${!activeCategory ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-transparent text-[#a1a1a1] border-[#333] hover:border-[#555]'}`}
                        >
                            Semua
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all whitespace-nowrap border ${activeCategory === cat.id ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-transparent text-[#a1a1a1] border-[#333] hover:border-[#555]'}`}
                                style={activeCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    {products.filter(p => !activeCategory || p.category_id === activeCategory).length === 0 ? (
                        <p className="text-center text-[#555] text-xs uppercase tracking-widest py-8 border border-[#333] rounded border-dashed flex flex-col items-center gap-3">
                            <Tag size={24} className="opacity-20" />
                            Belum ada stok produk tersedia.
                        </p>
                    ) : products.filter(p => !activeCategory || p.category_id === activeCategory).map((product) => {
                        const isSelected = (formData.addons || []).includes(product.name);
                        const formattedPrice = new Intl.NumberFormat('id-ID', {
                            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
                        }).format(product.price);

                        return (
                            <button
                                key={product.id}
                                onClick={() => toggleAddon(product.name)}
                                className={`w-full p-4 rounded border transition-all flex items-center justify-between group
                                    ${isSelected ? 'bg-[#d4af37]/10 border-[#d4af37] text-white' : 'bg-[#141414] border-[#d4af37]/20 text-[#a1a1a1] hover:border-[#d4af37]/50'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 flex-shrink-0 rounded flex items-center justify-center overflow-hidden ${isSelected ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#1a1a1a] text-[#555] border-[#333] border'}`}>
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package size={20} />
                                        )}
                                    </div>
                                    <div className="text-left flex-1 pl-2">
                                        <h3 className="font-bold text-sm uppercase tracking-widest">{product.name}</h3>
                                        <p className="text-[10px] text-[#d4af37] font-mono tracking-wider">{formattedPrice}</p>
                                    </div>
                                </div>
                                {isSelected && <div className="w-3 h-3 rounded-full bg-[#d4af37] flex-shrink-0"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <button onClick={handleNext} className="gold-button w-full mt-6">
                {formData.type === 'product'
                    ? ((formData.addons || []).length > 0 ? 'Selesai Belanja' : 'Pilih barang untuk lanjut')
                    : ((formData.addons || []).length > 0 ? 'Tambah & Lanjut' : 'Lewati & Lanjut')
                }
            </button>
        </motion.div>
    );

    const renderStep4Contact = () => {
        // Calculate subtotal
        let basePrice = 0;
        if (formData.type === 'service' && formData.service) {
            const chosenServiceObj = services.find(s => s.name === formData.service);
            if (chosenServiceObj) basePrice = chosenServiceObj.price;
        }
        let addonPrice = 0;
        formData.addons.forEach(addonName => {
            const product = products.find(p => p.name === addonName);
            if (product) addonPrice += product.price;
        });
        const subtotal = basePrice + addonPrice;

        // Calculate redeemable options right before rendering step 4
        let bestRedeemableItem = null;
        let highestPrice = -1;

        if (formData.type === 'service' && formData.service) {
            const chosenServiceObj = services.find(s => s.name === formData.service);
            if (chosenServiceObj?.is_redeemable && userPoints >= chosenServiceObj.points_required) {
                bestRedeemableItem = chosenServiceObj;
                highestPrice = chosenServiceObj.price;
            }
        }

        formData.addons.forEach(addonName => {
            const product = products.find(p => p.name === addonName);
            if (product?.is_redeemable && userPoints >= product.points_required && product.price > highestPrice) {
                bestRedeemableItem = product;
                highestPrice = product.price;
            }
        });

        return (
            <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-5 w-full"
            >
                <h2 className="serif text-3xl font-bold mb-2 text-center">Informasi Anda</h2>
                {formError && <p className="text-red-500 text-xs text-center border border-red-500/30 p-2 rounded bg-red-500/10 mb-2">{formError}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                        <input
                            required
                            type="text"
                            placeholder="Nama Lengkap (Cth: Budi Wijaya)"
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="relative">
                        <Phone size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                        <input
                            required
                            type="tel"
                            placeholder="Telepon (08... atau 628...)"
                            title="Harus dimulai dengan 08 atau 628"
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors font-mono tracking-wider"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    {specialMark && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gradient-to-r from-[#d4af37]/20 to-transparent border border-[#d4af37]/40 rounded-lg flex items-center gap-3 mt-2"
                        >
                            <span className="text-xl">✨</span>
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-wider">Pelanggan Spesial</p>
                                <p className="text-sm font-bold text-[#d4af37] tracking-wide uppercase">{specialMark}</p>
                            </div>
                        </motion.div>
                    )}

                    <div className="p-4 bg-[#141414] rounded border border-[#d4af37]/10 mt-6 text-sm space-y-2">
                        {formData.type === 'service' ? (
                            <>
                                <p className="flex justify-between"><span className="text-[#a1a1a1]">Tanggal</span> <span>{formData.date}</span></p>
                                <p className="flex justify-between"><span className="text-[#a1a1a1]">Waktu</span> <span className="text-[#d4af37] font-mono">{formData.time}</span></p>
                                <p className="flex justify-between"><span className="text-[#a1a1a1]">Kapster</span> <span>{formData.barber}</span></p>
                                <p className="flex justify-between"><span className="text-[#a1a1a1]">Layanan</span> <span>{formData.service} ({formatCurrency(basePrice)})</span></p>
                            </>
                        ) : (
                            <p className="flex justify-between"><span className="text-[#a1a1a1]">Pesanan</span> <span className="text-[#d4af37] font-bold">Ambil di Toko</span></p>
                        )}
                        {(formData.addons || []).length > 0 && (
                            <p className="flex justify-between"><span className="text-[#a1a1a1]">{formData.type === 'product' ? 'Produk' : 'Tambahan'}</span> <span className="text-right text-xs max-w-[200px]">{formData.addons.join(', ')} ({formatCurrency(addonPrice)})</span></p>
                        )}
                        <hr className="border-[#333] my-2" />
                        <p className="flex justify-between text-xs"><span className="text-[#a1a1a1]">Subtotal</span> <span>{formatCurrency(subtotal)}</span></p>
                        {appliedReferral ? (
                            <p className="flex justify-between text-xs text-[#d4af37]">
                                <span>🤝 Referral ({appliedReferral.code})</span>
                                <span>-{formatCurrency(appliedReferral.discount_type === 'percent' ? Math.floor(subtotal * appliedReferral.discount_value / 100) : appliedReferral.discount_value)}</span>
                            </p>
                        ) : voucherData && (
                            <p className="flex justify-between text-xs text-green-500">
                                <span>Diskon ({voucherData.programId})</span>
                                <span>-{formatCurrency(voucherData.discountValue)}</span>
                            </p>
                        )}
                        <p className="flex justify-between font-bold text-base border-t border-[#d4af37]/20 pt-2 text-[#d4af37]">
                            <span>Total</span>
                            <span>{formatCurrency(Math.max(0, subtotal - (appliedReferral ? (appliedReferral.discount_type === 'percent' ? Math.floor(subtotal * appliedReferral.discount_value / 100) : appliedReferral.discount_value) : (voucherData?.discountValue || 0))))}</span>
                        </p>
                    </div>

                    {/* Loyalty Point Redemption Section */}
                    {bestRedeemableItem && (
                        <div className="bg-[#141414] border border-[#d4af37]/30 rounded-lg p-4 mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[#d4af37] font-bold text-sm uppercase tracking-widest">Hadiah Auro</span>
                                <span className="text-xs bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded font-mono">
                                    {userPoints} Pts Tersedia
                                </span>
                            </div>
                            <p className="text-xs text-[#a1a1a1] mb-3">
                                Anda bisa mendapatkan <strong className="text-[#d4af37]">{bestRedeemableItem.name}</strong> gratis dengan menukarkan {bestRedeemableItem.points_required} PTS!
                            </p>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={usePoints}
                                        onChange={() => setUsePoints(!usePoints)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${usePoints ? 'bg-[#d4af37]' : 'bg-[#333]'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-black w-4 h-4 rounded-full transition-transform ${usePoints ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                                <span className={`text-sm tracking-wide transition-colors ${usePoints ? 'text-[#d4af37] font-bold' : 'text-[#a1a1a1]'}`}>
                                    Tukar poin untuk produk ini
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Public Discounts Selection */}
                    {publicDiscounts.length > 0 && (
                        voucherData?.claimId ? (
                            <div className="bg-[#141414]/90 border border-green-500/20 rounded-lg p-4 mt-4 text-center text-xs text-[#a1a1a1]">
                                Voucher program sedang digunakan. Hapus voucher untuk memilih diskon publik.
                            </div>
                        ) : (
                            <div className="bg-[#141414] border border-[#d4af37]/20 rounded-lg p-4 mt-4">
                                <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest block mb-3">
                                    Diskon Tersedia
                                </span>
                                <div className="space-y-2">
                                    {publicDiscounts.map((discount) => {
                                        const isSelected = selectedDiscount?.id === discount.id;
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
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 pt-4 border-t border-[#333]"
                                    >
                                        <label className="block text-xs uppercase tracking-widest text-[#d4af37] mb-2 font-bold">
                                            Unggah Bukti Pendukung *
                                        </label>
                                        <p className="text-[10px] text-[#a1a1a1] mb-2">
                                            Unggah gambar/screenshot (misal: ID mahasiswa, penetapan jabatan, screenshot IG post, dll) sebagai bukti kelayakan diskon.
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
                                    </motion.div>
                                )}
                            </div>
                        )
                    )}

                    {/* Referral Code Input Section */}
                    <div className="bg-[#0d0d0d] border border-[#d4af37]/20 rounded-lg p-4 mt-4">
                        <span className="text-[#d4af37] font-bold text-xs uppercase tracking-widest block mb-3">🤝 Kode Referral / Affiliate</span>
                        {appliedReferral ? (
                            <div className="bg-[#1a1a0a] border border-[#d4af37]/40 rounded-lg p-3 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#d4af37] font-bold text-sm">{appliedReferral.code}</span>
                                        <span className="text-[8px] uppercase tracking-widest bg-[#d4af37]/20 text-[#d4af37] px-1.5 py-0.5 rounded">AKTIF</span>
                                    </div>
                                    <p className="text-[#a1a1a1] text-xs mt-0.5">{appliedReferral.partner_name}</p>
                                    <p className="text-[#d4af37] text-xs font-semibold mt-0.5">
                                        Potongan {appliedReferral.discount_type === 'percent' ? `${appliedReferral.discount_value}%` : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(appliedReferral.discount_value)} terpasang!
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeReferral}
                                    className="text-xs text-[#a1a1a1] hover:text-red-400 font-bold uppercase tracking-wider pl-2 transition-colors"
                                >
                                    Hapus
                                </button>
                            </div>
                        ) : (
                            <>
                                {(selectedDiscount || (voucherData && voucherData.claimId)) && (
                                    <p className="text-[#a1a1a1] text-xs mb-2">
                                        ⚠ Diskon/Voucher lain sedang digunakan. Menggunakan kode referral akan menggantikan diskon aktif.
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={referralInput}
                                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), verifyReferralCode())}
                                        placeholder="Masukkan kode referral..."
                                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#d4af37]/60 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => verifyReferralCode()}
                                        disabled={referralLoading || !referralInput.trim()}
                                        className="px-4 py-2 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {referralLoading ? '...' : 'Cek'}
                                    </button>
                                </div>
                                {referralError && (
                                    <p className="text-red-400 text-xs mt-1">{referralError}</p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-4 mb-2">
                        {appliedReferral ? (
                            <div className="bg-[#141414]/90 border border-[#d4af37]/10 rounded-lg p-3 text-center text-xs text-[#a1a1a1]">
                                Kode referral sedang digunakan. Hapus referral untuk memilih voucher program.
                            </div>
                        ) : selectedDiscount ? (
                            <div className="bg-[#141414]/90 border border-[#d4af37]/20 rounded-lg p-4 text-center text-xs text-[#a1a1a1] flex items-center justify-between">
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
                                key={voucherClaimKey}
                                onVoucherApplied={handleVoucherApplied} 
                                initialPhone={formData.phone} 
                            />
                        )}
                    </div>

                    <div className="text-xs text-[#a1a1a1] text-center my-4">
                        Nomor HP Anda berfungsi sebagai ID tiket.
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="gold-button w-full flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Konfirmasi Booking'}
                    </button>
                </form>
            </motion.div>
        );
    };

    const renderSuccess = () => (
        <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-8 w-full"
        >
            <div className="text-[#d4af37] mb-6"><CheckCircle size={80} /></div>
            <h3 className="serif text-3xl font-bold mb-2">Booking Aman! 🔥</h3>
            <p className="text-[#a1a1a1] mb-8">Slot lo udah dikunci. Siap-siap glow up!</p>

            <button
                onClick={() => navigate(`/queue/${successId}`)}
                className="gold-button w-full mb-4"
            >
                Lihat Monitor Antrean
            </button>



            <p className="text-[10px] uppercase tracking-widest text-[#555] mt-6">
                Simpan link ini atau cek status booking lo kapan aja.
            </p>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans relative overflow-x-hidden">
            {/* Full-width sticky header with inner content constrained */}
            <header className="sticky top-0 z-10 w-full border-b border-[#d4af37]/10 bg-[#121212]">
                <div className="flex items-center justify-between px-5 py-3 w-full max-w-md mx-auto">
                    {!successId ? (
                        <button onClick={handleBack} className="text-[#a1a1a1] hover:text-[#d4af37] transition flex-shrink-0">
                            <ArrowLeft size={22} />
                        </button>
                    ) : (
                        <div className="w-6" />
                    )}
                    <div className="flex-1 flex justify-center">
                        <img src={`${import.meta.env.BASE_URL}auro_logo.webp?v=3`} alt="Auro Logo" className="h-10 object-contain" />
                    </div>
                    <div className="w-6 flex-shrink-0"></div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center px-5 pt-8 pb-12 w-full max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {successId ? renderSuccess() : (
                        step === 1 ? renderStep1TypeSelection() :
                            step === 2 ? renderStep2Details() :
                                step === 3 ? renderStep3Addons() :
                                    renderStep4Contact()
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default MobileBooking;
