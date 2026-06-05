import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import LiveSchedule from './components/LiveSchedule';
import Lookbook from './components/Lookbook';
import BookingModal from './components/BookingModal';
import LoadingScreen from './components/LoadingScreen';
import QueueMonitor from './components/QueueMonitor';
import MobileBooking from './components/MobileBooking';
import CheckOrder from './components/CheckOrder';
import Catalog from './components/Catalog';
import AdminCategories from './components/AdminCategories';
import AdminLogin from './components/AdminLogin';
import AdminInsights from './components/AdminInsights';
import AdminProducts from './components/AdminProducts';
import AdminSettings from './components/AdminSettings';
import AdminServices from './components/AdminServices';
import AdminBarbers from './components/AdminBarbers';
import AdminFeedback from './components/AdminFeedback';
import { Routes, Route } from 'react-router-dom';

import AdminPanel from './components/AdminPanel';
import AdminGallery from './components/AdminGallery';
import Testimonials from './components/Testimonials';
import Location from './components/Location';
import Team from './components/Team';
import WhatsAppButton from './components/WhatsAppButton';
import FeedbackButton from './components/FeedbackButton';
import RefreshButton from './components/RefreshButton';
import Leaderboard from './components/Leaderboard';
import GalleryPage from './components/GalleryPage';

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    useEffect(() => {
        // Simulate initial loading for a premium feel
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            const scrollPosition = sessionStorage.getItem('scrollPosition');
            if (scrollPosition) {
                const timer = setTimeout(() => {
                    window.scrollTo({
                        top: parseInt(scrollPosition, 10),
                        behavior: 'instant'
                    });
                    sessionStorage.removeItem('scrollPosition');
                }, 150); // Give 150ms for layout to settle
                return () => clearTimeout(timer);
            }
        }
    }, [isLoading]);
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
                    <Routes>
                        <Route path="/" element={
                            <>
                                <Navbar onBooking={openBooking} />
                                <main>
                                    <Hero onBooking={openBooking} />
                                    <Services onSelectService={(service) => openBookingWithData({ service })} />
                                    <LiveSchedule onSelectSlot={(data) => openBookingWithData(data)} />
                                    <Lookbook />
                                    <Team />
                                    <Testimonials />
                                    <Leaderboard />
                                    <Location />

                                    {/* Call to Action Section */}
                                    <section id="booking" className="py-24 border-t border-[#d4af37]/10 bg-gradient-to-b from-[#0a0a0a] to-[#141414]">
                                        <div className="max-w-4xl mx-auto px-6 text-center">
                                            <h2 className="serif text-4xl md:text-6xl font-bold mb-8 italic">
                                                Siap <span className="text-[#d4af37]">Level Up</span> Gaya Lo!?
                                            </h2>
                                            <button
                                                onClick={openBooking}
                                                className="gold-button !text-lg !px-12 !py-5"
                                            >
                                                Booking Sekarang
                                            </button>
                                        </div>
                                    </section>

                                    {/* Simple Footer */}
                                    <footer className="py-12 border-t border-[#d4af37]/5 text-center text-[#a1a1a1] text-xs tracking-[0.2em] uppercase">
                                        <div className="mb-6 flex justify-center gap-12">
                                            <a href="https://instagram.com/aurobarbershop.id" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-colors">Instagram</a>
                                            <a href="https://tiktok.com/@aurobarbershop.id" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-colors">TikTok</a>
                                            <a href="https://wa.me/6285219461408" target="_blank" rel="noopener noreferrer" className="hover:text-[#d4af37] transition-colors">WhatsApp</a>
                                        </div>
                                        <p className="cursor-default select-none text-[#a1a1a1]/50">
                                            &copy; {new Date().getFullYear()} AURO BARBERSHOP. HAK CIPTA DILINDUNGI.
                                        </p>
                                    </footer>
                                    <RefreshButton />
                                    <FeedbackButton />
                                    <WhatsAppButton />
                                </main>
                            </>
                        } />
                        <Route path="/book" element={<MobileBooking />} />
                        <Route path="/check" element={<CheckOrder />} />
                        <Route path="/gallery" element={<GalleryPage />} />
                        <Route path="/queue/:id" element={<QueueMonitor />} />
                        <Route path="/_studio_admin" element={<AdminPanel />} />
                        <Route path="/_studio_admin/login" element={<AdminLogin />} />
                        <Route path="/_studio_admin/insights" element={<AdminInsights />} />
                        <Route path="/_studio_admin/feedback" element={<AdminFeedback />} />
                        <Route path="/_studio_admin/products" element={<AdminProducts />} />
                        <Route path="/_studio_admin/services" element={<AdminServices />} />
                        <Route path="/_studio_admin/capsters" element={<AdminBarbers />} />
                        <Route path="/_studio_admin/gallery" element={<AdminGallery />} />
                        <Route path="/_studio_admin/categories" element={<AdminCategories />} />
                        <Route path="/_studio_admin/settings" element={<AdminSettings />} />
                    </Routes>

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
