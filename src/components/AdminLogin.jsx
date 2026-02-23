import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
            });

            if (authError) throw authError;

            // Success, navigate to the secure admin root
            // (Assuming /_studio_admin renders AdminPanel if authenticated)
            navigate('/_studio_admin');

        } catch (err) {
            console.error('Login error:', err.message);
            setError('Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#d4af37]/5 blur-[120px] rounded-full point-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm glass-card p-8 rounded-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#d4af37]/20 flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-[#d4af37]" size={28} />
                    </div>
                    <h1 className="serif text-2xl font-bold tracking-wider uppercase">Studio <span className="text-[#d4af37]">Admin</span></h1>
                    <p className="text-[#a1a1a1] text-xs uppercase tracking-widest mt-2">Authorized Personnel Only</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="relative">
                        <Mail size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                        <input
                            required
                            type="email"
                            placeholder="Admin Email"
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                        />
                    </div>
                    <div className="relative">
                        <Lock size={18} className="absolute left-3 top-3.5 text-[#d4af37]/50" />
                        <input
                            required
                            type="password"
                            placeholder="Password"
                            className="w-full bg-[#141414] border border-[#d4af37]/20 rounded p-3 pl-10 focus:outline-none focus:border-[#d4af37] transition-colors"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        />
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="gold-button w-full flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
