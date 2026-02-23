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
    const [visitCount, setVisitCount] = useState(1); // Added visitCount state

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

                    if (!countError && count !== null) { // count can be 0, so check for null
                        setVisitCount(count);
                    } else if (countError) {
                        console.error('Error fetching visit count:', countError);
                    }
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white">
                <Loader2 className="animate-spin text-[#d4af37] mb-4" size={40} />
                <p className="text-[#a1a1a1] uppercase tracking-widest text-xs">Finding Your Seat...</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-white p-6 text-center">
                <AlertCircle className="text-red-500 mb-4" size={50} />
                <h2 className="text-2xl font-bold mb-2 serif italic">Oops!</h2>
                <p className="text-[#a1a1a1] mb-8">{error}</p>
                <button onClick={() => navigate('/')} className="gold-button">
                    Return to Home
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

    let statusText = "Waiting for your turn";
    let statusColor = "text-yellow-400";
    let statusBg = "bg-yellow-400/10 border-yellow-400/30";

    if (isCompleted) {
        statusText = "Completed - Thank you!";
        statusColor = "text-green-400";
        statusBg = "bg-green-400/10 border-green-400/30";
    } else if (isCancelled) {
        statusText = "Cancelled";
        statusColor = "text-red-400";
        statusBg = "bg-red-400/10 border-red-400/30";
    } else if (isSkipped) {
        statusText = "Skipped - Please see Admin";
        statusColor = "text-red-400";
        statusBg = "bg-red-400/10 border-red-400/30";
    } else if (isLateArrived) {
        statusText = "Arrived Late - Waiting for slot";
        statusColor = "text-orange-400";
        statusBg = "bg-orange-400/10 border-orange-400/30";
    } else if (isLate) {
        statusText = "Late - Schedule Invalidated";
        statusColor = "text-red-500";
        statusBg = "bg-red-500/10 border-red-500/30";
    } else if (queue_status === 'in_progress') {
        statusText = "It's your turn!";
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
                        <p className="text-xs uppercase tracking-[0.2em] text-[#a1a1a1] mb-2">Customer Seat</p>
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
                                You missed your 10-minute window. Your slot may be given to the next customer.
                            </p>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <Clock className="text-[#d4af37] mt-1" size={20} />
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-widest">Schedule</p>
                                <p className="font-semibold">{dateStr}</p>
                                <p className="text-xl font-mono text-[#d4af37]">{timeStr}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Scissors className="text-[#d4af37] mt-1" size={20} />
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-widest">Service</p>
                                <p className="font-semibold">{service_type}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <User className="text-[#d4af37] mt-1" size={20} />
                            <div>
                                <p className="text-xs text-[#a1a1a1] uppercase tracking-widest">Barber</p>
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
                                I'm Here Now (Check-In)
                            </button>
                            <p className="text-[9px] text-center text-[#555] mt-3 uppercase">
                                Action subject to barber availability
                            </p>
                        </motion.div>
                    )}

                </motion.div>
            </main>
        </div>
    );
};

export default QueueMonitor;
