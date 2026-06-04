import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Scissors, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreSettings } from '../utils/useStoreSettings';

const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH} ${ampm}`;
};

const Navbar = ({ onAdminToggle, isAdminView, onBooking }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const lastScrollY = useRef(0);
    const { settings } = useStoreSettings();

    useEffect(() => {
        const checkOpenStatus = () => {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const daySchedule = settings.daily_hours.find(d => d.dayOfWeek === dayOfWeek);

            if (!daySchedule || daySchedule.isHoliday) {
                setIsOpen(false);
                return;
            }

            const currentMins = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = daySchedule.openingHour.split(':').map(Number);
            const [endH, endM] = daySchedule.closingHour.split(':').map(Number);
            
            const openMins = startH * 60 + startM;
            const closeMins = endH * 60 + endM;

            setIsOpen(currentMins >= openMins && currentMins < closeMins);
        };

        checkOpenStatus();
        const interval = setInterval(checkOpenStatus, 60000); // check every minute
        return () => clearInterval(interval);
    }, [settings]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 50 !== scrolled) {
                setScrolled(currentScrollY > 50);
            }

            // Hide navbar on scroll down, show on scroll up (mobile focus)
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsVisible(false);
                if (mobileMenuOpen) setMobileMenuOpen(false);
            } else {
                setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolled, mobileMenuOpen]);

    const navLinks = [
        { name: 'Beranda', href: '#home' },
        { name: 'Layanan', href: '#services' },
        { name: 'Jadwal', href: '#schedule' },
        { name: 'Gaya Berambut', href: '#lookbook' },
        { name: 'Reservasi', href: '#booking' },
    ];

    const todayOfWeek = new Date().getDay();
    const todaySchedule = settings.daily_hours.find(d => d.dayOfWeek === todayOfWeek);
    const displayHoursText = todaySchedule && !todaySchedule.isHoliday
        ? `${formatTime12h(todaySchedule.openingHour)} - ${formatTime12h(todaySchedule.closingHour)}`
        : 'CLOSED';

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/90 backdrop-blur-md py-4 border-b border-[#d4af37]/20' : 'bg-transparent py-6'
                } ${!isVisible ? '-translate-y-full opacity-0 md:translate-y-0 md:opacity-100' : 'translate-y-0 opacity-100'}`}
        >
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => isAdminView && onAdminToggle()}
                >
                    <img src={`${import.meta.env.BASE_URL}auro_logo.webp`} alt="Auro Logo" className="h-14 md:h-20 py-1 object-contain" />
                    {!isAdminView && (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'} animate-pulse`} />
                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                                    {isOpen ? 'Open Now' : 'Closed'}
                                </span>
                            </div>
                            <span className="text-[8px] text-[#555] uppercase tracking-widest mt-0.5">{displayHoursText}</span>
                        </div>
                    )}
                </motion.div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    {isAdminView ? (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={onAdminToggle}
                            className="gold-button !py-2 !px-6 !text-xs"
                        >
                            Keluar Mode Admin
                        </motion.button>
                    ) : (
                        <>
                            {navLinks.map((link, index) => (
                                <motion.a
                                    key={link.name}
                                    href={link.href}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="text-xs uppercase tracking-widest hover:text-[#d4af37] transition-colors"
                                >
                                    {link.name}
                                </motion.a>
                            ))}
                            <Link
                                to="/check"
                                className="text-xs uppercase tracking-widest text-[#a1a1a1] hover:text-[#d4af37] transition-colors flex items-center gap-2"
                            >
                                <Search size={14} /> Cek Reservasi
                            </Link>
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={onBooking}
                                className="gold-button !py-2 !px-6 !text-xs"
                            >
                                Reservasi
                            </motion.button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-[#d4af37]"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu Backdrop & Content */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="md:hidden absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-[#d4af37]/20 py-8 px-6 flex flex-col gap-6 items-center"
                    >
                        {isAdminView ? (
                            <button
                                onClick={() => {
                                    onAdminToggle();
                                    setMobileMenuOpen(false);
                                }}
                                className="gold-button w-full"
                            >
                                Keluar Mode Admin
                            </button>
                        ) : (
                            <>
                                {navLinks.map((link) => (
                                    <a
                                        key={link.name}
                                        href={link.href}
                                        className="text-sm uppercase tracking-widest text-white/80 hover:text-[#d4af37] transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </a>
                                ))}
                                <div className="flex flex-col gap-4 w-full mt-2">
                                    <Link to="/check" onClick={() => setMobileMenuOpen(false)} className="py-3 px-6 bg-transparent border border-[#333] hover:border-[#d4af37]/50 transition-colors text-sm uppercase tracking-widest rounded text-center text-white flex justify-center items-center gap-2">
                                        <Search size={16} /> Cek Reservasi
                                    </Link>
                                    <button onClick={() => { onBooking(); setMobileMenuOpen(false); }} className="gold-button w-full">Reservasi</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
