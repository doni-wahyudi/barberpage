import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';
import { Clock, User, Scissors, AlertCircle, ArrowLeft, Loader2, CheckCircle2, Star } from 'lucide-react';

const QueueMonitor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isLate, setIsLate] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [visitCount, setVisitCount] = useState(1);

    // Loyalty & Review States
    const [appSettings, setAppSettings] = useState(null);
    const [reviewState, setReviewState] = useState({ rating: 0, comment: '', status: 'none', googleClicked: false }); // none, submitting, submitted
    const [pointsEarned, setPointsEarned] = useState(0);

    useEffect(() => {
        const fetchBooking = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching booking:', error);
                setError('Ticket not found or invalid link.');
            } else {
                setBooking(data);
                checkLateStatus(data, new Date());

                // Fetch total visits for this phone number
                if (data.phone_number) {
                    const { count, error: countError } = await supabase
                        .from('bookings')
                        .select('*', { count: 'exact', head: true })
                        .eq('phone_number', data.phone_number)
                        .neq('status', 'cancelled'); // Exclude cancelled bookings

                    if (!countError && count !== null) {
                        setVisitCount(count);
                    }
                }

                // Fetch App Settings for Points
                const { data: settingsData } = await supabase.from('app_settings').select('*').eq('id', 1).single();
                if (settingsData) setAppSettings(settingsData);

                // Check if user already reviewed
                const { data: existingReview } = await supabase.from('reviews').select('*').eq('booking_id', id).single();
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
                    console.log('Booking updated:', payload.new);
                    setBooking(payload.new);
                    checkLateStatus(payload.new, new Date());
                }
            )
            .subscribe();

        // Timer for current time and late checking
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            if (booking) {
                checkLateStatus(booking, now);
            }
        }, 15000); // Check every 15 seconds

        return () => {
            supabase.removeChannel(channel);
            clearInterval(timer);
        };
    }, [id, booking]); // Added booking to dependency array for timer to use latest state

    useEffect(() => {
        // Trigger check when booking state updates manually
        if (booking) checkLateStatus(booking, currentTime);
    }, [booking, currentTime]);

    const checkLateStatus = (bookingData, now) => {
        if (!bookingData) return;

        // We assume today is the booking date if they are monitoring it, 
        // but strictly we should check the actual booking date
        const [hours, minutes] = bookingData.booking_time.split(':');
        const bookingDateObj = new Date(bookingData.booking_date);
        bookingDateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        // 10 minutes in milliseconds
        const tenMinutes = 10 * 60 * 1000;

        // Consider late if current time > booking time + 10 mins
        // and the status is still waiting/pending
        if (
            now.getTime() > bookingDateObj.getTime() + tenMinutes &&
            (bookingData.queue_status === 'waiting' || bookingData.queue_status == null) &&
            bookingData.status !== 'completed' && bookingData.status !== 'cancelled'
        ) {
            setIsLate(true);
            // Optionally auto-update database to 'late' here, or keep it local
            // We'll update it to 'late' if it's strictly over 10 mins and not yet recorded as late
            if (bookingData.queue_status !== 'late') {
                updateQueueStatus('late');
            }
        } else {
            // Also update local state if DB says they are late
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
        // Tell barber they arrived late
        updateQueueStatus('late_arrived');
    };

    const handleSubmitAppReview = async (e) => {
        e.preventDefault();
        if (reviewState.rating === 0) return;
        setReviewState(prev => ({ ...prev, status: 'submitting' }));

        try {
            // 1. Insert Review
            const { error: reviewError } = await supabase.from('reviews').insert([{
                booking_id: booking.id,
                phone_number: booking.phone_number,
                customer_name: booking.customer_name,
                rating: reviewState.rating,
                comment: reviewState.comment,
                is_google_clicked: false
            }]);

            if (reviewError) throw reviewError;

            // 2. Award Points & Log Transaction
            const pointsToAward = appSettings?.points_per_app_review || 10;

            // Increment customer points via RPC or by basic fetch/update
            // Since we rely on standard updates for now (No RPC assumed)
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
            setReviewState(prev => ({ ...prev, status: 'none' })); // Revert on failure
        }
    };

    const handleGoogleClick = async () => {
        if (reviewState.googleClicked || reviewState.status !== 'submitted') return; // Must submit app review first or only once

        try {
            // Update review record
            await supabase.from('reviews').update({ is_google_clicked: true }).eq('booking_id', booking.id);

            // Award Points
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
                <Loader2 className="animate-spin text-[#d4af37] mb-4" size={40} />
                <p className="text-[#a1a1a1] uppercase tracking-widest text-xs">Sedang Mencari Tiket Anda...</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-6 text-center">
                <AlertCircle className="text-red-500 mb-4" size={50} />
                <h2 className="text-2xl font-bold mb-2 serif italic">Ups!</h2>
                <p className="text-[#a1a1a1] mb-8">{error}</p>
                <button onClick={() => navigate('/')} className="gold-button">
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
        status
    } = booking;

    // Formatting date
    const dateObj = new Date(booking_date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const timeStr = booking_time.substring(0, 5);

    // Dynamic UI states
    const isCompleted = status === 'completed' || queue_status === 'completed';
    const isCancelled = status === 'cancelled';
    const isLateArrived = queue_status === 'late_arrived';
    const isSkipped = queue_status === 'skipped';

    let statusText = "Menunggu giliran Anda";
    let statusColor = "text-yellow-400";
    let statusBg = "bg-yellow-400/10 border-yellow-400/30";

    if (isCompleted) {
        statusText = "Selesai - Terima kasih!";
        statusColor = "text-green-400";
        statusBg = "bg-green-400/10 border-green-400/30";
    } else if (isCancelled) {
        statusText = "Dibatalkan";
        statusColor = "text-red-400";
        statusBg = "bg-red-400/10 border-red-400/30";
    } else if (isSkipped) {
        statusText = "Dilewati - Silakan temui Admin";
        statusColor = "text-red-400";
        statusBg = "bg-red-400/10 border-red-400/30";
    } else if (isLateArrived) {
        statusText = "Datang Terlambat - Menunggu giliran";
        statusColor = "text-orange-400";
        statusBg = "bg-orange-400/10 border-orange-400/30";
    } else if (isLate) {
        statusText = "Terlambat - Jadwal Kedaluwarsa";
        statusColor = "text-red-500";
        statusBg = "bg-red-500/10 border-red-500/30";
    } else if (queue_status === 'in_progress') {
        statusText = "Giliran Anda!";
        statusColor = "text-green-400";
        statusBg = "bg-green-400/10 border-green-400/30";
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col relative">
            {/* Minimal Header */}
            <header className="p-6 flex items-center justify-between border-b border-[#d4af37]/10 bg-[#121212] sticky top-0 z-10">
                <button onClick={() => navigate('/')} className="text-[#a1a1a1] hover:text-white transition">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="serif font-bold text-xl tracking-wider uppercase text-center flex-1">
                    <span className="text-[#d4af37]">A</span>URO
                </h1>
                <div className="w-6"></div> {/* Spacer for centering */}
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md glass-card p-8 rounded-2xl relative overflow-hidden"
                >
                    {/* Background accent based on status */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${isLate || isSkipped || isCancelled ? 'bg-red-500' : isCompleted || queue_status === 'in_progress' ? 'bg-green-500' : 'bg-[#d4af37]'}`}></div>

                    <div className="text-center mb-8">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#a1a1a1] mb-2">Tiket Pelanggan</p>
                        <h2 className="serif text-3xl font-bold italic">{customer_name}</h2>
                    </div>

                    <div className={`flex flex-col items-center justify-center py-4 px-6 rounded-lg border mb-8 ${statusBg}`}>
                        <p className={`text-sm font-bold uppercase tracking-widest text-center ${statusColor}`}>
                            {statusText}
                        </p>
                        {queue_status === 'in_progress' && (
                            <CheckCircle2 className={`mt-2 ${statusColor}`} size={32} />
                        )}
                        {isLate && !isLateArrived && !isSkipped && !isCompleted && !isCancelled && (
                            <p className="text-[10px] text-center text-[#a1a1a1] mt-2">
                                Anda melewati batas waktu 10 menit. Giliran Anda mungkin diberikan kepada pelanggan berikutnya.
                            </p>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <Clock className="text-[#d4af37] mt-1" size={20} />
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-widest">Jadwal</p>
                                <p className="font-semibold">{dateStr}</p>
                                <p className="text-xl font-mono text-[#d4af37]">{timeStr}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Scissors className="text-[#d4af37] mt-1" size={20} />
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-widest">Layanan</p>
                                <p className="font-semibold">{service_type}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <User className="text-[#d4af37] mt-1" size={20} />
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-widest">Kapster</p>
                                <p className="font-semibold">{barber_name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Manual Trigger Button for Late Arrivers */}
                    {isLate && !isLateArrived && !isSkipped && !isCompleted && !isCancelled && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-8"
                        >
                            <button
                                onClick={handleManualTrigger}
                                className="w-full py-4 bg-[#1a1a1a] border border-[#d4af37]/50 text-[#d4af37] rounded uppercase tracking-widest text-xs font-bold hover:bg-[#d4af37] hover:text-black transition-all"
                            >
                                Saya Sudah Sampai (Check-In)
                            </button>
                            <p className="text-[9px] text-center text-[#555] mt-3 uppercase">
                                Persetujuan tergantung ketersediaan kapster
                            </p>
                        </motion.div>
                    )}

                    {/* Review CTA for Completed Bookings */}
                    {isCompleted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-10 pt-8 border-t border-[#d4af37]/10 text-center"
                        >
                            <h3 className="serif text-xl font-bold mb-2">Puas dengan Pelayanan Kami?</h3>

                            {pointsEarned > 0 && (
                                <div className="mb-4 inline-block bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                    +{pointsEarned} Points Earned
                                </div>
                            )}

                            {reviewState.status === 'none' || reviewState.status === 'submitting' ? (
                                <form onSubmit={handleSubmitAppReview} className="mt-6 text-left space-y-4">
                                    <p className="text-xs text-[#a1a1a1] text-center mb-4 leading-relaxed">
                                        Dapatkan <strong>{appSettings?.points_per_app_review || 10} Loyalty Points</strong> dengan memberikan ulasan tingkat kepuasan Anda di sini.
                                    </p>

                                    <div className="flex justify-center gap-2 mb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewState(prev => ({ ...prev, rating: star }))}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <Star size={32} className={`${reviewState.rating >= star ? 'fill-[#d4af37] text-[#d4af37]' : 'text-[#333]'}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        required
                                        placeholder="Tuliskan pengalaman Anda..."
                                        className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 text-sm focus:outline-none focus:border-[#d4af37] transition-colors min-h-[100px]"
                                        value={reviewState.comment}
                                        onChange={(e) => setReviewState(prev => ({ ...prev, comment: e.target.value }))}
                                    />

                                    <button
                                        type="submit"
                                        disabled={reviewState.rating === 0 || reviewState.status === 'submitting'}
                                        className="gold-button w-full flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {reviewState.status === 'submitting' ? <Loader2 className="animate-spin" size={18} /> : 'Kirim Ulasan'}
                                    </button>
                                </form>
                            ) : (
                                <div className="mt-6 space-y-6">
                                    <div className="bg-[#141414] border border-[#333] rounded-lg p-6">
                                        <p className="text-[#d4af37] font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
                                            <CheckCircle2 size={16} /> Ulasan Terkirim
                                        </p>
                                        <p className="text-xs text-[#a1a1a1]">Terima kasih atas masukannya!</p>
                                    </div>

                                    {!reviewState.googleClicked ? (
                                        <div className="border border-[#d4af37]/30 bg-[#d4af37]/5 rounded-lg p-6">
                                            <p className="text-sm font-bold mb-2">Bonus Points!</p>
                                            <p className="text-xs text-[#a1a1a1] mb-4 leading-relaxed">
                                                Dapatkan tambahan <strong>{appSettings?.points_per_google_review || 10} Points</strong> dengan menyalin ulasan Anda ke Google Maps kami.
                                            </p>
                                            <a
                                                href="https://maps.app.goo.gl/qekLjzMcHjg8KhVf7"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={handleGoogleClick}
                                                className="gold-button w-full flex items-center justify-center gap-2"
                                            >
                                                <Star size={18} className="fill-black" /> Beri Ulasan di Google Maps
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-[#555] text-xs uppercase tracking-widest font-bold">
                                            <Star size={14} className="fill-[#555]" /> Poin Bonus Diklaim
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
