import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, User, Phone, CheckCircle, ChevronLeft, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const VoucherClaim = ({ onVoucherApplied, initialPhone = '' }) => {
    const [stage, setStage] = useState(0); // 0: Init, 1: Select Program, 2: Input Info, 3: OTP, 4: Success
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [npm, setNpm] = useState('');
    const [phone, setPhone] = useState(initialPhone);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [maskedEmail, setMaskedEmail] = useState('');
    const [expiryMinutes, setExpiryMinutes] = useState(10);
    const [successData, setSuccessData] = useState(null);
    
    const otpRefs = useRef([]);

    useEffect(() => {
        setPhone(initialPhone);
        if (stage === 4) {
            setStage(0);
            setSuccessData(null);
            setSelectedProgram(null);
            setNpm('');
            onVoucherApplied(null);
        }
    }, [initialPhone]);

    const fetchPrograms = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase
                .from('promotion_programs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPrograms(data || []);
            setStage(1);
        } catch (err) {
            console.error('Error fetching programs:', err);
            setError('Gagal memuat daftar program.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        
        if (!npm || !phone) {
            setError('Mohon isi NPM dan Nomor HP.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.functions.invoke('send-voucher-otp', {
                body: { npm, phone, program_id: selectedProgram.id }
            });

            if (error) {
                console.error('OTP Error:', error);
                let message = 'Gagal mengirim OTP. Pastikan data benar.';
                
                // Handle specific 409 Conflict error from Supabase Edge Function
                if (error.context && error.context.status === 409) {
                    message = 'Voucher ini sudah pernah diklaim untuk NPM tersebut.';
                } else if (error.message) {
                    // Try to parse JSON error if it's a stringified JSON from edge function
                    try {
                        const parsed = JSON.parse(error.message);
                        if (parsed.error) message = parsed.error;
                    } catch(e) {
                        message = error.message;
                    }
                }
                
                setError(message);
                return;
            }

            if (data && data.error) {
                setError(data.error);
                return;
            }

            setMaskedEmail(data.maskedEmail);
            setExpiryMinutes(data.expiryMinutes || 10);
            setStage(3);
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan sistem.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^[0-9]*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Masukkan 6 digit kode OTP.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.functions.invoke('verify-voucher-otp', {
                body: { npm, otp_code: otpCode, program_id: selectedProgram.id }
            });

            if (error) {
                console.error('Verify Error:', error);
                let message = 'Gagal memverifikasi OTP.';
                
                if (error.context && error.context.status === 409) {
                    message = 'Maaf, voucher ini baru saja diklaim.';
                } else if (error.message) {
                    try {
                        const parsed = JSON.parse(error.message);
                        if (parsed.error) message = parsed.error;
                    } catch(e) {
                        message = error.message;
                    }
                }
                
                setError(message);
                setLoading(false);
                return;
            }

            if (data && data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            setSuccessData(data);
            setStage(4);
            
            // Notify parent
            if (onVoucherApplied) {
                onVoucherApplied({
                    programId: selectedProgram.id,
                    programName: data.programName,
                    discountValue: data.discountValue,
                    discountType: data.discountType,
                    claimId: data.claimId,
                    studentName: data.studentName
                });
            }

        } catch (err) {
            setError(err.message || 'Terjadi kesalahan sistem.');
            // Clear OTP on fail
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {/* STAGE 0: Initial Button */}
                {stage === 0 && (
                    <motion.div
                        key="stage-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <button
                            type="button"
                            onClick={fetchPrograms}
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#141414] border border-[#d4af37]/30 hover:border-[#d4af37] text-[#d4af37] rounded flex items-center justify-center gap-2 transition-colors font-medium text-sm"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Tag size={18} />}
                            Punya Voucher Program?
                        </button>
                    </motion.div>
                )}

                {/* STAGE 1: Program Selection */}
                {stage === 1 && (
                    <motion.div
                        key="stage-1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-[#141414] border border-[#d4af37]/20 rounded-lg p-4"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <button type="button" onClick={() => setStage(0)} className="text-[#a1a1a1] hover:text-white"><ChevronLeft size={20} /></button>
                            <h3 className="font-bold text-sm uppercase tracking-widest text-white">Pilih Program</h3>
                        </div>

                        {error && <p className="text-red-500 text-xs mb-3 text-center bg-red-500/10 p-2 rounded">{error}</p>}

                        {programs.length === 0 && !loading && (
                            <p className="text-[#a1a1a1] text-xs text-center py-4">Saat ini tidak ada program yang aktif.</p>
                        )}

                        <div className="space-y-3">
                            {programs.map(prog => (
                                <button
                                    key={prog.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedProgram(prog);
                                        setStage(2);
                                        setError('');
                                    }}
                                    className="w-full text-left p-3 rounded border border-[#333] hover:border-[#d4af37]/50 bg-[#1a1a1a] transition-all flex items-start gap-3 group"
                                >
                                    <div className="text-2xl mt-1">{prog.icon}</div>
                                    <div>
                                        <h4 className="font-bold text-[#d4af37] text-sm group-hover:text-white transition-colors">{prog.name}</h4>
                                        <p className="text-xs text-[#a1a1a1] line-clamp-2 mt-1">{prog.description}</p>
                                        <p className="text-[10px] text-[#d4af37] font-mono mt-2">Diskon: {prog.discount_type === 'fixed' ? formatCurrency(prog.discount_value) : `${prog.discount_value}%`}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* STAGE 2: Input Info (NPM & Phone) */}
                {stage === 2 && (
                    <motion.div
                        key="stage-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-[#141414] border border-[#d4af37]/30 rounded-lg p-4"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <button type="button" onClick={() => setStage(1)} className="text-[#a1a1a1] hover:text-white"><ChevronLeft size={20} /></button>
                            <h3 className="font-bold text-sm uppercase tracking-widest text-[#d4af37]">Verifikasi {selectedProgram?.name}</h3>
                        </div>

                        {error && <p className="text-red-500 text-xs mb-4 text-center border border-red-500/30 p-2 rounded bg-red-500/10">{error}</p>}

                        <div className="space-y-4">
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                                <input
                                    required
                                    type="text"
                                    placeholder="NPM Mahasiswa"
                                    className="w-full bg-[#0a0a0a] border border-[#333] focus:border-[#d4af37] rounded p-3 pl-10 text-sm transition-colors text-white"
                                    value={npm}
                                    onChange={(e) => setNpm(e.target.value)}
                                />
                            </div>

                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                                <input
                                    required
                                    type="tel"
                                    placeholder="Nomor HP terdaftar"
                                    className="w-full bg-[#0a0a0a] border border-[#333] focus:border-[#d4af37] rounded p-3 pl-10 text-sm transition-colors text-white"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                <p className="text-[10px] text-[#a1a1a1] mt-1 ml-1">Gunakan nomor yang didaftarkan pada program.</p>
                            </div>

                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="w-full py-3 bg-[#d4af37] text-black rounded font-bold text-xs uppercase tracking-widest hover:bg-[#f1d592] transition-colors flex justify-center items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Kode OTP'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STAGE 3: OTP Verification */}
                {stage === 3 && (
                    <motion.div
                        key="stage-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-[#141414] border border-[#d4af37]/30 rounded-lg p-5"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <button type="button" onClick={() => setStage(2)} className="text-[#a1a1a1] hover:text-white"><ChevronLeft size={20} /></button>
                            <h3 className="font-bold text-sm uppercase tracking-widest text-white">Masukkan OTP</h3>
                        </div>

                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#d4af37]/10 text-[#d4af37] mb-3">
                                <KeyRound size={24} />
                            </div>
                            <p className="text-xs text-[#a1a1a1] text-center max-w-[280px]">
                                Kami telah mengirimkan kode 6 digit ke <span className="text-[#d4af37]">{maskedEmail}</span>.
                            </p>
                            <p className="text-[10px] text-[#a1a1a1]/70 text-center mt-2 bg-[#d4af37]/5 px-3 py-1.5 rounded border border-[#d4af37]/10">
                                ⚠️ Cek folder <strong>Spam</strong> atau <strong>Promosi</strong> jika email tidak ada di Inbox Utama.
                            </p>
                            <p className="text-[10px] text-[#555] mt-1">Berlaku selama {expiryMinutes} menit.</p>
                        </div>

                        {error && <p className="text-red-500 text-xs mb-4 text-center border border-red-500/30 p-2 rounded bg-red-500/10">{error}</p>}

                        <div className="space-y-6">
                            <div className="flex justify-between gap-2 max-w-[280px] mx-auto">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (otpRefs.current[index] = el)}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="w-10 h-12 text-center text-xl font-bold bg-[#0a0a0a] border border-[#333] focus:border-[#d4af37] rounded transition-colors text-white"
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={loading}
                                className="w-full py-3 bg-[#d4af37] text-black rounded font-bold text-xs uppercase tracking-widest hover:bg-[#f1d592] transition-colors flex justify-center items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verifikasi'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STAGE 4: Success Badge */}
                {stage === 4 && successData && (
                    <motion.div
                        key="stage-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#141414] border border-green-500/30 rounded-lg p-4 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <div className="flex items-center justify-between gap-3 w-full">
                            <div className="flex items-center gap-3">
                                <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-green-500 text-sm">Voucher Berhasil Diklaim!</h4>
                                    <p className="text-xs text-white/80 mt-0.5">
                                        Diskon {successData.discountType === 'fixed' ? formatCurrency(successData.discountValue) : `${successData.discountValue}%`} dari {successData.programName}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setStage(0);
                                    setSuccessData(null);
                                    setSelectedProgram(null);
                                    setNpm('');
                                    onVoucherApplied(null);
                                }}
                                className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider pl-2 shrink-0 transition-colors"
                            >
                                Hapus
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VoucherClaim;
