import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Users, Search, Loader2, ArrowLeft, Star, Clock, Calendar, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const AdminInsights = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ revenueData: [], serviceData: [], barberData: [] });

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
                    // Revenue by Day
                    const date = b.booking_date;
                    revenueMap[date] = (revenueMap[date] || 0) + (b.total_price || 0);

                    // Service Popularity
                    serviceMap[b.service_type] = (serviceMap[b.service_type] || 0) + 1;

                    // Barber Performance
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
                            Customer CRM <Star className="text-[#d4af37]" size={32} />
                        </h1>
                        <p className="text-[#a1a1a1] mt-2 tracking-widest uppercase text-xs">
                            Total Unique Clients: {customers.length}
                        </p>
                    </div>

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
                </header>

                {loading ? (
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
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center p-12 text-[#555] text-sm">
                                                No clients matched your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    </div>
    );
};

export default AdminInsights;
