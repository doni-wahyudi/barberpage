import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, MessageSquareText, Send, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const categories = ['Saran', 'Keluhan', 'Pujian', 'Lainnya'];

const initialForm = {
    name: '',
    phoneNumber: '',
    category: 'Saran',
    message: ''
};

const FeedbackButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const resetAndClose = () => {
        setIsOpen(false);
        setStatus('idle');
        setError('');
        setForm(initialForm);
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const message = form.message.trim();
        if (message.length < 5) {
            setError('Mohon tuliskan masukan minimal 5 karakter.');
            return;
        }

        setStatus('submitting');
        setError('');

        const { error: submitError } = await supabase
            .from('feedback_submissions')
            .insert([{
                name: form.name.trim() || null,
                phone_number: form.phoneNumber.trim() || null,
                category: form.category,
                message,
                source: 'barberpage_home'
            }]);

        if (submitError) {
            console.error('Failed to submit feedback:', submitError);
            setStatus('idle');
            setError('Masukan belum terkirim. Silakan coba beberapa saat lagi.');
            return;
        }

        setStatus('submitted');
        setForm(initialForm);
    };

    return (
        <>
            <div className="fixed bottom-24 right-6 sm:right-8 z-[90] group">
                <motion.button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.06, y: -4 }}
                    whileTap={{ scale: 0.94 }}
                    className="relative w-14 h-14 bg-[#141414]/95 text-[#d4af37] rounded-full flex items-center justify-center shadow-[0_12px_32px_rgba(0,0,0,0.45)] overflow-hidden border border-[#d4af37]/45 backdrop-blur-md transition-colors hover:bg-[#d4af37] hover:text-[#0a0a0a] hover:border-[#f1d592]"
                    aria-label="Buka formulir saran dan masukan"
                >
                    <motion.div
                        animate={{ scale: [1, 1.45, 1], opacity: [0.18, 0, 0.18] }}
                        transition={{ duration: 2.6, repeat: Infinity }}
                        className="absolute inset-0 bg-[#d4af37] rounded-full pointer-events-none"
                    />
                    <span className="absolute inset-1 rounded-full border border-white/5 pointer-events-none" />
                    <MessageSquareText size={26} className="relative z-10" />
                </motion.button>
                <div className="pointer-events-none absolute right-[4.25rem] top-1/2 -translate-y-1/2 w-max max-w-[220px] rounded border border-[#d4af37]/35 bg-[#141414]/95 px-4 py-2 text-left shadow-2xl opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d4af37]">Saran dan Masukan</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#e1e1e1]">Kirim ide, keluhan, atau masukan untuk Auro.</p>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                        onClick={resetAndClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 28, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{ duration: 0.22 }}
                            className="w-full max-w-md glass-card bg-[#141414] p-6 sm:p-7 relative"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={resetAndClose}
                                className="absolute top-4 right-4 w-9 h-9 rounded-full border border-[#d4af37]/20 text-[#a1a1a1] hover:text-white hover:border-[#d4af37]/60 transition-colors flex items-center justify-center"
                                aria-label="Tutup formulir"
                            >
                                <X size={18} />
                            </button>

                            {status === 'submitted' ? (
                                <div className="py-8 text-center">
                                    <CheckCircle2 size={46} className="mx-auto text-[#d4af37] mb-5" />
                                    <h2 className="serif text-3xl font-bold italic mb-3">Terima kasih.</h2>
                                    <p className="text-[#a1a1a1] text-sm leading-relaxed mb-7">
                                        Saran dan masukan Anda sudah kami terima.
                                    </p>
                                    <button type="button" onClick={resetAndClose} className="gold-button w-full">
                                        Selesai
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="pr-10 mb-6">
                                        <p className="uppercase tracking-[0.25em] text-[#d4af37] text-[10px] mb-2">
                                            Saran dan Masukan
                                        </p>
                                        <h2 className="serif text-3xl font-bold italic text-white">Bantu kami lebih baik</h2>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className="block">
                                                <span className="block text-[10px] uppercase tracking-widest text-[#a1a1a1] mb-2">Nama</span>
                                                <input
                                                    value={form.name}
                                                    onChange={(event) => handleChange('name', event.target.value)}
                                                    className="w-full bg-[#0a0a0a] border border-[#d4af37]/20 rounded px-3 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#d4af37] transition-colors"
                                                    placeholder="Opsional"
                                                    maxLength={80}
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="block text-[10px] uppercase tracking-widest text-[#a1a1a1] mb-2">WhatsApp</span>
                                                <input
                                                    value={form.phoneNumber}
                                                    onChange={(event) => handleChange('phoneNumber', event.target.value)}
                                                    className="w-full bg-[#0a0a0a] border border-[#d4af37]/20 rounded px-3 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#d4af37] transition-colors"
                                                    placeholder="Opsional"
                                                    inputMode="tel"
                                                    maxLength={24}
                                                />
                                            </label>
                                        </div>

                                        <label className="block">
                                            <span className="block text-[10px] uppercase tracking-widest text-[#a1a1a1] mb-2">Kategori</span>
                                            <select
                                                value={form.category}
                                                onChange={(event) => handleChange('category', event.target.value)}
                                                className="w-full bg-[#0a0a0a] border border-[#d4af37]/20 rounded px-3 py-3 text-sm text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                                            >
                                                {categories.map((category) => (
                                                    <option key={category} value={category}>{category}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="block">
                                            <span className="block text-[10px] uppercase tracking-widest text-[#a1a1a1] mb-2">Pesan</span>
                                            <textarea
                                                required
                                                value={form.message}
                                                onChange={(event) => handleChange('message', event.target.value)}
                                                className="w-full min-h-[120px] resize-none bg-[#0a0a0a] border border-[#d4af37]/20 rounded px-3 py-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#d4af37] transition-colors"
                                                placeholder="Tuliskan saran, keluhan, atau masukan Anda..."
                                                maxLength={1000}
                                            />
                                        </label>

                                        {error && (
                                            <div className="flex items-start gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-xs">
                                                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={status === 'submitting'}
                                            className="gold-button w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {status === 'submitting' ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Mengirim
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={17} />
                                                    Kirim Masukan
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default FeedbackButton;
