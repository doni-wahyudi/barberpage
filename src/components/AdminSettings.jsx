import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';

const AdminSettings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const [settings, setSettings] = useState({
        points_per_1000_spent: 1,
        points_per_app_review: 10,
        points_per_google_review: 10
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/_studio_admin/login');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('*')
                    .eq('id', 1)
                    .single();

                if (error) throw error;
                if (data) {
                    setSettings({
                        points_per_1000_spent: data.points_per_1000_spent,
                        points_per_app_review: data.points_per_app_review,
                        points_per_google_review: data.points_per_google_review
                    });
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
                setError('Failed to load settings.');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const { error: updateError } = await supabase
                .from('app_settings')
                .update(settings)
                .eq('id', 1);

            if (updateError) throw updateError;

            setSuccessMessage('Settings saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setError('Failed to save settings.');
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
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-12 pb-24 px-6">
            <header className="max-w-3xl mx-auto flex items-center justify-between mb-12">
                <button
                    onClick={() => navigate('/_studio_admin')}
                    className="flex items-center gap-2 text-[#a1a1a1] hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Studio
                </button>
                <div className="text-right">
                    <span className="uppercase tracking-[0.3em] text-[#d4af37] text-[10px] font-bold">Configuration</span>
                    <h1 className="serif text-2xl font-bold flex items-center gap-2 justify-end">
                        <Settings size={24} className="text-[#d4af37]" /> App Settings
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 rounded-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#d4af37]"></div>

                    <h2 className="text-xl font-bold mb-6 text-[#d4af37] uppercase tracking-widest text-sm text-center border-b border-[#333] pb-4">
                        Loyalty Program Configuration
                    </h2>

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
                        {/* Transaction Earning */}
                        <div className="bg-[#141414] p-6 rounded-lg border border-[#333] space-y-4">
                            <h3 className="font-bold text-white uppercase tracking-widest text-xs border-b border-[#333] pb-2">Earning Points (Transactions)</h3>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <label className="text-sm text-[#a1a1a1] leading-relaxed max-w-sm">
                                    How many Points does a customer earn for every <strong>Rp 1.000</strong> they spend on Services or Products?
                                </label>
                                <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 focus-within:border-[#d4af37] transition-colors">
                                    <input
                                        type="number"
                                        name="points_per_1000_spent"
                                        value={settings.points_per_1000_spent}
                                        onChange={handleChange}
                                        className="bg-transparent text-white font-mono text-center w-20 focus:outline-none"
                                        min="0"
                                        required
                                    />
                                    <span className="text-xs text-[#d4af37] font-bold uppercase tracking-widest pr-2">Pts</span>
                                </div>
                            </div>
                        </div>

                        {/* Review Earning */}
                        <div className="bg-[#141414] p-6 rounded-lg border border-[#333] space-y-6">
                            <h3 className="font-bold text-white uppercase tracking-widest text-xs border-b border-[#333] pb-2">Earning Points (Reviews)</h3>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <label className="text-sm text-[#a1a1a1] leading-relaxed max-w-sm">
                                    Points awarded for submitting a rating and review directly in the <strong>App</strong>.
                                </label>
                                <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 focus-within:border-[#d4af37] transition-colors">
                                    <input
                                        type="number"
                                        name="points_per_app_review"
                                        value={settings.points_per_app_review}
                                        onChange={handleChange}
                                        className="bg-transparent text-white font-mono text-center w-20 focus:outline-none"
                                        min="0"
                                        required
                                    />
                                    <span className="text-xs text-[#d4af37] font-bold uppercase tracking-widest pr-2">Pts</span>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <label className="text-sm text-[#a1a1a1] leading-relaxed max-w-sm">
                                    Points awarded for clicking the <strong>Google Maps</strong> review button (Honor System).
                                </label>
                                <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#d4af37]/30 rounded p-2 focus-within:border-[#d4af37] transition-colors">
                                    <input
                                        type="number"
                                        name="points_per_google_review"
                                        value={settings.points_per_google_review}
                                        onChange={handleChange}
                                        className="bg-transparent text-white font-mono text-center w-20 focus:outline-none"
                                        min="0"
                                        required
                                    />
                                    <span className="text-xs text-[#d4af37] font-bold uppercase tracking-widest pr-2">Pts</span>
                                </div>
                            </div>
                        </div>


                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full gold-button flex flex-row items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Configuration</>}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </main>
        </div>
    );
};

export default AdminSettings;
