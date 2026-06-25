import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Users, Search, Loader2, ArrowLeft, Star, Clock, Calendar, TrendingUp, DollarSign, Activity, Trash2, Edit, X, Save, CreditCard, ShoppingBag, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const AdminInsights = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'crm' | 'blacklist'
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ revenueData: [], serviceData: [], barberData: [] });

    // Date preset and range states
    const getPresetDates = (preset) => {
        const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
        const today = new Date(todayStr);
        let from = todayStr;
        let to = todayStr;
        
        if (preset === 'today') {
            from = todayStr;
            to = todayStr;
        } else if (preset === 'yesterday') {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yestStr = yesterday.toISOString().split('T')[0];
            from = yestStr;
            to = yestStr;
        } else if (preset === 'week') {
            const monday = new Date(today);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
            monday.setDate(diff);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            from = monday.toISOString().split('T')[0];
            to = sunday.toISOString().split('T')[0];
        } else if (preset === 'last_week') {
            const monday = new Date(today);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1) - 7;
            monday.setDate(diff);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            from = monday.toISOString().split('T')[0];
            to = sunday.toISOString().split('T')[0];
        } else if (preset === 'month') {
            const y = today.getFullYear();
            const m = today.getMonth();
            const firstDay = new Date(y, m, 1);
            const lastDay = new Date(y, m + 1, 0);
            from = firstDay.toISOString().split('T')[0];
            to = lastDay.toISOString().split('T')[0];
        } else if (preset === 'last_month') {
            const y = today.getFullYear();
            const m = today.getMonth();
            const firstDay = new Date(y, m - 1, 1);
            const lastDay = new Date(y, m, 0);
            from = firstDay.toISOString().split('T')[0];
            to = lastDay.toISOString().split('T')[0];
        } else if (preset === 'year') {
            const y = today.getFullYear();
            from = `${y}-01-01`;
            to = `${y}-12-31`;
        }
        return { from, to };
    };

    const defaultDates = getPresetDates('month');
    const [datePreset, setDatePreset] = useState('month');
    const [dateFrom, setDateFrom] = useState(defaultDates.from);
    const [dateTo, setDateTo] = useState(defaultDates.to);

    // Business Reports raw data states
    const [allTransactions, setAllTransactions] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [productsList, setProductsList] = useState([]);

    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        if (preset !== 'custom' && preset !== 'single_day') {
            const dates = getPresetDates(preset);
            setDateFrom(dates.from);
            setDateTo(dates.to);
        } else if (preset === 'single_day') {
            const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
            setDateFrom(todayStr);
            setDateTo(todayStr);
        }
    };

    // Edit Customer modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editError, setEditError] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [barbersList, setBarbersList] = useState([]);
    const [servicesList, setServicesList] = useState([]);

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

    // Fetch barbers and services for the edit dropdowns
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [{ data: barbers }, { data: services }] = await Promise.all([
                    supabase.from('barbers').select('id, name').eq('is_active', true).order('name'),
                    supabase.from('services').select('id, name').order('name')
                ]);
                setBarbersList(barbers || []);
                setServicesList(services || []);
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
            }
        };
        fetchDropdownData();
    }, []);

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

    const openEditModal = (client) => {
        setEditingCustomer(client);
        setEditForm({
            name: client.name || '',
            points: client.points ?? 0,
            total_visits: client.total_visits ?? 0,
            special_mark: client.special_mark || '',
            favorite_barber: client.favorite_barber || '',
            favorite_service: client.favorite_service || '',
        });
        setEditError('');
        setIsEditModalOpen(true);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setEditError('');
        try {
            const payload = {
                name: editForm.name,
                points: Number(editForm.points) || 0,
                total_visits: Number(editForm.total_visits) || 0,
                special_mark: editForm.special_mark || null,
                favorite_barber: editForm.favorite_barber || null,
                favorite_service: editForm.favorite_service || null,
                updated_at: new Date().toISOString(),
            };
            const { error } = await supabase
                .from('customers')
                .update(payload)
                .eq('phone_number', editingCustomer.phone_number);
            if (error) throw error;

            // Update local state immediately
            const updatedList = customers.map(c =>
                c.phone_number === editingCustomer.phone_number ? { ...c, ...payload } : c
            );
            setCustomers(updatedList);
            setFilteredCustomers(updatedList);
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Error updating customer:', err);
            setEditError(err.message || 'Gagal menyimpan perubahan.');
        } finally {
            setEditLoading(false);
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
                // 1. Fetch all customers
                const { data: customerData, error: custError } = await supabase
                    .from('customers')
                    .select('*');

                if (custError) throw custError;

                // 2. Fetch ALL bookings (completed and otherwise)
                const { data: bookingsData, error: bookError } = await supabase
                    .from('bookings')
                    .select('phone_number, booking_date, service_type, barber_name, total_price, customer_name, status')
                    .order('booking_date', { ascending: true });

                if (bookError) throw bookError;

                // 3. Fetch ALL completed transactions
                const { data: transactionData, error: txError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('status', 'completed')
                    .order('created_at', { ascending: true });

                if (txError) throw txError;

                // 4. Fetch ALL products
                const { data: productsData, error: prodError } = await supabase
                    .from('products')
                    .select('id, name, price');

                if (prodError) throw prodError;

                setAllTransactions(transactionData || []);
                setAllBookings(bookingsData || []);
                setProductsList(productsData || []);

                // 5. Build per-customer stats from ALL completed bookings
                const statsMap = {};
                (bookingsData || []).filter(b => b.status === 'completed').forEach(b => {
                    const phone = b.phone_number;
                    if (!phone) return;
                    if (!statsMap[phone]) {
                        statsMap[phone] = { total_visits: 0, last_visit: null };
                    }
                    statsMap[phone].total_visits += 1;
                    if (!statsMap[phone].last_visit || b.booking_date > statsMap[phone].last_visit) {
                        statsMap[phone].last_visit = b.booking_date;
                    }
                });

                // 6. Merge computed stats into customers, prefer booking-derived values
                const enriched = (customerData || []).map(c => ({
                    ...c,
                    total_visits: statsMap[c.phone_number]?.total_visits ?? c.total_visits ?? 0,
                    last_visit: statsMap[c.phone_number]?.last_visit ?? c.last_visit ?? null,
                }));

                // Sort by computed visits descending
                enriched.sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
                setCustomers(enriched);
                setFilteredCustomers(enriched);

                // 7. CRM Chart data: filter to last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

                const revenueMap = {};
                const serviceMap = {};
                const barberMap = {};

                (bookingsData || []).filter(b => b.status === 'completed' && b.booking_date >= cutoff).forEach(b => {
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

    // Reports Aggregator
    const reportsData = React.useMemo(() => {
        if (!allTransactions.length) {
            return {
                totalVisits: 0,
                bookingVisits: 0,
                walkInVisits: 0,
                grossRevenue: 0,
                serviceRevenue: 0,
                productRevenue: 0,
                discounts: 0,
                netRevenue: 0,
                paymentMethods: [],
                weeklyCapsterHeadcount: [],
                newCustomersCount: 0,
                popularServices: [],
                newCustomersList: [],
                revenueTrend: [],
                uniqueBarbers: []
            };
        }

        // Helper to check if item is a service
        const isServiceItem = (item) => {
            const pid = item.productId;
            if (pid === null || pid === undefined) {
                const name = (item.productName || '').toLowerCase();
                if (servicesList && servicesList.some(s => name.includes(s.name.toLowerCase()))) return true;
                return name.includes('mullet') || name.includes('cut') || name.includes('crop') || name.includes('fade') || name.includes('part') || name.includes('dewasa') || name.includes('anak') || name.includes('kustom') || name.includes('cukur');
            }
            const isNum = typeof pid === 'number' || (!isNaN(Number(pid)) && String(pid).trim() !== '' && !pid.toString().includes('-'));
            return isNum;
        };

        const customerPhoneMap = {};
        customers.forEach(c => {
            customerPhoneMap[c.id] = c.phone_number;
        });

        const findMatchingBooking = (tx) => {
            const txDate = tx.created_at.substring(0, 10);
            const phone = customerPhoneMap[tx.customer_id] || '';
            const name = (tx.customer_name || '').toLowerCase().trim();
            
            return allBookings.find(b => {
                if (b.status !== 'completed') return false;
                if (b.booking_date !== txDate) return false;
                if (phone && b.phone_number === phone) return true;
                if (name && b.customer_name.toLowerCase().trim() === name) return true;
                return false;
            });
        };

        // Filter data by dates
        const filteredTxs = allTransactions.filter(tx => {
            const txDate = tx.created_at.substring(0, 10);
            return txDate >= dateFrom && txDate <= dateTo;
        });

        const filteredNewCusts = customers.filter(c => {
            if (!c.created_at) return false;
            const d = c.created_at.substring(0, 10);
            return d >= dateFrom && d <= dateTo;
        });

        // 1. Client counts (Breakdown: Booking vs Walk-in)
        let bookingVisits = 0;
        let walkInVisits = 0;

        // 2. Revenue (Cukur vs Produk)
        let serviceRevenue = 0;
        let productRevenue = 0;
        let discounts = 0;

        // 3. Payment channels
        const paymentsMap = {
            'cash': 0,
            'qris': 0,
            'transfer': 0,
            'gopay': 0,
            'ovo': 0,
            'lainnya': 0
        };

        // 4. Capster weekly headcounts
        const capsterWeeks = {};

        // Helper to get week start date (Monday YYYY-MM-DD)
        const getMondayDateStr = (dateStr) => {
            const d = new Date(dateStr);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d.setDate(diff));
            return monday.toISOString().split('T')[0];
        };

        // 5. Popular services
        const servicePopularity = {};

        // Trend Map
        const trendMap = {};

        filteredTxs.forEach(tx => {
            const txDate = tx.created_at.substring(0, 10);
            const isBooking = !!findMatchingBooking(tx);
            if (isBooking) {
                bookingVisits++;
            } else {
                walkInVisits++;
            }

            discounts += (tx.discount_total || 0);
            
            let pm = (tx.payment_method || 'cash').toLowerCase().trim();
            if (pm.includes('cash')) pm = 'cash';
            else if (pm.includes('qris')) pm = 'qris';
            else if (pm.includes('transfer')) pm = 'transfer';
            else if (pm.includes('gopay')) pm = 'gopay';
            else if (pm.includes('ovo')) pm = 'ovo';
            else pm = 'lainnya';

            paymentsMap[pm] += (tx.grand_total || 0);

            if (tx.items && Array.isArray(tx.items)) {
                tx.items.forEach(item => {
                    const itemSubtotal = item.subtotal || (item.price * item.quantity) || 0;
                    const isService = isServiceItem(item);

                    if (isService) {
                        serviceRevenue += itemSubtotal;

                        const serviceName = (item.productName || '').replace(/\s*\([^)]+\)\s*$/, '').trim();
                        if (serviceName) {
                            servicePopularity[serviceName] = (servicePopularity[serviceName] || 0) + (item.quantity || 1);
                        }

                        let barber = 'Tidak Tercatat';
                        const match = (item.productName || '').match(/\(([^)]+)\)$/);
                        if (match) {
                            barber = match[1].trim();
                        } else {
                            const matchingBook = findMatchingBooking(tx);
                            if (matchingBook && matchingBook.barber_name) {
                                barber = matchingBook.barber_name;
                            }
                        }

                        const weekStart = getMondayDateStr(txDate);
                        if (!capsterWeeks[weekStart]) {
                            capsterWeeks[weekStart] = {};
                        }
                        capsterWeeks[weekStart][barber] = (capsterWeeks[weekStart][barber] || 0) + (item.quantity || 1);
                    } else {
                        productRevenue += itemSubtotal;
                    }
                });
            }

            trendMap[txDate] = (trendMap[txDate] || 0) + (tx.grand_total || 0);
        });

        const paymentMethodsData = Object.keys(paymentsMap)
            .map(name => ({
                name: name.toUpperCase(),
                value: paymentsMap[name]
            }))
            .filter(item => item.value > 0);

        const allBarberNamesSet = new Set();
        Object.keys(capsterWeeks).forEach(w => {
            Object.keys(capsterWeeks[w]).forEach(b => allBarberNamesSet.add(b));
        });
        const uniqueBarbers = Array.from(allBarberNamesSet);

        const weeklyCapsterHeadcount = Object.keys(capsterWeeks).sort().map(w => {
            const row = { week: w };
            uniqueBarbers.forEach(b => {
                row[b] = capsterWeeks[w][b] || 0;
            });
            return row;
        });

        const popularServices = Object.keys(servicePopularity).map(name => ({
            name,
            count: servicePopularity[name]
        })).sort((a, b) => b.count - a.count);

        const revenueTrend = Object.keys(trendMap).sort().map(date => ({
            date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            revenue: trendMap[date]
        }));

        const grossRevenue = serviceRevenue + productRevenue;
        const netRevenue = grossRevenue - discounts;

        return {
            totalVisits: filteredTxs.length,
            bookingVisits,
            walkInVisits,
            grossRevenue,
            serviceRevenue,
            productRevenue,
            discounts,
            netRevenue,
            paymentMethods: paymentMethodsData,
            weeklyCapsterHeadcount,
            newCustomersCount: filteredNewCusts.length,
            popularServices,
            newCustomersList: filteredNewCusts,
            revenueTrend,
            uniqueBarbers
        };
    }, [allTransactions, allBookings, customers, dateFrom, dateTo, servicesList]);

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
        if (!dateStr) return 'Belum ada';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getRelativeTimeStr = (dateStr) => {
        if (!dateStr) return 'Belum pernah';
        const lastDate = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) return 'Hari ini / Kemarin';
        if (diffDays < 7) return `${diffDays} hari yang lalu`;
        
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks < 4) return `${diffWeeks} minggu yang lalu`;
        
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths} bulan yang lalu`;
        
        const diffYears = Math.floor(diffDays / 365);
        return `${diffYears} tahun yang lalu`;
    };

    const handleWebFollowUp = async (client) => {
        let cleanPhone = client.phone_number.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.substring(1);
        }
        const message = `Halo Kak ${client.name}, apa kabar? Kami dari Auro Barbershop merindukan Kakak! Sudah waktunya untuk potong rambut lagi nih biar tetap rapi dan keren. Ditunggu kedatangannya ya Kak di Auro Barbershop! 💈✂️`;
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        
        window.open(url, '_blank');
        
        const now = new Date().toISOString();
        try {
            const { error } = await supabase
                .from('customers')
                .update({ last_follow_up: now })
                .eq('phone_number', client.phone_number);
                
            if (!error) {
                setCustomers(prev => prev.map(c => c.phone_number === client.phone_number ? { ...c, last_follow_up: now } : c));
                setFilteredCustomers(prev => prev.map(c => c.phone_number === client.phone_number ? { ...c, last_follow_up: now } : c));
            }
        } catch (err) {
            console.error('Failed to update last_follow_up on Supabase:', err);
        }
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
                            {activeTab === 'reports' ? 'Laporan Bisnis' : activeTab === 'crm' ? 'Customer CRM' : 'Daftar Hitam (Blacklist)'} 
                            <TrendingUp className="text-[#d4af37]" size={32} />
                        </h1>
                        <div className="flex gap-4 mt-4">
                            <button
                                onClick={() => setActiveTab('reports')}
                                className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors rounded ${activeTab === 'reports' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#111] text-[#a1a1a1] border-[#333] hover:border-[#d4af37]/50 hover:text-[#d4af37]'}`}
                            >
                                Laporan Bisnis
                            </button>
                            <button
                                onClick={() => setActiveTab('crm')}
                                className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors rounded ${activeTab === 'crm' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#111] text-[#a1a1a1] border-[#333] hover:border-[#d4af37]/50 hover:text-[#d4af37]'}`}
                            >
                                CRM Pelanggan
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

                {activeTab === 'reports' && (
                    <div className="space-y-8">
                        {/* Date Filter Panel */}
                        <div className="glass-card p-6 border border-[#d4af37]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'today', label: 'Hari Ini' },
                                    { id: 'yesterday', label: 'Kemarin' },
                                    { id: 'week', label: 'Minggu Ini' },
                                    { id: 'last_week', label: 'Minggu Lalu' },
                                    { id: 'month', label: 'Bulan Ini' },
                                    { id: 'last_month', label: 'Bulan Lalu' },
                                    { id: 'year', label: 'Tahun Ini' },
                                    { id: 'single_day', label: 'Pilih Hari' },
                                    { id: 'custom', label: 'Rentang Kustom' }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePresetChange(p.id)}
                                        className={`px-4 py-2 text-xs uppercase tracking-wider font-bold rounded transition-colors ${datePreset === p.id ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#111] border border-[#333] text-[#a1a1a1] hover:border-[#d4af37]/30 hover:text-white'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {datePreset === 'single_day' && (
                                <div className="flex flex-col min-w-[200px]">
                                    <label className="text-[10px] uppercase text-[#a1a1a1] tracking-widest mb-1.5 font-bold">Pilih Tanggal</label>
                                    <div className="flex items-center gap-3 bg-[#111] border border-[#333] hover:border-[#d4af37]/50 rounded-lg px-4 py-2.5 focus-within:border-[#d4af37] transition-all cursor-pointer shadow-inner">
                                        <Calendar size={16} className="text-[#d4af37]" />
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => {
                                                setDateFrom(e.target.value);
                                                setDateTo(e.target.value);
                                            }}
                                            className="bg-transparent border-none text-white focus:outline-none text-sm cursor-pointer w-full font-semibold"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {datePreset === 'custom' && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                                    <div className="flex flex-col min-w-[180px]">
                                        <label className="text-[10px] uppercase text-[#a1a1a1] tracking-widest mb-1.5 font-bold">Dari Tanggal</label>
                                        <div className="flex items-center gap-3 bg-[#111] border border-[#333] hover:border-[#d4af37]/50 rounded-lg px-4 py-2.5 focus-within:border-[#d4af37] transition-all cursor-pointer shadow-inner">
                                            <Calendar size={16} className="text-[#d4af37]" />
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="bg-transparent border-none text-white focus:outline-none text-sm cursor-pointer w-full font-semibold"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col min-w-[180px]">
                                        <label className="text-[10px] uppercase text-[#a1a1a1] tracking-widest mb-1.5 font-bold">Sampai Tanggal</label>
                                        <div className="flex items-center gap-3 bg-[#111] border border-[#333] hover:border-[#d4af37]/50 rounded-lg px-4 py-2.5 focus-within:border-[#d4af37] transition-all cursor-pointer shadow-inner">
                                            <Calendar size={16} className="text-[#d4af37]" />
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="bg-transparent border-none text-white focus:outline-none text-sm cursor-pointer w-full font-semibold"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Visits */}
                            <div className="glass-card p-6 border border-[#d4af37]/10 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] text-[#a1a1a1] uppercase tracking-widest font-bold">Total Kunjungan</p>
                                        <h2 className="text-4xl font-extrabold mt-1 text-[#d4af37]">{reportsData.totalVisits}</h2>
                                    </div>
                                    <div className="p-3 bg-[#d4af37]/10 rounded-lg text-[#d4af37]">
                                        <Users size={20} />
                                    </div>
                                </div>
                                <div className="border-t border-[#333] pt-4 mt-2 flex justify-between text-xs text-[#a1a1a1]">
                                    <span>Booking Online: <strong className="text-white">{reportsData.bookingVisits}</strong></span>
                                    <span>Walk-in: <strong className="text-white">{reportsData.walkInVisits}</strong></span>
                                </div>
                            </div>

                            {/* Card 2: Revenue */}
                            <div className="glass-card p-6 border border-[#d4af37]/10 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] text-[#a1a1a1] uppercase tracking-widest font-bold">Pendapatan Bersih</p>
                                        <h2 className="text-3xl font-extrabold mt-1 text-[#d4af37]">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(reportsData.netRevenue)}</h2>
                                    </div>
                                    <div className="p-3 bg-[#d4af37]/10 rounded-lg text-[#d4af37]">
                                        <DollarSign size={20} />
                                    </div>
                                </div>
                                <div className="border-t border-[#333] pt-4 mt-2 flex flex-col gap-1 text-[11px] text-[#a1a1a1]">
                                    <div className="flex justify-between">
                                        <span>Jasa Cukur: <strong className="text-white">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(reportsData.serviceRevenue)}</strong></span>
                                        <span>Produk Retail: <strong className="text-white">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(reportsData.productRevenue)}</strong></span>
                                    </div>
                                    {reportsData.discounts > 0 && (
                                        <div className="text-red-400 flex justify-between text-[10px]">
                                            <span>Diskon Potongan: </span>
                                            <strong>-{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(reportsData.discounts)}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 3: New Customers */}
                            <div className="glass-card p-6 border border-[#d4af37]/10 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] text-[#a1a1a1] uppercase tracking-widest font-bold">Pelanggan Baru</p>
                                        <h2 className="text-4xl font-extrabold mt-1 text-[#d4af37]">{reportsData.newCustomersCount}</h2>
                                    </div>
                                    <div className="p-3 bg-[#d4af37]/10 rounded-lg text-[#d4af37]">
                                        <Star size={20} />
                                    </div>
                                </div>
                                <div className="border-t border-[#333] pt-4 mt-2 text-xs text-[#a1a1a1]">
                                    Pelanggan baru terdaftar dalam sistem.
                                </div>
                            </div>
                        </div>

                        {/* Visualizations Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Revenue Trend Line Chart */}
                            <div className="glass-card p-6 border border-[#d4af37]/10">
                                <h3 className="font-bold mb-6 text-sm uppercase tracking-wider text-white">Tren Pendapatan Harian</h3>
                                <div className="h-64 w-full">
                                    {reportsData.revenueTrend.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={reportsData.revenueTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                <XAxis dataKey="date" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#555" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#d4af37' }}
                                                    formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                                                />
                                                <Line type="monotone" dataKey="revenue" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, fill: '#d4af37' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-[#555] text-xs">Belum ada transaksi pendapatan pada rentang ini</div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Channels Pie Chart */}
                            <div className="glass-card p-6 border border-[#d4af37]/10 flex flex-col justify-between">
                                <h3 className="font-bold mb-6 text-sm uppercase tracking-wider text-white">Metode Pembayaran (Saluran Pendapatan)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div className="h-48 w-full">
                                        {reportsData.paymentMethods.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={reportsData.paymentMethods}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={65}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {reportsData.paymentMethods.map((entry, index) => {
                                                            const colors = {
                                                                'CASH': '#4dcf7e', // Emerald
                                                                'QRIS': '#00aeef', // Cyan
                                                                'TRANSFER': '#d4af37', // Gold
                                                                'GOPAY': '#00d084', // Green
                                                                'OVO': '#4c2a86' // Purple
                                                            };
                                                            return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#888888'} />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                                        formatter={(value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-[#555] text-xs">Belum ada data pembayaran</div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {reportsData.paymentMethods.map((pm, i) => {
                                            const colors = {
                                                'CASH': '#4dcf7e',
                                                'QRIS': '#00aeef',
                                                'TRANSFER': '#d4af37',
                                                'GOPAY': '#00d084',
                                                'OVO': '#4c2a86'
                                            };
                                            return (
                                                <div key={i} className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2 font-bold text-[#a1a1a1]">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[pm.name] || '#888888' }} />
                                                        {pm.name}
                                                    </div>
                                                    <span className="font-mono text-white font-semibold">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pm.value)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Popular Services */}
                            <div className="glass-card p-6 border border-[#d4af37]/10">
                                <h3 className="font-bold mb-6 text-sm uppercase tracking-wider text-white">Layanan Paling Populer (Kategori Cukur)</h3>
                                <div className="space-y-4">
                                    {reportsData.popularServices.length > 0 ? (
                                        reportsData.popularServices.slice(0, 5).map((service, index) => {
                                            const totalServicesCount = reportsData.popularServices.reduce((sum, s) => sum + s.count, 0);
                                            const pct = totalServicesCount > 0 ? Math.round((service.count / totalServicesCount) * 100) : 0;
                                            return (
                                                <div key={index} className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-white flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-full bg-[#d4af37]/10 text-[#d4af37] inline-flex items-center justify-center text-[10px]">{index + 1}</span>
                                                            {service.name}
                                                        </span>
                                                        <span className="text-[#d4af37]">{service.count} Kepala ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full bg-[#1c1c1c] h-2 rounded-full overflow-hidden">
                                                        <div className="bg-[#d4af37] h-full rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-[#555] text-xs text-center py-6">Belum ada data layanan cukur</div>
                                    )}
                                </div>
                            </div>

                            {/* New Customers List */}
                            <div className="glass-card p-6 border border-[#d4af37]/10 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-white">Daftar Pelanggan Baru ({reportsData.newCustomersCount})</h3>
                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                        {reportsData.newCustomersList.length > 0 ? (
                                            reportsData.newCustomersList.map((c, i) => (
                                                <div key={i} className="flex justify-between items-center p-2.5 bg-[#111]/50 border border-[#222] rounded hover:border-[#d4af37]/20 transition-colors">
                                                    <div>
                                                        <div className="font-bold text-sm text-white">{c.name}</div>
                                                        <div className="text-xs text-[#a1a1a1] font-mono">{c.phone_number}</div>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-[#a1a1a1] uppercase">
                                                        {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-[#555] text-xs text-center py-12">Belum ada pelanggan baru terdaftar pada rentang ini</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Capster Headcounts per Week Table */}
                        <div className="glass-card p-6 border border-[#d4af37]/10 overflow-hidden">
                            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-white">Performa Kepala per Capster per Minggu</h3>
                            <p className="text-xs text-[#a1a1a1] mb-6">Menampilkan jumlah pelanggan ("berapa kepala") yang dilayani oleh setiap capster per minggu (WC: Week Commencing Monday).</p>
                            
                            {reportsData.weeklyCapsterHeadcount.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#111] text-[10px] uppercase tracking-widest text-[#a1a1a1] border-b border-[#333]">
                                                <th className="p-4 font-bold">Minggu Mulai (Senin)</th>
                                                {reportsData.uniqueBarbers.map(barber => (
                                                    <th key={barber} className="p-4 font-bold text-center">{barber}</th>
                                                ))}
                                                <th className="p-4 font-bold text-center bg-[#d4af37]/5 text-[#d4af37]">Total Kepala</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportsData.weeklyCapsterHeadcount.map((row, idx) => {
                                                const rowTotal = reportsData.uniqueBarbers.reduce((sum, b) => sum + (row[b] || 0), 0);
                                                return (
                                                    <tr key={idx} className="border-b border-[#222] hover:bg-[#111]/30 transition-colors">
                                                        <td className="p-4 text-sm font-semibold text-white">
                                                            {new Date(row.week).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        {reportsData.uniqueBarbers.map(barber => (
                                                            <td key={barber} className="p-4 text-center text-sm font-mono text-white/80">
                                                                {row[barber] || 0}
                                                            </td>
                                                        ))}
                                                        <td className="p-4 text-center text-sm font-bold font-mono bg-[#d4af37]/5 text-[#d4af37]">
                                                            {rowTotal}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-[#555] text-xs text-center py-12">Belum ada data kunjungan capster pada rentang ini</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'crm' && (
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
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Calendar size={14} className="text-[#555]" />
                                                                    {formatDate(client.last_visit)}
                                                                </div>
                                                                {client.last_visit && (
                                                                    <span className="text-[10px] text-[#a1a1a1] ml-6">
                                                                        ({getRelativeTimeStr(client.last_visit)})
                                                                    </span>
                                                                )}
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
                                                            <div className="flex items-center justify-center gap-2">
                                                                {(() => {
                                                                    const lastVisit = client.last_visit;
                                                                    const isMoreThanMonth = lastVisit && (Date.now() - new Date(lastVisit).getTime()) > (30 * 24 * 60 * 60 * 1000);
                                                                    const hasFollowedUp = client.last_follow_up;
                                                                    
                                                                    if (isMoreThanMonth) {
                                                                        return (
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <button
                                                                                    onClick={() => handleWebFollowUp(client)}
                                                                                    className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase rounded transition-colors inline-flex items-center justify-center gap-1.5"
                                                                                    title="Follow Up WhatsApp"
                                                                                >
                                                                                    💬 WA
                                                                                </button>
                                                                                {hasFollowedUp && (
                                                                                    <span className="text-[9px] text-[#25D366] font-bold block mt-0.5">
                                                                                        ✓ {new Date(hasFollowedUp).toLocaleDateString('id-ID')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                                <button
                                                                    onClick={() => openEditModal(client)}
                                                                    className="px-3 py-1.5 border border-[#d4af37]/50 hover:bg-[#d4af37]/10 text-[#d4af37] text-xs font-bold uppercase rounded transition-colors inline-flex items-center justify-center gap-1.5"
                                                                    title="Edit Pelanggan"
                                                                 >
                                                                    <Edit size={12} />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteCustomer(client.phone_number, client.name)}
                                                                    className="px-3 py-1.5 border border-red-500/50 hover:bg-red-500/10 text-red-400 text-xs font-bold uppercase rounded transition-colors inline-flex items-center justify-center gap-1.5"
                                                                    title="Hapus Pelanggan"
                                                                >
                                                                    <Trash2 size={12} />
                                                                    Hapus
                                                                </button>
                                                            </div>
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
                )}

                {activeTab === 'blacklist' && (
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

            {/* Edit Customer Modal */}
            {isEditModalOpen && editingCustomer && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsEditModalOpen(false); }}
                >
                    <div className="bg-[#0f0f0f] border border-[#d4af37]/20 rounded-xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">Edit Pelanggan</h2>
                                <p className="text-xs text-[#a1a1a1] font-mono mt-0.5">{editingCustomer.phone_number}</p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-[#555] hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {editError && (
                            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 p-2 rounded mb-4">{editError}</p>
                        )}

                        <form onSubmit={handleEditSave} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Nama Lengkap</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[#141414] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-white"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Poin Reward</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-[#141414] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-white"
                                        value={editForm.points}
                                        onChange={(e) => setEditForm(f => ({ ...f, points: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Total Kunjungan</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-[#141414] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-white"
                                        value={editForm.total_visits}
                                        onChange={(e) => setEditForm(f => ({ ...f, total_visits: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Gelar / Special Mark</label>
                                <input
                                    type="text"
                                    placeholder="Cth: VIP, Regular, dsb."
                                    className="w-full bg-[#141414] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-white"
                                    value={editForm.special_mark}
                                    onChange={(e) => setEditForm(f => ({ ...f, special_mark: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Kapster Favorit</label>
                                <select
                                    className="w-full bg-[#141414] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-white"
                                    value={editForm.favorite_barber}
                                    onChange={(e) => setEditForm(f => ({ ...f, favorite_barber: e.target.value }))}
                                >
                                    <option value="">— Tidak Ada —</option>
                                    {barbersList.map(b => (
                                        <option key={b.id} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-[#a1a1a1] mb-1 font-semibold">Layanan Favorit</label>
                                <select
                                    className="w-full bg-[#141414] border border-[#333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#d4af37] text-white"
                                    value={editForm.favorite_service}
                                    onChange={(e) => setEditForm(f => ({ ...f, favorite_service: e.target.value }))}
                                >
                                    <option value="">— Tidak Ada —</option>
                                    {servicesList.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2.5 border border-[#333] hover:border-[#555] text-[#a1a1a1] hover:text-white text-xs font-bold uppercase rounded transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex-1 py-2.5 bg-[#d4af37] hover:bg-[#c4a030] text-black text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInsights;
