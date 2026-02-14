import React from 'react';
import { motion } from 'framer-motion';

import midFade from '../assets/lookbook/mid-fade.png';
import gentleman from '../assets/lookbook/gentleman.png';
import koreanTwoblock from '../assets/lookbook/korean-twoblock.png';
import slickedBack from '../assets/lookbook/slicked-back.png';
import buzzcut from '../assets/lookbook/buzzcut.png';
import curlyPerm from '../assets/lookbook/curly-perm.png';

const lookbookImages = [
    { id: 1, title: "Modern Mid Fade", category: "Classic", image: midFade },
    { id: 2, title: "Gentleman's Part", category: "Formal", image: gentleman },
    { id: 3, title: "Korean Two Block", category: "Modern", image: koreanTwoblock },
    { id: 4, title: "Sharp Slicked Back", category: "Formal", image: slickedBack },
    { id: 5, title: "Clean Buzzcut", category: "Classic", image: buzzcut },
    { id: 6, title: "Textured Curly Perm", category: "Modern", image: curlyPerm },
];

const Lookbook = () => {
    return (
        <section id="lookbook" className="py-24 bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="uppercase tracking-[0.3em] text-[#d4af37] text-xs"
                        >
                            The Gallery
                        </motion.span>
                        <h2 className="serif text-4xl md:text-5xl font-bold mt-2">The Mastery Lookbook</h2>
                    </div>
                    <p className="max-w-md text-[#a1a1a1] text-sm leading-relaxed">
                        Explore our latest work and find the style that defines your legend. Each cut is a masterpiece of precision and character.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#d4af37]/10">
                    {lookbookImages.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative aspect-square overflow-hidden group border border-[#d4af37]/5"
                        >
                            <div className="absolute inset-0 bg-[#141414] flex items-center justify-center text-[#d4af37]/20 text-xs uppercase tracking-widest font-bold">
                                DCUKUR PORTFOLIO
                            </div>

                            <img
                                src={item.image}
                                alt={item.title}
                                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                            />

                            <motion.div
                                className="absolute inset-0 bg-black/40 group-hover:bg-black/0 transition-all duration-500 z-10"
                            />

                            <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                                <span className="text-[#d4af37] text-[10px] uppercase tracking-widest mb-1">{item.category}</span>
                                <h3 className="serif text-xl font-bold text-white">{item.title}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Lookbook;
