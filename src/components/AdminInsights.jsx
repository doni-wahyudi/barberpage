import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Users, Search, Loader2, ArrowLeft, Star, Clock, Calendar, TrendingUp, DollarSign, Activity, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const AdminInsights = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('crm'); // 'crm' | 'blacklist'
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ revenueData: [], serviceData: [], barberData: [] });

    // Blacklist states
    const [blacklist, setBlacklist] = useState([]);
    const [blacklistLoading, setBlacklistLoading] = useState(false);
    const [banPhone, setBanPhone] = useState('');
    const [banReason, setBanReason] = useState('');
    const [blacklistError, setBlacklistError] = useState('');
    const [blacklistSuccess, setBlacklistSuccess] = useState('');

    const fetchBlacklist = async () => {
        setBlacklistLoading(true);
        setBlacklistError('');
        try {
            const { data, error } = await supabase
                .from('blacklist')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setBlacklist(data || []);
        } catch (err) {
            console.error("Error fetching blacklist:", err);
            setBlacklistError('Gagal memuat daftar hitam.');
        } finally {
            setBlacklistLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'blacklist') {
            fetchBlacklist();
        }
    }, [activeTab]);

    const handleAddBlacklist = async (e) => {
        e.preventDefault();
        setBlacklistError('');
        setBlacklistSuccess('');
        
        let cleanPhone = banPhone.replace(/[^0-9]/g, '');
        if (!cleanPhone.startsWith('08') && !cleanPhone.startsWith('628')) {
            setBlacklistError('Nomor HP tidak valid. Harus dimulai dengan 08 atau 628.');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { error } = await supabase
                .from('blacklist')
                .insert([{
                    phone_number: cleanPhone,
                    reason: banReason || 'Diberhentikan manual oleh Admin.',
                    blacklisted_by: session?.user?.id || null
                }]);

            if (error) throw error;

            setBlacklistSuccess(`Nomor ${cleanPhone} berhasil dimasukkan daftar hitam.`);
            setBanPhone('');
            setBanReason('');
            fetchBlacklist();
        } catch (err) {
            console.error("Error adding blacklist:", err);
            setBlacklistError(err.message || 'Gagal menyimpan ke daftar hitam.');
        }
    };

    const handleRemoveBlacklist = async (phone) => {
        if (!window.confirm(`Yakin ingin menghapus nomor ${phone} dari daftar hitam?`)) return;
        setBlacklistError('');
        setBlacklistSuccess('');
        try {
            const { error } = await supabase
                .from('blacklist')
                .delete()
                .eq('phone_number', phone);

            if (error) throw error;
            setBlacklistSuccess(`Nomor ${phone} berhasil dihapus dari daftar hitam.`);
            fetchBlacklist();
        } catch (err) {
            console.error("Error deleting blacklist:", err);
            setBlacklistError(err.message || 'Gagal menghapus.');
        }
    };

    const handleDeleteCustomer = async (phone, name) => {
        if (!window.confirm(`Yakin ingin menghapus pelanggan "${name}" (${phone})? Tindakan ini akan menghapus semua poin reward dan riwayat kunjungan mereka di CRM.`)) return;
        setLoading(true);
        try {
            // 1. Delete point transactions
            await supabase
                .from('point_transactions')
                .delete()
                .eq('phone_number', phone);

            // 2. Delete customer record
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('phone_number', phone);

            if (error) throw error;

            // Update local state
            const updated = customers.filter(c => c.phone_number !== phone);
            setCustomers(updated);
            setFilteredCustomers(updated);

            alert(`Pelanggan "${name}" berhasil dihapus.`);
        } catch (err) {
            console.error("Error deleting customer:", err);
            alert('Gagal menghapus pelanggan: ' + (err.message || 'Terjadi kesalahan.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchInsights = async () => {
            setLoading(true);
            try {
                // 1. Fetch all unique customers
                const { data: customerData, error: custError } = await supabase
                    .from('customers')
                    .select('*')
                    .order('total_visits', { ascending: false });

                if (custError) throw custError;
                setCustomers(customerData || []);
                setFilteredCustomers(customerData || []);

                // 2. Fetch recent bookings for visual analytics (last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: bookingData, error: bookError } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('status', 'completed')
                    .gte('booking_date', thirtyDaysAgo.toISOString().split('T')[0]);

                if (bookError) throw bookError;

                // Process data for charts
                const revenueMap = {};
                const serviceMap = {};
                const barberMap = {};

                (bookingData || []).forEach(b => {
                    const date = b.booking_date;
                    revenueMap[date] = (revenueMap[date] || 0) + (b.total_price || 0);
                    serviceMap[b.service_type] = (serviceMap[b.service_type] || 0) + 1;
                    barberMap[b.barber_name] = (barberMap[b.barber_name] || 0) + 1;
                });

                const revenueData = Object.keys(revenueMap).sort().map(date => ({
                    date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    revenue: revenueMap[date]
                }));

                const serviceData = Object.keys(serviceMap).map(name => ({
                    name,
                    value: serviceMap[name]
                }));

                const barberData = Object.keys(barberMap).map(name => ({
                    name,
                    visits: barberMap[name]
                }));

                setStats({ revenueData, serviceData, barberData });

            } catch (err) {
                console.error("Error fetching insights:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    // Handle search filter
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCustomers(customers);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = customers.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.phone_number.includes(term)
        );
        setFilteredCustomers(filtered);
    }, [searchTerm, customers]);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <button
                            onClick={() => navigate('/_studio_admin')}
                            className="flex items-center gap-2 text-[#a1a1a1] hover:text-[#d4af37] transition-colors mb-4 text-sm"
                        >
                            <ArrowLeft size={16} /> Back to Daily Queue
                        </button>
                        <h1 className="serif text-3xl md:text-5xl font-bold flex items-center gap-4">
                            {activeTab === 'crm' ? 'Customer CRM' : 'Daftar Hitam (Blacklist)'} 
                            <Users className="text-[#d4af37]" size={32} />
                        </h1>
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => setActiveTab('crm')}
                                className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors rounded ${activeTab === 'crm' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#111] text-[#a1a1a1] border-[#333] hover:border-[#d4af37]/50 hover:text-[#d4af37]'}`}
                            >
                                CRM & Analisis
                            </button>
                            <button
                                onClick={() => setActiveTab('blacklist')}
                                className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors rounded ${activeTab === 'blacklist' ? 'bg-red-500 text-white border-red-500' : 'bg-[#111] text-[#a1a1a1] border-[#333] hover:border-red-500/50 hover:text-red-500'}`}
                            >
                                Daftar Hitam (Blacklist)
                            </button>
                        </div>
                    </div>

                    {activeTab === 'crm' && (
                        <div className="relative w-full md:w-72">
                            <Search size={18} className="absolute left-3 top-3 text-[#555]" />
                            <input
                                type="text"
                                placeholder="Search name or phone..."
                                className="w-full bg-[#111] border border-[#333] rounded px-4 py-2.5 pl-10 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </header>

                {activeTab === 'crm' ? (
                    loading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-[#a1a1a1]">
                            <Loader2 className="animate-spin mb-4 text-[#d4af37]" size={32} />
                            <p className="uppercase tracking-widest text-xs">Analyzing Database...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Analytics Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Revenue Chart */}
                                <div className="glass-card p-6 border border-[#d4af37]/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-[#d4af37]/10 rounded text-[#d4af37]">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Revenue 30 Hari Terakhir</h3>
                                            <p className="text-[10px] text-[#a1a1a1] uppercase tracking-widest">Pertumbuhan Pendapatan</p>
                                        </div>
                                    </div>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={stats.revenueData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis hide />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#d4af37' }}
                                                    formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                                                />
                                                <Line type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, fill: '#d4af37' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {/* Service Pie Chart */}
                                    <div className="glass-card p-6 border border-[#d4af37]/10">
                                        <h3 className="font-bold mb-4 text-center">Populeritas Layanan</h3>
                                        <div className="h-48 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.serviceData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={60}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {stats.serviceData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={[ '#d4af37', '#8b7326', '#b5952f', '#4d4015' ][index % 4]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-4 flex flex-wrap justify-center gap-4">
                                            {stats.serviceData.map((s, i) => (
                                                <div key={i} className="flex items-center gap-2 text-[10px] uppercase font-bold text-[#a1a1a1]">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: [ '#d4af37', '#8b7326', '#b5952f', '#4d4015' ][i % 4] }} />
                                                    {s.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Barber Performance */}
                                    <div className="glass-card p-6 border border-[#d4af37]/10">
                                        <h3 className="font-bold mb-4 text-center">Performa Kapster</h3>
                                        <div className="h-48 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.barberData}>
                                                    <XAxis dataKey="name" hide />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                                    />
                                                    <Bar dataKey="visits" fill="#d4af37" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {stats.barberData.map((b, i) => (
                                                <div key={i} className="flex justify-between items-center text-[10px] uppercase font-bold">
                                                    <span className="text-[#a1a1a1]">{b.name}</span>
                                                    <span className="text-[#d4af37]">{b.visits} Kunjungan</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer List */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#111] text-[10px] uppercase tracking-widest text-[#a1a1a1]">
                                                <th className="p-5 font-bold">Client Identity</th>
                                                <th className="p-5 font-bold text-center">Total Visits</th>
                                                <th className="p-5 font-bold">Last Visit</th>
                                                <th className="p-5 font-bold">Preferences</th>
                                                <th className="p-5 font-bold text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCustomers.length > 0 ? (
                                                filteredCustomers.map((client, index) => (
                                                    <tr
                                                        key={client.phone_number}
                                                        className="border-t border-[#333] hover:bg-[#111]/50 transition-colors"
                                                    >
                                                        <td className="p-5">
                                                            <div className="font-bold text-lg mb-1 flex items-center gap-2">
                                                                {client.name}
                                                                {client.total_visits >= 5 && (
                                                                    <span title="Loyal Customer" className="text-[#d4af37] bg-[#d4af37]/10 p-1 rounded-full">
                                                                        <Star size={12} className="fill-[#d4af37]" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-[#a1a1a1] font-mono">{client.phone_number}</div>
                                                            <div className="mt-2 text-[10px] font-bold text-[#d4af37] bg-[#d4af37]/5 px-2 py-0.5 rounded inline-block border border-[#d4af37]/20 uppercase tracking-widest">
                                                                {client.points || 0} Pts Reward
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#d4af37]/30 text-[#d4af37] font-bold text-lg">
                                                                {client.total_visits}
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Calendar size={14} className="text-[#555]" />
                                                                {formatDate(client.last_visit)}
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <span className="text-[#a1a1a1]">
                                                                    Top Barber: <span className="text-white">{client.favorite_barber}</span>
                                                                </span>
                                                                <span className="text-[#a1a1a1]">
                                                                    Top Cut: <span className="text-white">{client.favorite_service}</span>
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <button
                                                                onClick={() => handleDeleteCustomer(client.phone_number, client.name)}
                                                                className="px-3 py-1.5 border border-red-500/50 hover:bg-red-500/10 text-red-400 text-xs font-bold uppercase rounded transition-colors inline-flex items-center justify-center gap-1.5"
                                                                title="Hapus Pelanggan"
                                                            >
                                                                <Trash2 size={12} />
                                                                Hapus
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center p-12 text-[#555] text-sm">
                                                        No clients matched your search.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        </div>
                    )
                ) : (
                    /* Blacklist Management Tab */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form Banned */}
                        <div className="glass-card p-6 border border-red-500/10 h-fit">
                            <h3 className="font-bold text-lg text-red-500 mb-2 uppercase tracking-widest">Tambah Daftar Hitam</h3>
                            <p className="text-xs text-[#a1a1a1] mb-6">Blokir nomor HP dari semua sistem pemesanan online secara instan.</p>

                            {blacklistError && <p className="text-red-500 text-xs bg-red-500/10 border border-red-500/30 p-2 rounded mb-4 text-center">{blacklistError}</p>}
                            {blacklistSuccess && <p className="text-green-500 text-xs bg-green-500/10 border border-green-500/30 p-2 rounded mb-4 text-center">{blacklistSuccess}</p>}

                            <form onSubmit={handleAddBlacklist} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Nomor WhatsApp / HP</label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="Cth: 08123456789"
                                        className="w-full bg-[#111] border border-[#333] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 text-white font-mono"
                                        value={banPhone}
                                        onChange={(e) => setBanPhone(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Alasan Pemblokiran</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Cth: Mengisi mass-booking palsu berulang kali"
                                        className="w-full bg-[#111] border border-[#333] rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 text-white"
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 transition-colors rounded text-white font-bold text-xs uppercase tracking-widest mt-2"
                                >
                                    Masukan Daftar Hitam
                                </button>
                            </form>
                        </div>

                        {/* Table Banned List */}
                        <div className="glass-card lg:col-span-2 overflow-hidden border border-red-500/10">
                            <div className="p-6 border-b border-[#333] bg-[#111]/30">
                                <h3 className="font-bold text-lg text-white">Nomor yang Terblokir</h3>
                                <p className="text-xs text-[#a1a1a1] mt-1">Daftar pelanggan yang terblokir secara otomatis atau manual.</p>
                            </div>

                            {blacklistLoading ? (
                                <div className="p-12 text-center text-[#a1a1a1]">
                                    <Loader2 className="animate-spin mx-auto mb-2 text-red-500" size={24} />
                                    <span className="text-xs uppercase tracking-widest">Loading Blacklist...</span>
                                </div>
                            ) : blacklist.length === 0 ? (
                                <div className="p-12 text-center text-[#555] text-sm italic">
                                    Belum ada nomor yang masuk daftar hitam (blacklist).
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#111]/50 text-[10px] uppercase tracking-widest text-[#a1a1a1] border-b border-[#333]">
                                                <th className="p-5 font-bold">Nomor HP</th>
                                                <th className="p-5 font-bold">Alasan</th>
                                                <th className="p-5 font-bold">Tanggal Blokir</th>
                                                <th className="p-5 font-bold text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {blacklist.map((item) => (
                                                <tr key={item.phone_number} className="border-b border-[#222] hover:bg-red-500/5 transition-colors">
                                                    <td className="p-5 font-mono font-bold text-sm text-red-400">{item.phone_number}</td>
                                                    <td className="p-5 text-xs text-white/80 max-w-xs break-words">{item.reason}</td>
                                                    <td className="p-5 text-xs text-[#a1a1a1]">
                                                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <button
                                                            onClick={() => handleRemoveBlacklist(item.phone_number)}
                                                            className="px-3 py-1.5 border border-green-500/50 hover:bg-green-500/10 text-green-400 text-xs font-bold uppercase rounded transition-colors"
                                                        >
                                                            Unban
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminInsights;
