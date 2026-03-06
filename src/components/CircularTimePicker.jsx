import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, Keyboard } from 'lucide-react';

export const CircularTimePickerUI = ({ value, onChange, bookedSlots = [], startTime = 10, endTime = 21, interval = 5, onComplete }) => {
    const generateTimes = () => {
        const times = [];
        for (let h = startTime; h <= endTime; h++) {
            let maxMins = 55;
            if (h === endTime) maxMins = 30;
            for (let m = 0; m <= maxMins; m += interval) {
                times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }
        return times;
    };

    const [availableTimes, setAvailableTimes] = useState(generateTimes());
    const [selectedHour, setSelectedHour] = useState(value ? parseInt(value.split(':')[0]) : null);
    const [view, setView] = useState(value ? 'minutes' : 'hours');
    const [isDragging, setIsDragging] = useState(false);
    const [dragAngle, setDragAngle] = useState(null);
    const [showInput, setShowInput] = useState(false);
    const [inputHour, setInputHour] = useState('');
    const [inputMinute, setInputMinute] = useState('');
    const clockFaceRef = useRef(null);
    const hourInputRef = useRef(null);

    useEffect(() => {
        setAvailableTimes(generateTimes());
    }, [startTime, endTime, interval]);

    // Focus hour input when switching to manual mode
    useEffect(() => {
        if (showInput && hourInputRef.current) {
            hourInputRef.current.focus();
        }
    }, [showInput]);

    const allHours = Array.from({ length: 24 }, (_, i) => i);

    const minutes = [];
    if (selectedHour !== null) {
        // Always show all 5-minute marks so every slot is pickable
        for (let m = 0; m < 60; m += interval) {
            minutes.push(m);
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
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    };

    const getAngleFromPoint = useCallback((clientX, clientY) => {
        if (!clockFaceRef.current) return 0;
        const rect = clockFaceRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let angle = Math.atan2(clientX - cx, -(clientY - cy)) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        return angle;
    }, []);

    const getDistanceFromCenter = useCallback((clientX, clientY) => {
        if (!clockFaceRef.current) return 0;
        const rect = clockFaceRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.sqrt((clientX - cx) ** 2 + (clientY - cy) ** 2);
    }, []);

    const snapToHour = useCallback((angle, isInner) => {
        const snapped = Math.round(angle / 30) % 12;
        if (isInner) return snapped === 0 ? 0 : snapped + 12;
        return snapped === 0 ? 12 : snapped;
    }, []);

    const snapToMinute = useCallback((angle) => {
        const rawMinute = Math.round(angle / 6) % 60;
        let closest = minutes[0];
        let minDiff = 60;
        for (const m of minutes) {
            const diff = Math.min(Math.abs(rawMinute - m), 60 - Math.abs(rawMinute - m));
            if (diff < minDiff) { minDiff = diff; closest = m; }
        }
        return closest;
    }, [minutes]);

    // Default hand: 12 o'clock for hours, 00 for minutes
    const getHandAngle = () => {
        if (isDragging && dragAngle !== null) return dragAngle;
        if (view === 'hours') {
            if (selectedHour === null) return 0; // default at 12
            return ((selectedHour % 12) / 12) * 360;
        } else {
            if (!value) return 0; // default at 00
            const m = parseInt(value.split(':')[1], 10);
            return (m / 60) * 360;
        }
    };

    const getHandLength = () => {
        if (view === 'hours') {
            if (selectedHour === null) return 105; // outer ring length for default
            const isOuter = selectedHour > 0 && selectedHour <= 12;
            return isOuter ? 105 : 65;
        }
        return 95;
    };

    const handleHourSelect = (h) => {
        if (isHourFullyBooked(h)) return;
        setSelectedHour(h);
        setView('minutes');
        setDragAngle(null);
        if (interval >= 60) handleMinuteSelect(0, h);
    };

    const handleMinuteSelect = (m, h = selectedHour) => {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (isSlotBooked(timeStr)) return;
        onChange(timeStr);
        setView('hours');
        setDragAngle(null);
        if (onComplete) onComplete();
    };

    // --- Direct input handler ---
    const handleDirectInput = () => {
        const h = parseInt(inputHour, 10);
        const m = parseInt(inputMinute, 10);
        if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
            return; // invalid
        }
        // Snap minute to nearest valid interval
        const snappedMin = Math.round(m / interval) * interval;
        const finalMin = snappedMin >= 60 ? 55 : snappedMin;
        const timeStr = `${String(h).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;

        // Check if within operational hours
        if (h < startTime || h > endTime) return;
        if (h === endTime && finalMin > 30) return;
        if (isSlotBooked(timeStr)) return;

        onChange(timeStr);
        setShowInput(false);
        setInputHour('');
        setInputMinute('');
        if (onComplete) onComplete();
    };

    // --- Drag handlers ---
    const handlePointerDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const angle = getAngleFromPoint(e.clientX, e.clientY);
        setDragAngle(angle);
        handleDragMove(e.clientX, e.clientY, angle);
    };

    const handleDragMove = useCallback((clientX, clientY, currentAngle) => {
        const angle = currentAngle !== undefined ? currentAngle : getAngleFromPoint(clientX, clientY);
        setDragAngle(angle);
        if (view === 'hours') {
            const dist = getDistanceFromCenter(clientX, clientY);
            const rect = clockFaceRef.current?.getBoundingClientRect();
            const maxRadius = rect ? rect.width / 2 : 144;
            const isInner = dist < maxRadius * 0.65;
            const h = snapToHour(angle, isInner);
            if (!isHourFullyBooked(h)) {
                setSelectedHour(h);
                setDragAngle(((h % 12) / 12) * 360);
            }
        } else {
            const m = snapToMinute(angle);
            const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (!isSlotBooked(timeStr)) {
                setDragAngle((m / 60) * 360);
            }
        }
    }, [view, getAngleFromPoint, getDistanceFromCenter, snapToHour, snapToMinute, selectedHour]);

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
    }, [isDragging, handleDragMove]);

    const handlePointerUp = useCallback((e) => {
        if (!isDragging) return;
        setIsDragging(false);
        if (view === 'hours') {
            if (selectedHour !== null && !isHourFullyBooked(selectedHour)) {
                setView('minutes');
                setDragAngle(null);
                if (interval >= 60) handleMinuteSelect(0, selectedHour);
            }
        } else {
            const angle = getAngleFromPoint(e.clientX, e.clientY);
            const m = snapToMinute(angle);
            handleMinuteSelect(m);
        }
    }, [isDragging, view, selectedHour, getAngleFromPoint, snapToMinute]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove, { passive: false });
            window.addEventListener('pointerup', handlePointerUp);
            return () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
            };
        }
    }, [isDragging, handlePointerMove, handlePointerUp]);

    const handAngle = getHandAngle();
    const handLength = getHandLength();

    // For 5-min intervals: show labels only at 0, 5, 10, 15... positions on the outer ring
    // and small tick dots for all positions
    const minuteLabels = minutes;

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-[#141414] border border-[#d4af37]/20 rounded-lg select-none shadow-[0_10px_40px_rgba(0,0,0,0.8)] mx-auto w-full max-w-[340px]">
            {/* Header Display - click to toggle direct input */}
            {showInput ? (
                <div className="flex items-center gap-2 mb-6">
                    <input
                        ref={hourInputRef}
                        type="number"
                        min="0"
                        max="23"
                        placeholder="HH"
                        value={inputHour}
                        onChange={(e) => setInputHour(e.target.value.slice(0, 2))}
                        onKeyDown={(e) => e.key === 'Enter' && handleDirectInput()}
                        className="w-14 text-center bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 text-[#d4af37] font-mono text-xl focus:outline-none focus:border-[#d4af37]"
                    />
                    <span className="text-[#555] text-xl font-mono">:</span>
                    <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="MM"
                        value={inputMinute}
                        onChange={(e) => setInputMinute(e.target.value.slice(0, 2))}
                        onKeyDown={(e) => e.key === 'Enter' && handleDirectInput()}
                        className="w-14 text-center bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 text-[#d4af37] font-mono text-xl focus:outline-none focus:border-[#d4af37]"
                    />
                    <button
                        type="button"
                        onClick={handleDirectInput}
                        className="ml-2 px-3 py-2 bg-[#d4af37] text-black rounded text-xs font-bold hover:bg-[#f5d77a] transition-colors"
                    >
                        OK
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowInput(false)}
                        className="ml-1 px-2 py-2 border border-[#333] text-[#a1a1a1] rounded text-xs hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 mb-6 font-mono text-xl">
                    <button
                        type="button"
                        onClick={() => { setView('hours'); setDragAngle(null); }}
                        className={`px-3 py-1 rounded transition-colors ${view === 'hours' ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-white hover:text-[#d4af37]'}`}
                    >
                        {selectedHour !== null ? String(selectedHour).padStart(2, '0') : '--'}
                    </button>
                    <span className="text-[#555]">:</span>
                    <button
                        type="button"
                        onClick={() => { if (selectedHour !== null) { setView('minutes'); setDragAngle(null); } }}
                        disabled={selectedHour === null}
                        className={`px-3 py-1 rounded transition-colors ${selectedHour === null ? 'text-[#333] cursor-not-allowed' : view === 'minutes' ? 'text-[#d4af37] bg-[#d4af37]/10' : 'text-white hover:text-[#d4af37]'}`}
                    >
                        {value ? value.split(':')[1] : '--'}
                    </button>
                    {/* Keyboard icon to switch to direct input */}
                    <button
                        type="button"
                        onClick={() => { setShowInput(true); setInputHour(selectedHour !== null ? String(selectedHour) : ''); setInputMinute(value ? value.split(':')[1] : ''); }}
                        className="ml-2 p-1.5 rounded hover:bg-[#d4af37]/10 text-[#a1a1a1] hover:text-[#d4af37] transition-colors"
                        title="Ketik waktu langsung"
                    >
                        <Keyboard size={16} />
                    </button>
                </div>
            )}

            {/* Circular Face Container */}
            {!showInput && (
                <div
                    ref={clockFaceRef}
                    className="relative w-72 h-72 rounded-full bg-[#0a0a0a] border border-[#333] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center text-sm md:text-base shrink-0 touch-none"
                    onPointerDown={handlePointerDown}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    {/* Center dot */}
                    <div className="absolute w-3 h-3 rounded-full bg-[#d4af37] z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />

                    {/* Clock Hand - always visible with default pointing at 12/00 */}
                    <div
                        className="absolute z-20 origin-bottom pointer-events-none"
                        style={{
                            left: 'calc(50% - 1.5px)',
                            bottom: '50%',
                            width: '3px',
                            height: `${handLength}px`,
                            transform: `rotate(${handAngle}deg)`,
                            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s ease',
                            background: 'linear-gradient(to top, #d4af37, #f5d77a)',
                            borderRadius: '2px',
                            boxShadow: '0 0 8px rgba(212,175,55,0.4)',
                        }}
                    >
                        {/* Tip circle */}
                        <div
                            className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 border-[#d4af37] bg-[#d4af37]/20 backdrop-blur-sm pointer-events-none"
                            style={{ boxShadow: '0 0 12px rgba(212,175,55,0.5)' }}
                        />
                    </div>

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
                                    const pos = getPosition(index, 12, radius);
                                    const isBooked = isHourFullyBooked(h);
                                    const isSelected = selectedHour === h;
                                    const displayHour = h === 0 ? '00' : String(h);

                                    return (
                                        <button
                                            key={h}
                                            type="button"
                                            disabled={isBooked}
                                            onClick={(e) => { e.stopPropagation(); handleHourSelect(h); }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs sm:text-sm transition-all focus:outline-none
                                                ${isBooked ? 'text-[#333] cursor-not-allowed' :
                                                    isSelected ? 'bg-[#d4af37] text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.5)] z-20 scale-110' :
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
                                {/* Minute tick marks for all positions */}
                                {minuteLabels.map((m) => {
                                    const pos = getPosition(m, 60, 105);
                                    const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                    const isBooked = isSlotBooked(timeStr);
                                    const isSelected = value === timeStr;
                                    const isMajor = m % 15 === 0; // 00, 15, 30, 45 are large
                                    const isMedium = m % 5 === 0 && !isMajor; // 5, 10, 20, 25... medium

                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            disabled={isBooked}
                                            onClick={(e) => { e.stopPropagation(); handleMinuteSelect(m); }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className={`absolute rounded-full flex items-center justify-center transition-all focus:outline-none
                                                ${isMajor ? 'w-10 h-10 text-sm font-semibold' : isMedium ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]'}
                                                ${isBooked ? 'text-[#333] cursor-not-allowed' :
                                                    isSelected ? 'bg-[#d4af37] text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.5)] z-20 scale-110' :
                                                        isMajor ? 'text-[#ccc] hover:bg-[#d4af37]/20 hover:text-white' :
                                                            'text-[#777] hover:bg-[#d4af37]/20 hover:text-white'}
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
            )}

            {/* Hint text */}
            {!showInput && (
                <p className="mt-4 text-[10px] text-[#555] uppercase tracking-widest">
                    {isDragging ? '🔄 Geser untuk memilih...' : view === 'hours' ? 'Tap atau geser jarum jam' : 'Tap atau geser jarum menit'}
                </p>
            )}

            {view === 'minutes' && !showInput && (
                <button
                    type="button"
                    className="mt-3 px-4 py-2 border border-[#333] rounded hover:border-[#d4af37]/50 text-xs text-[#a1a1a1] hover:text-white transition-colors"
                    onClick={() => { setView('hours'); setDragAngle(null); }}
                >
                    &larr; Kembali ke Jam
                </button>
            )}
        </div>
    );
};

const CircularTimePicker = ({ value, onChange, bookedSlots = [], startTime = 10, endTime = 21, interval = 5 }) => {
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
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />
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
