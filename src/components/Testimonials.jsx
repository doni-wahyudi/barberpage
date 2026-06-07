import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
    {
        id: 1,
        name: "Arif Wijaya",
        role: "Pelanggan Setia",
        content: "Gokil sih haircut di Auro! Capster-nya teliti parah, detailnya dapet banget. Hasil potongannya bener-bener pas sama shape muka gua. Auto langganan!",
        stars: 5,
        avatar: "AW"
    },
    {
        id: 2,
        name: "Daniel Santoso",
        role: "Business Executive",
        content: "Vibes studionya cozy abis, berasa eksklusif. Pelayanannya friendly dan capster-nya santuy tapi presisi tinggi pas nyukur. Gak bakal pindah ke barbershop lain.",
        stars: 5,
        avatar: "DS"
    },
    {
        id: 3,
        name: "Budi Pratama",
        role: "Seniman",
        content: "Potongan Two Block di sini beneran tier S! Capster-nya paham banget tren hairstyle cowok jaman sekarang. Treatment-nya bikin rileks maksimal, recommended parah!",
        stars: 5,
        avatar: "BP"
    }
];

const Testimonials = () => {
    const [index, setIndex] = useState(0);

    const next = () => setIndex((prev) => (prev + 1) % testimonials.length);
    const prev = () => setIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

    return (
        <section className="py-24 bg-[#0a0a0a] border-t border-[#d4af37]/5 overflow-hidden">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                    >
                        AUROPeeps Review
                    </motion.span>
                    <h2 className="serif text-4xl md:text-5xl font-bold mt-2 text-white">Kata AUROPeeps</h2>
                </div>

                <div className="relative glass-card p-12 md:p-16">
                    <Quote className="absolute top-8 left-8 text-[#d4af37]/10 w-16 h-16" />

                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={testimonials[index].id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <div className="flex justify-center gap-1 mb-8">
                                {[...Array(testimonials[index].stars)].map((_, i) => (
                                    <Star key={i} size={16} className="fill-[#d4af37] text-[#d4af37]" />
                                ))}
                            </div>

                            <p className="serif text-xl md:text-2xl italic text-[#e1e1e1] leading-relaxed mb-8">
                                "{testimonials[index].content}"
                            </p>

                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-[#d4af37]/20 border border-[#d4af37]/50 rounded-full flex items-center justify-center text-[#d4af37] font-bold mb-3">
                                    {testimonials[index].avatar}
                                </div>
                                <h4 className="font-bold text-white tracking-widest uppercase text-sm">{testimonials[index].name}</h4>
                                <span className="text-[#a1a1a1] text-[10px] uppercase tracking-widest">{testimonials[index].role}</span>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-between items-center mt-12">
                        <button
                            onClick={prev}
                            className="p-3 border border-[#d4af37]/20 rounded-full text-[#a1a1a1] hover:text-[#d4af37] hover:border-[#d4af37] transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex gap-2">
                            {testimonials.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === index ? 'bg-[#d4af37] w-6' : 'bg-[#d4af37]/20'}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={next}
                            className="p-3 border border-[#d4af37]/20 rounded-full text-[#a1a1a1] hover:text-[#d4af37] hover:border-[#d4af37] transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Review CTA */}
                    <div className="mt-12 text-center border-t border-[#d4af37]/10 pt-8">
                        <p className="text-[#a1a1a1] text-sm mb-4">Pernah glow up di Auro?</p>
                        <a
                            href="https://maps.app.goo.gl/6d7BJJDKbcAukKPK8"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 gold-button !py-3 !px-8 text-sm"
                        >
                            <Star size={16} className="fill-black" /> Spill Review Lo di Google!
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
