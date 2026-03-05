import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown } from 'lucide-react';

export const CircularTimePickerUI = ({ value, onChange, bookedSlots = [], startTime = 10, endTime = 21, interval = 10, onComplete }) => {
    // Generate all valid times based on interval
    const generateTimes = () => {
        const times = [];
        for (let h = startTime; h <= endTime; h++) {
            let maxMins = 50;
            if (h === endTime) {
                maxMins = 30; // 21:30 last booking
            }
            for (let m = 0; m <= maxMins; m += interval) {
                times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        return times;
    };

    const [availableTimes, setAvailableTimes] = useState(generateTimes());
    const [selectedHour, setSelectedHour] = useState(value ? parseInt(value.split(':')[0]) : null);
    const [view, setView] = useState(value ? 'minutes' : 'hours');

    useEffect(() => {
        setAvailableTimes(generateTimes());
    }, [startTime, endTime, interval]);

    const allHours = Array.from({ length: 24 }, (_, i) => i);

    const minutes = [];
    if (selectedHour !== null) {
        const hourPrefix = String(selectedHour).padStart(2, '0');
        const validTimesForHour = availableTimes.filter(t => t.startsWith(hourPrefix));
        validTimesForHour.forEach(t => {
            minutes.push(parseInt(t.split(':')[1], 10));
        });

        if (minutes.length === 0) {
            for (let m = 0; m < 60; m += interval) {
                minutes.push(m);
            }
        }
    }

    const parseTime = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const isSlotBooked = (timeStr) => {
        const slotMins = parseTime(timeStr);
        return bookedSlots.some(b => Math.abs(slotMins - parseTime(b)) < 60);
    };

    const isHourFullyBooked = (h) => {
        const hourPrefix = String(h).padStart(2, '0');
        const availableInHour = availableTimes.filter(t => t.startsWith(hourPrefix));
        if (availableInHour.length === 0) return true;
        return availableInHour.every(slot => isSlotBooked(slot));
    };

    const getPosition = (index, total, radius) => {
        const angle = ((index / total) * 360 - 90) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return { x, y };
    };

    const handleHourSelect = (h) => {
        if (isHourFullyBooked(h)) return;
        setSelectedHour(h);
        setView('minutes');
        if (interval >= 60) {
            handleMinuteSelect(0, h);
        }
    };

    const handleMinuteSelect = (m, h = selectedHour) => {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (isSlotBooked(timeStr)) return;

        onChange(timeStr);
        setView('hours'); // Reset for next open
        if (onComplete) onComplete();
    };

    // Center dot coords logic moved completely to flex alignment inside relative container
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-[#141414] border border-[#d4af37]/20 rounded-lg select-none shadow-[0_10px_40px_rgba(0,0,0,0.8)] mx-auto w-full max-w-[340px]">
            {/* Header Display */}
            <div className="flex items-center gap-2 mb-6 font-mono text-xl">
                <button
                    type="button"
                    onClick={() => setView('hours')}
                    className={`px-3 py-1 rounded transition-colors ${view === 'hours' ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-white hover:text-[#d4af37]'}`}
                >
                    {selectedHour !== null ? String(selectedHour).padStart(2, '0') : '--'}
                </button>
                <span className="text-[#555]">:</span>
                <button
                    type="button"
                    onClick={() => selectedHour !== null && setView('minutes')}
                    disabled={selectedHour === null}
                    className={`px-3 py-1 rounded transition-colors ${selectedHour === null ? 'text-[#333] cursor-not-allowed' : view === 'minutes' ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-white hover:text-[#d4af37]'}`}
                >
                    {value ? value.split(':')[1] : '--'}
                </button>
            </div>

            {/* Circular Face Container */}
            <div className="relative w-72 h-72 sm:w-64 sm:h-64 rounded-full bg-[#0a0a0a] border border-[#333] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center text-sm md:text-base scale-90 sm:scale-100 shrink-0">

                {/* Center point absolute marker */}
                <div className="absolute w-2 h-2 rounded-full bg-[#d4af37] z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />

                <AnimatePresence mode="wait">
                    {view === 'hours' ? (
                        <motion.div
                            key="hours"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0"
                        >
                            {allHours.map((h) => {
                                const isOuter = h > 0 && h <= 12;
                                const radius = isOuter ? 115 : 75;

                                let index = h % 12;
                                if (h === 12 || h === 0) index = 0;
                                const total = 12;

                                const pos = getPosition(index, total, radius);
                                const isBooked = isHourFullyBooked(h);
                                const isSelected = selectedHour === h;
                                const displayHour = h === 0 ? '00' : String(h);

                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => handleHourSelect(h)}
                                        className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50
                                            ${isBooked ? 'text-[#333] cursor-not-allowed' :
                                                isSelected ? 'bg-[#d4af37] text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.5)] z-20' :
                                                    'text-[#a1a1a1] hover:bg-[#d4af37]/20 hover:text-white'}
                                        `}
                                        style={{
                                            left: `calc(50% + ${pos.x}px)`,
                                            top: `calc(50% + ${pos.y}px)`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        {displayHour}
                                    </button>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="minutes"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0"
                        >
                            {/* Clock hand SVG logic preserved but correctly centered */}
                            <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
                                {minutes.map((m) => {
                                    const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                    if (value === timeStr) {
                                        return (
                                            <div
                                                key={m}
                                                className="absolute origin-bottom bg-[#d4af37]"
                                                style={{
                                                    left: 'calc(50% - 1px)',
                                                    bottom: '50%',
                                                    width: '2px',
                                                    height: '100px',
                                                    transform: `rotate(${m * 6}deg)`
                                                }}
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            {minutes.map((m) => {
                                const pos = getPosition(m, 60, 105);
                                const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                const isBooked = isSlotBooked(timeStr);
                                const isSelected = value === timeStr;

                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        disabled={isBooked}
                                        onClick={() => handleMinuteSelect(m)}
                                        className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50
                                            ${isBooked ? 'text-[#333] cursor-not-allowed' :
                                                isSelected ? 'bg-[#d4af37] text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.5)] z-20' :
                                                    'text-[#a1a1a1] hover:bg-[#d4af37]/20 hover:text-white'}
                                        `}
                                        style={{
                                            left: `calc(50% + ${pos.x}px)`,
                                            top: `calc(50% + ${pos.y}px)`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        {String(m).padStart(2, '0')}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {view === 'minutes' && (
                <button
                    type="button"
                    className="mt-6 px-4 py-2 border border-[#333] rounded hover:border-[#d4af37]/50 text-xs text-[#a1a1a1] hover:text-white transition-colors"
                    onClick={() => setView('hours')}
                >
                    &larr; Kembali ke Jam
                </button>
            )}
        </div>
    );
};

const CircularTimePicker = ({ value, onChange, bookedSlots = [], startTime = 10, endTime = 21, interval = 10 }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            <Clock size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50 z-10" />
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors text-sm text-left appearance-none text-white relative flex justify-between items-center"
            >
                <span>{value || <span className="text-[#a1a1a1]">Pilih Waktu</span>}</span>
                <ChevronDown size={14} className={`text-[#a1a1a1] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                            {/* Backdrop overlay */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />
                            {/* Centered Modal */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.15 }}
                                className="relative w-full max-w-[340px] z-10"
                            >
                                <CircularTimePickerUI
                                    value={value}
                                    onChange={onChange}
                                    bookedSlots={bookedSlots}
                                    startTime={startTime}
                                    endTime={endTime}
                                    interval={interval}
                                    onComplete={() => setIsOpen(false)}
                                />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default CircularTimePicker;
