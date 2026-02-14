import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import heroBg from '../assets/hero-bg.png';
import heroVideo from '../assets/hero-video.mp4';

const Hero = ({ onBooking }) => {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);
    const bgY = useTransform(scrollY, [0, 500], [0, 100]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    return (
        <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image/Video with Parallax */}
            <motion.div
                style={{ y: bgY }}
                className="absolute inset-0 z-0"
            >
                {/* Background Image (behind video as fallback) */}
                {heroBg && (
                    <img
                        src={heroBg}
                        alt="Barbershop Atmosphere"
                        className="w-full h-full object-cover absolute inset-0"
                    />
                )}

                {/* Video overlay (plays on top of image) */}
                {heroVideo && (
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    >
                        <source src={heroVideo} type="video/mp4" />
                    </video>
                )}

                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/50 z-[1]" />
            </motion.div>

            {/* Background Parallax Element */}
            <motion.div
                style={{ y: y1 }}
                className="absolute inset-0 z-[2] flex items-center justify-center opacity-10 pointer-events-none"
            >
                <h1 className="serif text-[40vw] font-bold text-white select-none whitespace-nowrap">
                    DCUKUR
                </h1>
            </motion.div>

            {/* Main Content */}
            <div className="relative z-[3] text-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ opacity }}
                >
                    <p className="uppercase tracking-[0.5em] text-[#d4af37] text-sm mb-4">
                        The Royalty of Grooming
                    </p>
                    <h2 className="serif text-5xl md:text-8xl font-bold mb-8 leading-tight">
                        Elevate Your <br />
                        <span className="gold-gradient italic">Legendary</span> Look
                    </h2>
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                        <button onClick={onBooking} className="gold-button">Reserve Your Seat</button>
                        <button
                            onClick={() => document.getElementById('lookbook')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 border border-[#d4af37]/30 text-white uppercase tracking-widest text-xs hover:bg-[#d4af37]/10 transition-all"
                        >
                            View Lookbook
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Visual Accents */}
            <motion.div
                style={{ y: y2 }}
                className="absolute bottom-10 left-10 md:left-20 border-l border-[#d4af37] pl-4 hidden md:block"
            >
                <p className="text-[10px] uppercase tracking-widest text-[#a1a1a1] mb-2">Since 2024</p>
                <p className="serif italic text-[#d4af37]">Crafted with Precision</p>
            </motion.div>

            <div className="absolute bottom-10 right-10 md:right-20 hidden md:block">
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-px h-20 bg-gradient-to-b from-[#d4af37] to-transparent"
                />
            </div>
        </section>
    );
};

export default Hero;
