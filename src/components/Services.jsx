import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, Zap, Crown, Flame } from 'lucide-react';

// Dynamically resolve assets — won't crash if files are missing
const serviceModules = import.meta.glob('../assets/service-*.webp', { eager: true, import: 'default' });
const service1 = serviceModules['../assets/service-1.webp'] || null;
const service2 = serviceModules['../assets/service-2.webp'] || null;
const service3 = serviceModules['../assets/service-3.webp'] || null;
const service4 = serviceModules['../assets/service-4.webp'] || null;

const services = [
    {
        icon: <Scissors size={32} />,
        image: service1,
        title: "Signature Cut",
        price: "$45",
        desc: "Precision fade or classic scissor cut tailored to your face shape and hair texture."
    },
    {
        icon: <Flame size={32} />,
        image: service2,
        title: "Royal Shave",
        price: "$35",
        desc: "Triple-pass hot towel shave with premium essential oils and cold stone finish."
    },
    {
        icon: <Crown size={32} />,
        image: service3,
        title: "The Emperor",
        price: "$75",
        desc: "The ultimate package: Haircut, Beard Sculpt, Facial, and Scalp Massage."
    },
    {
        icon: <Zap size={32} />,
        image: service4,
        title: "Beard Sculpt",
        price: "$25",
        desc: "Expert sharpening and grooming of your beard using premium balms and oils."
    }
];

const Services = () => {
    return (
        <section id="services" className="py-24 bg-[#0a0a0a] relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                    >
                        The Menu
                    </motion.span>
                    <h2 className="serif text-4xl md:text-5xl font-bold mt-2">Executive Services</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={service.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            whileHover={{ y: -10 }}
                            className="glass-card overflow-hidden flex flex-col group cursor-default"
                        >
                            {/* Service Image Placeholder */}
                            <div className="h-48 w-full bg-[#141414] relative overflow-hidden">
                                <img
                                    src={service.image}
                                    alt={service.title}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-50 group-hover:opacity-100"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                                <div className="absolute bottom-4 left-6 text-[#d4af37] group-hover:scale-110 transition-transform duration-500">
                                    {service.icon}
                                </div>
                            </div>

                            <div className="p-8 pt-4 flex flex-col gap-4">
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h3 className="serif text-xl font-bold">{service.title}</h3>
                                        <span className="text-[#d4af37] font-bold">{service.price}</span>
                                    </div>
                                    <p className="text-sm text-[#a1a1a1] leading-relaxed">
                                        {service.desc}
                                    </p>
                                </div>
                                <div className="mt-auto pt-4 border-t border-[#d4af37]/10">
                                    <button className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                                        Select Service
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;
