import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import LiveSchedule from './components/LiveSchedule';
import Lookbook from './components/Lookbook';
import BookingModal from './components/BookingModal';
import LoadingScreen from './components/LoadingScreen';

import AdminPanel from './components/AdminPanel';
import Testimonials from './components/Testimonials';
import Location from './components/Location';
import WhatsAppButton from './components/WhatsAppButton';

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [isAdminView, setIsAdminView] = useState(false);

    useEffect(() => {
        // Simulate initial loading for a premium feel
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);
    const [bookingData, setBookingData] = useState(null);

    // Pass open modal trigger to child components where needed
    const openBooking = () => {
        setBookingData(null);
        setIsBookingOpen(true);
    };
    const openBookingWithData = (data) => {
        setBookingData(data);
        setIsBookingOpen(true);
    };

    return (
        <div className="relative min-h-screen bg-[#0a0a0a] text-white">
            <AnimatePresence>
                {isLoading && <LoadingScreen key="loader" />}
            </AnimatePresence>

            {!isLoading && (
                <>
                    <Navbar onAdminToggle={() => setIsAdminView(!isAdminView)} isAdminView={isAdminView} onBooking={openBooking} />
                    <main>
                        {isAdminView ? (
                            <AdminPanel />
                        ) : (
                            <>
                                <Hero onBooking={openBooking} />
                                <Services onSelectService={(service) => openBookingWithData({ service })} />
                                <LiveSchedule onSelectSlot={(data) => openBookingWithData(data)} />
                                <Lookbook />
                                <Testimonials />
                                <Location />

                                {/* Call to Action Section */}
                                <section id="booking" className="py-24 border-t border-[#d4af37]/10 bg-gradient-to-b from-[#0a0a0a] to-[#141414]">
                                    <div className="max-w-4xl mx-auto px-6 text-center">
                                        <h2 className="serif text-4xl md:text-6xl font-bold mb-8 italic">
                                            Ready to redefine your <span className="text-[#d4af37]">Identity</span>?
                                        </h2>
                                        <button
                                            onClick={openBooking}
                                            className="gold-button !text-lg !px-12 !py-5"
                                        >
                                            Book Your Seat Now
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* Simple Footer */}
                        <footer className="py-12 border-t border-[#d4af37]/5 text-center text-[#a1a1a1] text-xs tracking-[0.2em] uppercase">
                            <div className="mb-6 flex justify-center gap-12">
                                <a href="#" className="hover:text-[#d4af37] transition-colors">Instagram</a>
                                <a href="#" className="hover:text-[#d4af37] transition-colors">Facebook</a>
                                <a href="#" className="hover:text-[#d4af37] transition-colors">WhatsApp</a>
                            </div>
                            <p
                                onDoubleClick={() => setIsAdminView(!isAdminView)}
                                className="cursor-default select-none transition-colors hover:text-[#d4af37]/50"
                            >
                                &copy; 2024 DCUKUR PRIVATE STUDIO. ALL RIGHTS RESERVED.
                            </p>
                        </footer>
                        {!isAdminView && <WhatsAppButton />}
                    </main>

                    <BookingModal
                        isOpen={isBookingOpen}
                        onClose={() => { setIsBookingOpen(false); setBookingData(null); }}
                        initialData={bookingData}
                    />

                    {/* Global CTA Trigger - Fix Hero/Services buttons by hooking them up if needed, 
              but for now, the App state controls the modal */}
                </>
            )}
        </div>
    );
}

export default App;
