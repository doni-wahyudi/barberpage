import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    User, 
    Scissors, 
    AlertCircle, 
    ArrowLeft, 
    Loader2, 
    CheckCircle2, 
    Star, 
    RefreshCw, 
    MapPin, 
    Share2, 
    Check, 
    Copy, 
    Calendar, 
    Sparkles, 
    ExternalLink,
    ShieldCheck,
    MessageCircle,
    Receipt
} from 'lucide-react';

const QueueMonitor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isLate, setIsLate] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [visitCount, setVisitCount] = useState(1);
    const [copied, setCopied] = useState(false);

    // Loyalty & Review States
    const [appSettings, setAppSettings] = useState(null);
    const [reviewState, setReviewState] = useState({ rating: 0, comment: '', status: 'none', googleClicked: false });
    const [pointsEarned, setPointsEarned] = useState(0);
    const [specialMark, setSpecialMark] = useState(null);

    useEffect(() => {
        const fetchBooking = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching booking:', error);
                setError('Tiket tidak ditemukan atau tautan tidak valid.');
            } else {
                setBooking(data);
                checkLateStatus(data, new Date());

                // Fetch total visits and special mark for this phone number
                if (data.phone_number) {
                    const { count, error: countError } = await supabase
                        .from('bookings')
                        .select('*', { count: 'exact', head: true })
                        .eq('phone_number', data.phone_number)
                        .neq('status', 'cancelled');

                    if (!countError && count !== null) {
                        setVisitCount(count);
                    }

                    // Fetch customer special mark
                    const { data: customerData } = await supabase
                        .from('customers')
                        .select('special_mark')
                        .eq('phone_number', data.phone_number)
                        .maybeSingle();

                    if (customerData?.special_mark) {
                        setSpecialMark(customerData.special_mark);
                    }
                }

                // Fetch App Settings for Points
                const { data: settingsData } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
                if (settingsData) setAppSettings(settingsData);

                // Check if user already reviewed
                const { data: existingReview } = await supabase.from('reviews').select('*').eq('booking_id', id).maybeSingle();
                if (existingReview) {
                    setReviewState({ rating: existingReview.rating || 0, comment: existingReview.comment || '', status: 'submitted', googleClicked: existingReview.is_google_clicked });
                }
            }
            setLoading(false);
        };

        fetchBooking();

        // Subscribe to real-time updates for this specific booking
        const channel = supabase
            .channel(`public:bookings:id=eq.${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
                (payload) => {
                    setBooking(payload.new);
                    checkLateStatus(payload.new, new Date());
                }
            )
            .subscribe();

        // Timer for current time
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
        }, 10000); // Check every 10 seconds

        return () => {
            supabase.removeChannel(channel);
            clearInterval(timer);
        };
    }, [id]);

    useEffect(() => {
        if (booking) checkLateStatus(booking, currentTime);
    }, [booking, currentTime]);

    const checkLateStatus = (bookingData, now) => {
        if (!bookingData) return;

        const [hours, minutes] = bookingData.booking_time.split(':');
        const bookingDateObj = new Date(bookingData.booking_date);
        bookingDateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        const tenMinutes = 10 * 60 * 1000;

        if (
            now.getTime() > bookingDateObj.getTime() + tenMinutes &&
            (bookingData.queue_status === 'waiting' || bookingData.queue_status == null) &&
            bookingData.status !== 'completed' && bookingData.status !== 'cancelled'
        ) {
            setIsLate(true);
            if (bookingData.queue_status !== 'late') {
                updateQueueStatus('late');
            }
        } else {
            setIsLate(bookingData.queue_status === 'late');
        }
    };

    const updateQueueStatus = async (newStatus) => {
        const { data, error } = await supabase
            .from('bookings')
            .update({ queue_status: newStatus })
            .eq('id', id)
            .select()
            .single();

        if (!error && data) {
            setBooking(data);
        }
    };

    const handleManualTrigger = () => {
        updateQueueStatus('late_arrived');
    };

    const handleCopyTicketLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
    };

    const handleSubmitAppReview = async (e) => {
        e.preventDefault();
        if (reviewState.rating === 0) return;
        setReviewState(prev => ({ ...prev, status: 'submitting' }));

        try {
            const { error: reviewError } = await supabase.from('reviews').insert([{
                booking_id: booking.id,
                phone_number: booking.phone_number,
                customer_name: booking.customer_name,
                rating: reviewState.rating,
                comment: reviewState.comment,
                is_google_clicked: false
            }]);

            if (reviewError) throw reviewError;

            const pointsToAward = appSettings?.points_per_app_review || 10;
            const { data: customerData } = await supabase.from('customers').select('points').eq('phone_number', booking.phone_number).single();
            const currentPoints = customerData ? customerData.points : 0;

            await supabase.from('customers').upsert({
                phone_number: booking.phone_number,
                name: booking.customer_name,
                points: currentPoints + pointsToAward
            });

            await supabase.from('point_transactions').insert([{
                phone_number: booking.phone_number,
                amount: pointsToAward,
                description: 'App Review Submitted'
            }]);

            setPointsEarned(prev => prev + pointsToAward);
            setReviewState(prev => ({ ...prev, status: 'submitted' }));

        } catch (error) {
            console.error('Failed to submit review:', error);
            setReviewState(prev => ({ ...prev, status: 'none' }));
        }
    };

    const handleGoogleClick = async () => {
        if (reviewState.googleClicked || reviewState.status !== 'submitted') return;

        try {
            await supabase.from('reviews').update({ is_google_clicked: true }).eq('booking_id', booking.id);
            const pointsToAward = appSettings?.points_per_google_review || 10;
            const { data: customerData } = await supabase.from('customers').select('points').eq('phone_number', booking.phone_number).single();
            const currentPoints = customerData ? customerData.points : 0;

            await supabase.from('customers').update({ points: currentPoints + pointsToAward }).eq('phone_number', booking.phone_number);

            await supabase.from('point_transactions').insert([{
                phone_number: booking.phone_number,
                amount: pointsToAward,
                description: 'Google Maps Review Link Clicked'
            }]);

            setPointsEarned(prev => prev + pointsToAward);
            setReviewState(prev => ({ ...prev, googleClicked: true }));
        } catch (e) {
            console.error('Error awarding google points:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-6">
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center mb-4">
                    <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                </div>
                <h3 className="serif text-lg font-bold text-[#d4af37] tracking-wider uppercase">Auro Barbershop</h3>
                <p className="text-gray-400 text-xs mt-1">Memuat tiket dan status antrean...</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2 serif">Tiket Tidak Ditemukan</h2>
                <p className="text-gray-400 text-xs max-w-xs mb-6">{error}</p>
                <button onClick={() => navigate('/')} className="gold-button !py-3 !px-6 text-xs font-bold uppercase tracking-wider">
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    const {
        customer_name,
        service_type,
        barber_name,
        booking_date,
        booking_time,
        queue_status,
        status,
        total_price,
        voucher_discount,
        voucher_program
    } = booking;

    const dateObj = new Date(booking_date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = booking_time.substring(0, 5);
    const shortCode = id.substring(0, 8).toUpperCase();

    // Dynamic UI states
    const isCompleted = status === 'completed' || queue_status === 'completed';
    const isCancelled = status === 'cancelled';
    const isLateArrived = queue_status === 'late_arrived';
    const isSkipped = queue_status === 'skipped';
    const isInProgress = queue_status === 'in_progress';

    let statusTitle = "Menunggu Giliran Anda";
    let statusSubtitle = "Harap tiba di Auro Barbershop 5-10 menit sebelum jam jadwal.";
    let statusBadgeColor = "bg-amber-400/15 text-amber-300 border-amber-400/40";
    let statusPulseColor = "bg-amber-400";
    let stepIndex = 1; // 1: Booked, 2: In Progress, 3: Completed

    if (isCompleted) {
        statusTitle = "Layanan Selesai ✨";
        statusSubtitle = "Terima kasih telah mempercayakan penampilan Anda kepada Auro Barbershop.";
        statusBadgeColor = "bg-emerald-400/15 text-emerald-300 border-emerald-400/40";
        statusPulseColor = "bg-emerald-400";
        stepIndex = 3;
    } else if (isInProgress) {
        statusTitle = "Giliran Anda Sedang Berlangsung! 💈";
        statusSubtitle = "Silakan duduk di kursi kapster dan nikmati pelayanan terbaik kami.";
        statusBadgeColor = "bg-emerald-400/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]";
        statusPulseColor = "bg-emerald-400";
        stepIndex = 2;
    } else if (isLateArrived) {
        statusTitle = "Tiba Terlambat - Menunggu Slot Kosong";
        statusSubtitle = "Anda telah check-in terlambat. Kapster akan melayani Anda di sela antrean.";
        statusBadgeColor = "bg-orange-500/15 text-orange-300 border-orange-500/40";
        statusPulseColor = "bg-orange-500";
        stepIndex = 1;
    } else if (isLate) {
        statusTitle = "Jadwal Terlewat (>10 Menit)";
        statusSubtitle = "Waktu kedatangan Anda telah lewat dari batas toleransi. Silakan klik Check-In jika sudah di lokasi.";
        statusBadgeColor = "bg-red-500/15 text-red-300 border-red-500/40";
        statusPulseColor = "bg-red-500";
        stepIndex = 1;
    } else if (isSkipped) {
        statusTitle = "Antrean Dilewati";
        statusSubtitle = "Panggilan Anda telah dilewati. Silakan hubungi kasir/staf di barbershop.";
        statusBadgeColor = "bg-red-500/15 text-red-300 border-red-500/40";
        statusPulseColor = "bg-red-500";
        stepIndex = 1;
    } else if (isCancelled) {
        statusTitle = "Pemesanan Dibatalkan";
        statusSubtitle = "Jadwal booking ini telah dibatalkan.";
        statusBadgeColor = "bg-gray-500/15 text-gray-300 border-gray-500/40";
        statusPulseColor = "bg-gray-500";
        stepIndex = 0;
    }

    return (
        <div className="min-h-[100dvh] bg-[#070707] text-white font-sans flex flex-col relative overflow-x-hidden selection:bg-[#d4af37] selection:text-black">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-gradient-to-b from-[#d4af37]/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

            {/* Header with iOS Safe Area Padding */}
            <header className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#d4af37]/15 bg-[#0f0f0f]/90 backdrop-blur-md sticky top-0 z-20 pt-[max(12px,env(safe-area-inset-top,12px))]">
                <button 
                    onClick={() => navigate('/')} 
                    className="text-gray-400 hover:text-[#d4af37] transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider p-1 active:scale-95"
                >
                    <ArrowLeft size={18} />
                    <span className="hidden sm:inline">Beranda</span>
                </button>
                <div className="flex items-center gap-2">
                    <img src={`${import.meta.env.BASE_URL}auro_logo.webp?v=3`} alt="Auro Logo" className="h-8 object-contain" />
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="p-2 rounded-lg bg-[#1a1a1a] text-gray-300 hover:text-[#d4af37] hover:bg-[#222] border border-[#333] transition-all active:scale-95"
                        title="Segarkan Antrean"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </header>

            {/* Main Content Area with iOS Bottom Safe Area */}
            <main className="flex-1 flex flex-col items-center justify-center px-3.5 sm:px-4 py-6 pb-[calc(env(safe-area-inset-bottom,16px)+32px)] w-full max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full relative"
                >
                    {/* Live Indicator Banner */}
                    <div className="flex items-center justify-between px-2 mb-3 text-[11px] text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusPulseColor}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusPulseColor}`}></span>
                            </span>
                            <span className="font-mono uppercase tracking-widest text-[#d4af37] font-bold">Monitor Antrean Real-Time</span>
                        </div>
                        <span className="font-mono text-gray-400">Ref: #{shortCode}</span>
                    </div>

                    {/* PHYSICAL PASS TICKET CARD */}
                    <div className="bg-[#121212] border border-[#d4af37]/30 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
                        {/* Top Gold Foil Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-[#997922] via-[#f1d592] to-[#997922]" />

                        {/* Ticket Header Section */}
                        <div className="p-6 pb-5 border-b border-[#222] relative bg-gradient-to-b from-[#181818] to-[#121212]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-extrabold flex items-center gap-1">
                                        <ShieldCheck size={13} /> Tiket Reservasi Resmi
                                    </span>
                                    <h2 className="serif text-2xl sm:text-3xl font-bold text-white mt-1">
                                        {customer_name}
                                    </h2>
                                </div>
                                <button
                                    onClick={handleCopyTicketLink}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#333] hover:border-[#d4af37]/60 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-mono shrink-0"
                                    title="Salin tautan tiket ini"
                                >
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                    <span>{copied ? 'Tersalin' : 'Bagikan'}</span>
                                </button>
                            </div>

                            {/* Customer Badges */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                <span className="px-2.5 py-1 rounded-full bg-[#1c1c1c] border border-[#333] text-[10px] uppercase tracking-wider font-bold text-gray-300 flex items-center gap-1">
                                    <Sparkles size={11} className="text-[#d4af37]" />
                                    Kunjungan ke-{visitCount}
                                </span>

                                {specialMark && (
                                    <span className="px-2.5 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[10px] uppercase tracking-wider font-extrabold text-[#d4af37] flex items-center gap-1">
                                        👑 {specialMark}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status Beacon Card */}
                        <div className="p-5 border-b border-[#222] bg-[#0d0d0d]">
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${statusBadgeColor}`}>
                                <div className="flex items-center gap-2">
                                    {isInProgress ? (
                                        <Scissors className="animate-bounce" size={20} />
                                    ) : isCompleted ? (
                                        <CheckCircle2 size={20} />
                                    ) : (
                                        <Clock size={20} />
                                    )}
                                    <h4 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
                                        {statusTitle}
                                    </h4>
                                </div>
                                <p className="text-xs text-gray-300 mt-1.5 max-w-xs leading-relaxed">
                                    {statusSubtitle}
                                </p>
                            </div>

                            {/* Multi-Step Queue Timeline */}
                            {!isCancelled && (
                                <div className="mt-5 px-3">
                                    <div className="flex items-center justify-between relative">
                                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#222] -translate-y-1/2 z-0" />
                                        <div 
                                            className="absolute top-1/2 left-0 h-0.5 bg-[#d4af37] -translate-y-1/2 z-0 transition-all duration-500"
                                            style={{ width: stepIndex === 1 ? '15%' : stepIndex === 2 ? '65%' : '100%' }}
                                        />

                                        {/* Step 1 */}
                                        <div className="flex flex-col items-center relative z-10">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${stepIndex >= 1 ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#1a1a1a] text-gray-500 border-[#333]'}`}>
                                                ✓
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-300 mt-1.5">Dipesan</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="flex flex-col items-center relative z-10">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${stepIndex >= 2 ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#1a1a1a] text-gray-500 border-[#333]'}`}>
                                                {stepIndex === 2 ? '⏳' : '2'}
                                            </div>
                                            <span className={`text-[10px] font-bold mt-1.5 ${stepIndex === 2 ? 'text-[#d4af37]' : 'text-gray-400'}`}>Di Kursi</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="flex flex-col items-center relative z-10">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${stepIndex === 3 ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-[#1a1a1a] text-gray-500 border-[#333]'}`}>
                                                {stepIndex === 3 ? '★' : '3'}
                                            </div>
                                            <span className={`text-[10px] font-bold mt-1.5 ${stepIndex === 3 ? 'text-emerald-400' : 'text-gray-400'}`}>Selesai</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ticket Perforated Notches (Decorative Cutouts) */}
                        <div className="relative flex items-center justify-between px-2 bg-[#121212] py-2 border-b border-dashed border-[#333]">
                            <div className="w-5 h-5 rounded-full bg-[#070707] -ml-5 border-r border-[#d4af37]/30" />
                            <div className="flex-1 border-b border-dashed border-[#333] mx-3" />
                            <div className="w-5 h-5 rounded-full bg-[#070707] -mr-5 border-l border-[#d4af37]/30" />
                        </div>

                        {/* Ticket Service Details (Bento Grid) */}
                        <div className="p-6 space-y-4 bg-[#121212]">
                            <div className="grid grid-cols-2 gap-3">
                                {/* Jadwal & Waktu */}
                                <div className="p-3.5 bg-[#171717] rounded-2xl border border-[#262626]">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                                        <Calendar size={13} className="text-[#d4af37]" /> Jadwal Kedatangan
                                    </div>
                                    <p className="text-xs font-bold text-gray-200">{dateStr}</p>
                                    <p className="text-lg font-mono font-extrabold text-[#d4af37] mt-0.5">{timeStr} <span className="text-xs font-normal">WIB</span></p>
                                </div>

                                {/* Kapster */}
                                <div className="p-3.5 bg-[#171717] rounded-2xl border border-[#262626]">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                                        <User size={13} className="text-[#d4af37]" /> Capster
                                    </div>
                                    <p className="text-sm font-extrabold text-white mt-0.5">{barber_name}</p>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">Auro Stylist</p>
                                </div>
                            </div>

                            {/* Layanan */}
                            <div className="p-3.5 bg-[#171717] rounded-2xl border border-[#262626] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[#222] flex items-center justify-center font-bold text-sm text-[#d4af37] border border-[#d4af37]/30">
                                        ✂️
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Pilihan Layanan</p>
                                        <p className="text-sm font-bold text-white mt-0.5">{service_type}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Ringkasan Biaya / Invoice */}
                            <div className="p-3.5 bg-[#171717] rounded-2xl border border-[#262626] space-y-2 text-xs">
                                <div className="flex justify-between text-gray-400">
                                    <span className="flex items-center gap-1"><Receipt size={13} /> Total Biaya Layanan</span>
                                    <span className="font-mono text-gray-200">{formatCurrency(total_price + (voucher_discount || 0))}</span>
                                </div>

                                {voucher_discount > 0 && (
                                    <div className="flex justify-between text-[#d4af37] font-semibold">
                                        <span>Potongan Diskon / Promo</span>
                                        <span className="font-mono">-{formatCurrency(voucher_discount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t border-[#262626] font-bold text-white">
                                    <span className="text-xs uppercase tracking-wider">Total Pembayaran di Kasir</span>
                                    <span className="text-base font-mono text-[#d4af37]">{formatCurrency(total_price)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Late Arriver Manual Check-In Button */}
                        {isLate && !isLateArrived && !isSkipped && !isCompleted && !isCancelled && (
                            <div className="p-5 pt-0 bg-[#121212]">
                                <button
                                    onClick={handleManualTrigger}
                                    className="w-full py-3.5 bg-[#d4af37] text-black rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:bg-[#e5c04b] transition-all flex items-center justify-center gap-2"
                                >
                                    <MapPin size={16} /> Saya Sudah Sampai di Barbershop (Check-In)
                                </button>
                                <p className="text-[10px] text-center text-gray-400 mt-2">
                                    Konfirmasi ini akan memberitahukan kapster bahwa Anda telah tiba.
                                </p>
                            </div>
                        )}

                        {/* Quick Action Navigation Links */}
                        <div className="p-5 pt-0 bg-[#121212] grid grid-cols-2 gap-2.5">
                            <a
                                href="https://maps.app.goo.gl/6d7BJJDKbcAukKPK8"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 bg-[#181818] border border-[#333] hover:border-[#d4af37]/60 rounded-xl text-center text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
                            >
                                <MapPin size={14} className="text-[#d4af37]" />
                                <span>Petunjuk Arah</span>
                                <ExternalLink size={11} className="text-gray-500" />
                            </a>

                            <a
                                href="https://wa.me/6285189283737"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 bg-[#181818] border border-[#333] hover:border-[#d4af37]/60 rounded-xl text-center text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
                            >
                                <MessageCircle size={14} className="text-emerald-400" />
                                <span>Kontak WhatsApp</span>
                            </a>
                        </div>
                    </div>

                    {/* POST-SERVICE REVIEW SECTION */}
                    {isCompleted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-6 p-6 rounded-3xl bg-[#121212] border border-[#d4af37]/30 text-center shadow-xl relative overflow-hidden"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mx-auto mb-3">
                                <Star size={24} className="fill-[#d4af37]" />
                            </div>
                            <h3 className="serif text-xl font-bold text-white">Bagaimana Hasil Potongan Anda?</h3>
                            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                                Berikan ulasan pengalaman Anda untuk membantu kami terus berkembang.
                            </p>

                            {pointsEarned > 0 && (
                                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                                    <Sparkles size={12} /> +{pointsEarned} Poin Didapatkan
                                </div>
                            )}

                            {reviewState.status === 'none' || reviewState.status === 'submitting' ? (
                                <form onSubmit={handleSubmitAppReview} className="mt-5 space-y-3.5 text-left">
                                    <div className="flex justify-center gap-2 py-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewState(prev => ({ ...prev, rating: star }))}
                                                className="focus:outline-none transition-transform hover:scale-125"
                                            >
                                                <Star size={32} className={`${reviewState.rating >= star ? 'fill-[#d4af37] text-[#d4af37]' : 'text-[#333]'}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        required
                                        placeholder="Ceritakan kepuasan hasil cukur & pelayanan kapster..."
                                        className="w-full bg-[#181818] border border-[#333] focus:border-[#d4af37] rounded-xl p-3 text-xs text-white placeholder:text-gray-600 focus:outline-none min-h-[90px]"
                                        value={reviewState.comment}
                                        onChange={(e) => setReviewState(prev => ({ ...prev, comment: e.target.value }))}
                                    />

                                    <button
                                        type="submit"
                                        disabled={reviewState.rating === 0 || reviewState.status === 'submitting'}
                                        className="gold-button w-full !py-3.5 text-xs font-bold uppercase tracking-wider flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {reviewState.status === 'submitting' ? (
                                            <>
                                                <Loader2 className="animate-spin" size={16} />
                                                <span>Mengirim Ulasan...</span>
                                            </>
                                        ) : (
                                            <span>Kirim Ulasan (+{appSettings?.points_per_app_review || 10} Poin)</span>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <div className="mt-5 space-y-4">
                                    <div className="bg-[#181818] border border-[#2a2a2a] rounded-2xl p-4">
                                        <p className="text-[#d4af37] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
                                            <CheckCircle2 size={16} /> Ulasan Berhasil Dikirim
                                        </p>
                                        <p className="text-[11px] text-gray-400">Terima kasih banyak atas apresiasi Anda!</p>
                                    </div>

                                    {!reviewState.googleClicked ? (
                                        <div className="border border-[#d4af37]/30 bg-[#d4af37]/10 rounded-2xl p-4 text-left">
                                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <Sparkles size={14} className="text-[#d4af37]" /> Bonus Poin Tambahan!
                                            </p>
                                            <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                                                Dapatkan tambahan <strong>+{appSettings?.points_per_google_review || 10} Poin</strong> dengan menyalin ulasan Anda ke Google Maps Auro Barbershop.
                                            </p>
                                            <a
                                                href="https://maps.app.goo.gl/6d7BJJDKbcAukKPK8"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={handleGoogleClick}
                                                className="gold-button w-full !py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-3"
                                            >
                                                <Star size={16} className="fill-black" /> Beri Ulasan di Google Maps
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs uppercase tracking-widest font-bold">
                                            <Star size={14} className="fill-gray-500" /> Poin Google Maps Telah Diklaim
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default QueueMonitor;
