import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Users, Search, Loader2, ArrowLeft, Star, Clock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminInsights = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchInsights = async () => {
            setLoading(true);
            try {
                // Fetch all non-cancelled bookings
                const { data: bookings, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .neq('status', 'cancelled')
                    .order('booking_date', { ascending: false });

                if (error) throw error;

                // Group by phone_number to figure out unique customers
                const customerMap = {};

                (bookings || []).forEach(b => {
                    const phone = b.phone_number;
                    if (!customerMap[phone]) {
                        customerMap[phone] = {
                            phone_number: phone,
                            name: b.customer_name, // mostly the most recent name they used
                            total_visits: 0,
                            last_visit: b.booking_date,
                            barbers_used: {},
                            services_used: {}
                        };
                    }

                    const c = customerMap[phone];
                    c.total_visits += 1;

                    // Track favorite barber
                    c.barbers_used[b.barber_name] = (c.barbers_used[b.barber_name] || 0) + 1;

                    // Track favorite service
                    c.services_used[b.service_type] = (c.services_used[b.service_type] || 0) + 1;

                    // Update last visit if more recent
                    if (b.booking_date > c.last_visit) {
                        c.last_visit = b.booking_date;
                        c.name = b.customer_name; // Update to the most recently used name
                    }
                });

                // Convert map to array and sort by visits (highest first), then last visit
                let customerArray = Object.values(customerMap);

                // Helper to get highest key in a frequency map
                customerArray.forEach(c => {
                    c.favorite_barber = Object.keys(c.barbers_used).reduce((a, b) => c.barbers_used[a] > c.barbers_used[b] ? a : b);
                    c.favorite_service = Object.keys(c.services_used).reduce((a, b) => c.services_used[a] > c.services_used[b] ? a : b);
                });

                customerArray.sort((a, b) => {
                    if (b.total_visits !== a.total_visits) return b.total_visits - a.total_visits;
                    return new Date(b.last_visit) - new Date(a.last_visit);
                });

                setCustomers(customerArray);
                setFilteredCustomers(customerArray);

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
                )}
            </div>
        </div>
    );
};

export default AdminInsights;
