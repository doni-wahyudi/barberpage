import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Scissors } from 'lucide-react';

const Navbar = ({ onAdminToggle, isAdminView, onBooking }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Services', href: '#services' },
        { name: 'Schedule', href: '#schedule' },
        { name: 'Lookbook', href: '#lookbook' },
        { name: 'Booking', href: '#booking' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0a0a0a]/90 backdrop-blur-md py-4 border-b border-[#d4af37]/20' : 'bg-transparent py-6'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => isAdminView && onAdminToggle()}
                >
                    <Scissors className="text-[#d4af37]" size={24} />
                    <span className="serif text-xl font-bold tracking-widest text-[#d4af37]">DCUKUR</span>
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
                            Exit Admin Mode
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
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={onBooking}
                                className="gold-button !py-2 !px-6 !text-xs"
                            >
                                Book Now
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
                                Exit Admin Mode
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
                                <button onClick={() => { onBooking(); setMobileMenuOpen(false); }} className="gold-button w-full">Book Now</button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
