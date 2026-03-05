import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Calendar, Clock, User, Phone, CheckCircle, ArrowLeft, Scissors, Coffee, Loader2, Search, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

const MobileBooking = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [formError, setFormError] = useState('');

    // Loyalty State
    const [userPoints, setUserPoints] = useState(0);
    const [appSettings, setAppSettings] = useState(null);
    const [usePoints, setUsePoints] = useState(false);

    const [formData, setFormData] = useState({
        type: 'service', // 'service' or 'product' (for future)
        name: localStorage.getItem('auro_name') || '',
        phone: localStorage.getItem('auro_phone') || '',
        service: '',
        barber: '',
        date: (() => {
            const d = new Date();
            if (d.getDay() === 6) d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        })(),
        time: '',
        addons: []
    });

    const timeSlots = [
        "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
        "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
        "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
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

        const fetchData = async () => {
            const [productsRes, servicesRes, barbersRes] = await Promise.all([
                supabase.from('products').select('*').order('sort_order', { ascending: true }),
                supabase.from('services').select('*').order('sort_order', { ascending: true }),
                supabase.from('barbers').select('*').eq('is_active', true)
            ]);
            if (productsRes.data) setProducts(productsRes.data);
            if (servicesRes.data) setServices(servicesRes.data);
            if (barbersRes.data) setBarbers(barbersRes.data);
        };

        const fetchLoyaltySettings = async () => {
            const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
            if (settings) setAppSettings(settings);

            if (formData.phone) {
                const { data: customer } = await supabase.from('customers').select('points').eq('phone_number', formData.phone).single();
                if (customer) setUserPoints(customer.points);
            }
        };

        fetchBookings();
        fetchData();
        fetchLoyaltySettings();
    }, [formData.date, formData.barber, formData.type, formData.phone]);

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
            if (formData.type === 'service' && (!formData.service || !formData.barber || !formData.date || !formData.time)) {
                setFormError('Please select all required options to proceed.');
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (step === 3 && formData.type === 'product') {
            setStep(1);
            return;
        }
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

        // --- Calculate Total Price ---
        let basePrice = 0;
        let pointsToDeduct = 0;
        let discountValue = 0;
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
        if (usePoints && userPoints > 0) {
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
                discountValue = bestRedeemableItem.price;
                pointsToDeduct = bestRedeemableItem.points_required;
                redeemedItemName = bestRedeemableItem.name;
            }
        }

        let grandTotal = (basePrice + addonPrice) - discountValue;
        if (grandTotal < 0) grandTotal = 0;

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
                        total_price: grandTotal
                    }])
                    .select();

                if (error) throw error;

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
                        total_price: grandTotal
                    }])
                    .select();

                if (error) throw error;

                localStorage.setItem('auro_phone', formData.phone);

                // Deduct points if used
                if (usePoints && pointsToDeduct > 0) {
                    await supabase.from('customers').update({ points: userPoints - pointsToDeduct }).eq('phone_number', formData.phone);
                    await supabase.from('point_transactions').insert([{
                        phone_number: formData.phone,
                        amount: -pointsToDeduct,
                        description: `Redeemed points for free item: ${redeemedItemName}`
                    }]);
                }

                setSuccessId(newBooking[0].id);
            }
        } catch (error) {
            console.error('Error booking:', error.message);
            setFormError('Failed to book. Please try again.');
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
                <p className="text-xs text-[#a1a1a1] uppercase tracking-wider text-center">Reservasi dengan kapster kami</p>
            </button>

            <button
                onClick={() => { setFormData({ ...formData, type: 'product' }); setStep(3); }}
                className="glass-card p-6 flex flex-col items-center justify-center gap-4 hover:border-[#d4af37]/50 transition-all group w-full"
            >
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Coffee size={28} className="text-[#d4af37]" />
                </div>
                <h3 className="font-bold text-lg uppercase tracking-widest text-[#d4af37]">Toko</h3>
                <p className="text-xs text-[#a1a1a1] uppercase tracking-wider text-center">Beli koleksi produk kami</p>
            </button>

            <Link
                to="/check"
                className="mt-4 py-4 px-6 bg-[#141414] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded-lg text-center text-[#d4af37] flex justify-center items-center gap-2 w-full shadow-lg font-bold"
            >
                <Search size={18} /> Cek Status Reservasi
            </Link>
        </motion.div>
    );

    const renderStep2Details = () => (
        <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-5 w-full"
        >
            <h2 className="serif text-3xl font-bold mb-2 text-center">Pilih Detail</h2>
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
                        onChange={(e) => {
                            const date = new Date(e.target.value);
                            if (date.getDay() === 6) {
                                alert('Mohon maaf, kami tutup pada hari Sabtu.');
                                return;
                            }
                            setFormData({ ...formData, date: e.target.value, time: '' });
                        }}
                    />
                </div>

                <select
                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
                    value={formData.barber}
                    onChange={(e) => setFormData({ ...formData, barber: e.target.value, time: '' })}
                >
                    <option value="" disabled>Pilih Kapster</option>
                    {barbers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>

                <select
                    className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 focus:outline-none focus:border-[#d4af37] transition-colors appearance-none"
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
                                    (!timeSlots.includes(formData.time) && formData.time !== '') ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' :
                                        'bg-[#141414] border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10'}
                            `}
                        >
                            <Clock size={16} />
                            {!formData.barber ? `Cek Walk-In untuk ${getNowTimeStr()}...` : (!isNowAvailable() ? 'Penuh (Kursi Sedang Digunakan)' : `Pesan Sekarang (${getNowTimeStr()})`)}
                        </button>
                    </div>
                )}

                <p className="text-xs uppercase tracking-widest text-[#a1a1a1] mt-6 mb-2">Pilihan Waktu Nanti</p>
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
                Lanjut ke Detail
            </button>
            <Link
                to="/check"
                className="mt-4 py-4 px-6 bg-[#141414] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded-lg text-center text-[#d4af37] flex justify-center items-center gap-2 w-full shadow-lg font-bold"
            >
                <Search size={18} /> Cek Status Reservasi
            </Link>
        </motion.div>
    );

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
                {formData.type === 'service' ? 'Sempurnakan Kunjungan Anda' : 'Toko Auro'}
            </h2>
            <p className="text-[#a1a1a1] text-center text-sm mb-4">
                {formData.type === 'service'
                    ? 'Apakah Anda ingin menambahkan produk perawatan rambut ke reservasi Anda?'
                    : 'Pilih produk premium untuk dibeli dan diambil di toko.'}
            </p>

            <div className="space-y-4">
                {products.length === 0 ? (
                    <p className="text-center text-[#555] text-xs uppercase tracking-widest py-4 border border-[#333] rounded border-dashed">Belum ada stok produk tersedia.</p>
                ) : products.map((product) => {
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

            <button onClick={handleNext} className="gold-button w-full mt-6">
                {formData.type === 'product'
                    ? ((formData.addons || []).length > 0 ? 'Selesai Belanja' : 'Pilih barang untuk lanjut')
                    : ((formData.addons || []).length > 0 ? 'Tambah & Lanjut' : 'Lewati & Lanjut')
                }
            </button>
        </motion.div>
    );

    const renderStep4Contact = () => {
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
                            placeholder="Telepon (08... atau 628...)"
                            title="Harus dimulai dengan 08 atau 628"
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors font-mono tracking-wider"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="p-4 bg-[#141414] rounded border border-[#d4af37]/10 mt-6 text-sm">
                        {formData.type === 'service' ? (
                            <>
                                <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Tanggal</span> <span>{formData.date}</span></p>
                                <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Waktu</span> <span className="text-[#d4af37] font-mono">{formData.time}</span></p>
                                <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Kapster</span> <span>{formData.barber}</span></p>
                                <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Layanan</span> <span>{formData.service}</span></p>
                            </>
                        ) : (
                            <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">Pesanan</span> <span className="text-[#d4af37] font-bold">Ambil di Toko</span></p>
                        )}
                        {(formData.addons || []).length > 0 && (
                            <p className="flex justify-between mb-2"><span className="text-[#a1a1a1]">{formData.type === 'product' ? 'Produk' : 'Tambahan'}</span> <span className="text-right">{formData.addons.join(', ')}</span></p>
                        )}
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

                    <div className="text-xs text-[#a1a1a1] text-center my-4">
                        Nomor HP Anda berfungsi sebagai ID tiket.
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="gold-button w-full flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Konfirmasi Reservasi'}
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
            <h3 className="serif text-3xl font-bold mb-2">Terkonfirmasi</h3>
            <p className="text-[#a1a1a1] mb-8">Kursi eksklusif Anda telah dipesan.</p>

            <button
                onClick={() => navigate(`/queue/${successId}`)}
                className="gold-button w-full mb-4"
            >
                Lihat Monitor Antrean
            </button>



            <p className="text-[10px] uppercase tracking-widest text-[#555] mt-6">
                Simpan tautan ini atau gunakan fitur "Cek Reservasi" nanti.
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
                <div className="flex-1 flex justify-center py-2">
                    <img src={`${import.meta.env.BASE_URL}auro_logo_tagline.png`} alt="Auro Logo" className="h-24 md:h-32 object-contain" />
                </div>
                <div className="w-6"></div>
            </header>

            <main className="flex-1 flex flex-col items-center p-6 pt-12 w-full max-w-md mx-auto">
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
