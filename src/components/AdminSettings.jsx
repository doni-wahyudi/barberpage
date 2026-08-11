import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Settings, AlertCircle, CheckCircle2, Clock, Award, Calendar } from 'lucide-react';

const DEFAULT_DAILY_HOURS = [
    { dayOfWeek: 1, dayName: 'Senin', isHoliday: false, openingHour: '09:00', closingHour: '21:00' },
    { dayOfWeek: 2, dayName: 'Selasa', isHoliday: false, openingHour: '09:00', closingHour: '21:00' },
    { dayOfWeek: 3, dayName: 'Rabu', isHoliday: false, openingHour: '09:00', closingHour: '21:00' },
    { dayOfWeek: 4, dayName: 'Kamis', isHoliday: false, openingHour: '09:00', closingHour: '21:00' },
    { dayOfWeek: 5, dayName: 'Jumat', isHoliday: false, openingHour: '09:00', closingHour: '21:00' },
    { dayOfWeek: 6, dayName: 'Sabtu', isHoliday: false, openingHour: '09:00', closingHour: '21:00' },
    { dayOfWeek: 0, dayName: 'Minggu', isHoliday: false, openingHour: '09:00', closingHour: '21:00' }
];

const AdminSettings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('hours'); // 'hours' | 'loyalty'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Loyalty Settings
    const [loyaltySettings, setLoyaltySettings] = useState({
        points_per_1000_spent: 1,
        points_per_app_review: 10,
        points_per_google_review: 10
    });

    // Store Operating Hours Settings
    const [storeSettings, setStoreSettings] = useState({
        opening_hour: '09:00',
        closing_hour: '21:00',
        daily_hours: DEFAULT_DAILY_HOURS
    });

    useEffect(() => {
        const fetchAllSettings = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/_studio_admin/login');
                return;
            }

            try {
                // Fetch loyalty settings
                const { data: appData, error: appError } = await supabase
                    .from('app_settings')
                    .select('*')
                    .eq('id', 1)
                    .maybeSingle();

                if (appData) {
                    setLoyaltySettings({
                        points_per_1000_spent: appData.points_per_1000_spent ?? 1,
                        points_per_app_review: appData.points_per_app_review ?? 10,
                        points_per_google_review: appData.points_per_google_review ?? 10
                    });
                }

                // Fetch store hours settings
                const { data: storeData, error: storeError } = await supabase
                    .from('settings')
                    .select('*')
                    .limit(1)
                    .maybeSingle();

                if (storeData) {
                    let parsedHours = storeData.daily_hours;
                    if (typeof parsedHours === 'string') {
                        try {
                            parsedHours = JSON.parse(parsedHours);
                        } catch (e) {
                            console.error('Error parsing daily_hours in admin:', e);
                        }
                    }
                    setStoreSettings({
                        opening_hour: storeData.opening_hour || '09:00',
                        closing_hour: storeData.closing_hour || '21:00',
                        daily_hours: parsedHours || DEFAULT_DAILY_HOURS
                    });
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
                setError('Gagal memuat pengaturan.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllSettings();
    }, [navigate]);

    const handleLoyaltyChange = (e) => {
        const { name, value } = e.target;
        setLoyaltySettings(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    const handleDayHourChange = (index, field, value) => {
        setStoreSettings(prev => {
            const updated = [...prev.daily_hours];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, daily_hours: updated };
        });
    };

    const applyDefaultHoursToAll = () => {
        setStoreSettings(prev => ({
            ...prev,
            daily_hours: prev.daily_hours.map(d => ({
                ...d,
                openingHour: prev.opening_hour,
                closingHour: prev.closing_hour
            }))
        }));
        setSuccessMessage('Jam default berhasil diterapkan ke seluruh jadwal hari!');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            // 1. Save Loyalty Settings
            const { error: appUpdateError } = await supabase
                .from('app_settings')
                .update(loyaltySettings)
                .eq('id', 1);

            if (appUpdateError) {
                console.warn('Warning updating app_settings:', appUpdateError);
            }

            // 2. Save Store Operating Hours Settings (Upsert id: 1)
            const { error: storeUpdateError } = await supabase
                .from('settings')
                .upsert({
                    id: 1,
                    opening_hour: storeSettings.opening_hour,
                    closing_hour: storeSettings.closing_hour,
                    daily_hours: storeSettings.daily_hours,
                    updated_at: new Date().toISOString()
                });

            if (storeUpdateError) {
                console.warn('Warning updating settings table:', storeUpdateError);
            }

            setSuccessMessage('Semua pengaturan berhasil disimpan!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setError('Gagal menyimpan pengaturan: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-12 pb-24 px-4 sm:px-6">
            <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
                <button
                    onClick={() => navigate('/_studio_admin')}
                    className="flex items-center gap-2 text-[#a1a1a1] hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Kembali ke Studio
                </button>
                <div className="text-right">
                    <span className="uppercase tracking-[0.3em] text-[#d4af37] text-[10px] font-bold">Konfigurasi</span>
                    <h1 className="serif text-xl sm:text-2xl font-bold flex items-center gap-2 justify-end">
                        <Settings size={22} className="text-[#d4af37]" /> Pengaturan Barbershop
                    </h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto">
                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b border-[#222] mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('hours')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                            activeTab === 'hours'
                                ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/5'
                                : 'border-transparent text-[#777] hover:text-white'
                        }`}
                    >
                        <Clock size={16} /> Jam Operasional
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('loyalty')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                            activeTab === 'loyalty'
                                ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/5'
                                : 'border-transparent text-[#777] hover:text-white'
                        }`}
                    >
                        <Award size={16} /> Program Loyalitas
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 sm:p-8 rounded-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#d4af37]"></div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-3 text-red-400 text-sm">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded flex items-center gap-3 text-green-400 text-sm">
                            <CheckCircle2 size={18} /> {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-6">
                        {activeTab === 'hours' && (
                            <div className="space-y-6">
                                {/* Default Opening & Closing Hours */}
                                <div className="bg-[#141414] p-5 sm:p-6 rounded-lg border border-[#333] space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#333] pb-3">
                                        <div>
                                            <h3 className="font-bold text-white uppercase tracking-widest text-xs">
                                                Jam Operasional Default
                                            </h3>
                                            <p className="text-xs text-[#a1a1a1] mt-1">
                                                Jam buka dan tutup standar yang diterapkan ke sistem dan booking.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={applyDefaultHoursToAll}
                                            className="px-3 py-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 hover:bg-[#d4af37]/20 text-[#d4af37] text-xs rounded transition-colors"
                                        >
                                            Terapkan ke Semua Hari
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-[#a1a1a1] uppercase tracking-wider font-semibold">
                                                Jam Buka Default
                                            </label>
                                            <input
                                                type="time"
                                                value={storeSettings.opening_hour}
                                                onChange={(e) => setStoreSettings(prev => ({ ...prev, opening_hour: e.target.value }))}
                                                className="w-full bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-[#a1a1a1] uppercase tracking-wider font-semibold">
                                                Jam Tutup Default
                                            </label>
                                            <input
                                                type="time"
                                                value={storeSettings.closing_hour}
                                                onChange={(e) => setStoreSettings(prev => ({ ...prev, closing_hour: e.target.value }))}
                                                className="w-full bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-[#0a0a0a]/50 rounded border border-[#222] text-[11px] text-[#888]">
                                        ℹ️ <strong>Batas Akhir Booking:</strong> Sistem secara otomatis membatasi slot booking terakhir maksimal <strong>30 menit sebelum jam tutup</strong> (contoh: jika tutup jam 21:00, slot terakhir yang bisa dipilih pelanggan adalah 20:30).
                                    </div>
                                </div>

                                {/* Day-by-Day Schedule Table */}
                                <div className="bg-[#141414] p-5 sm:p-6 rounded-lg border border-[#333] space-y-4">
                                    <h3 className="font-bold text-white uppercase tracking-widest text-xs border-b border-[#333] pb-3 flex items-center gap-2">
                                        <Calendar size={15} className="text-[#d4af37]" /> Jadwal Operasional Per Hari
                                    </h3>

                                    <div className="space-y-3">
                                        {storeSettings.daily_hours.map((day, idx) => (
                                            <div
                                                key={day.dayOfWeek}
                                                className={`p-3.5 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                                                    day.isHoliday
                                                        ? 'bg-[#0a0a0a]/50 border-red-900/30 opacity-75'
                                                        : 'bg-[#0a0a0a] border-[#222] hover:border-[#333]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-[120px]">
                                                    <span className="font-bold text-sm text-white w-16">{day.dayName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDayHourChange(idx, 'isHoliday', !day.isHoliday)}
                                                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                                                            day.isHoliday
                                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        }`}
                                                    >
                                                        {day.isHoliday ? 'Tutup / Libur' : 'Buka'}
                                                    </button>
                                                </div>

                                                {!day.isHoliday ? (
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <input
                                                            type="time"
                                                            value={day.openingHour}
                                                            onChange={(e) => handleDayHourChange(idx, 'openingHour', e.target.value)}
                                                            className="bg-[#141414] border border-[#d4af37]/30 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#d4af37]"
                                                        />
                                                        <span className="text-[#666] text-xs">-</span>
                                                        <input
                                                            type="time"
                                                            value={day.closingHour}
                                                            onChange={(e) => handleDayHourChange(idx, 'closingHour', e.target.value)}
                                                            className="bg-[#141414] border border-[#d4af37]/30 rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#d4af37]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-red-400/80 italic">Tidak melayani booking (Libur)</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'loyalty' && (
                            <div className="space-y-6">
                                {/* Transaction Earning */}
                                <div className="bg-[#141414] p-5 sm:p-6 rounded-lg border border-[#333] space-y-4">
                                    <h3 className="font-bold text-white uppercase tracking-widest text-xs border-b border-[#333] pb-2">
                                        Mendapatkan Poin (Transaksi)
                                    </h3>
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <label className="text-sm text-[#a1a1a1] leading-relaxed max-w-sm">
                                            Berapa Poin yang didapatkan pelanggan untuk setiap kelipatan <strong>Rp 1.000</strong> yang mereka belanjakan untuk Layanan/Produk?
                                        </label>
                                        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 focus-within:border-[#d4af37] transition-colors">
                                            <input
                                                type="number"
                                                name="points_per_1000_spent"
                                                value={loyaltySettings.points_per_1000_spent}
                                                onChange={handleLoyaltyChange}
                                                className="bg-transparent text-white font-mono text-center w-20 focus:outline-none"
                                                min="0"
                                                required
                                            />
                                            <span className="text-xs text-[#d4af37] font-bold uppercase tracking-widest pr-2">Poin</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Review Earning */}
                                <div className="bg-[#141414] p-5 sm:p-6 rounded-lg border border-[#333] space-y-6">
                                    <h3 className="font-bold text-white uppercase tracking-widest text-xs border-b border-[#333] pb-2">
                                        Mendapatkan Poin (Ulasan)
                                    </h3>

                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <label className="text-sm text-[#a1a1a1] leading-relaxed max-w-sm">
                                            Poin yang diberikan saat mengirimkan penilaian dan ulasan langsung di dalam <strong>Aplikasi</strong>.
                                        </label>
                                        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 focus-within:border-[#d4af37] transition-colors">
                                            <input
                                                type="number"
                                                name="points_per_app_review"
                                                value={loyaltySettings.points_per_app_review}
                                                onChange={handleLoyaltyChange}
                                                className="bg-transparent text-white font-mono text-center w-20 focus:outline-none"
                                                min="0"
                                                required
                                            />
                                            <span className="text-xs text-[#d4af37] font-bold uppercase tracking-widest pr-2">Poin</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <label className="text-sm text-[#a1a1a1] leading-relaxed max-w-sm">
                                            Poin yang diberikan karena mengklik tautan ulasan <strong>Google Maps</strong>.
                                        </label>
                                        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 focus-within:border-[#d4af37] transition-colors">
                                            <input
                                                type="number"
                                                name="points_per_google_review"
                                                value={loyaltySettings.points_per_google_review}
                                                onChange={handleLoyaltyChange}
                                                className="bg-transparent text-white font-mono text-center w-20 focus:outline-none"
                                                min="0"
                                                required
                                            />
                                            <span className="text-xs text-[#d4af37] font-bold uppercase tracking-widest pr-2">Poin</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full gold-button flex flex-row items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Simpan Semua Pengaturan</>}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminSettings;
