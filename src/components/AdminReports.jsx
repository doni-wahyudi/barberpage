import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { buildUnifiedTransactions } from '../utils/reportUtils';
import { 
    FileSpreadsheet, 
    Download, 
    Calendar as CalendarIcon, 
    Search, 
    Users, 
    DollarSign, 
    CreditCard, 
    Scissors, 
    ArrowLeft, 
    Filter, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    Sparkles, 
    Wallet, 
    QrCode, 
    User, 
    Tag, 
    Layers, 
    Clock, 
    Package, 
    UserCog, 
    Image as ImageIcon, 
    Settings, 
    MessageSquareText, 
    LogOut,
    HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const AdminReports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);

    // Raw data states
    const [bookings, setBookings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [customersList, setCustomersList] = useState([]);
    const [barbersList, setBarbersList] = useState([]);
    const [servicesList, setServicesList] = useState([]);

    // Filter states
    const [datePreset, setDatePreset] = useState('month'); // 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'year' | 'single_day' | 'select_month' | 'custom'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'tunai' | 'qris' | 'transfer'
    const [barberFilter, setBarberFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Helpers to compute date ranges in Asia/Jakarta
    const getPresetDates = (preset) => {
        const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
        const today = new Date(todayStr + 'T00:00:00');
        let from = todayStr;
        let to = todayStr;

        if (preset === 'today') {
            from = todayStr;
            to = todayStr;
        } else if (preset === 'yesterday') {
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            from = yest.toISOString().split('T')[0];
            to = from;
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

    // Initialize default dates
    useEffect(() => {
        const initial = getPresetDates('month');
        setDateFrom(initial.from);
        setDateTo(initial.to);
    }, []);

    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        setCurrentPage(1);
        if (preset === 'select_month') {
            const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
            const lastDay = new Date(selectedYear, selectedMonth, 0);
            const yStr = selectedYear;
            const mStr = String(selectedMonth).padStart(2, '0');
            setDateFrom(`${yStr}-${mStr}-01`);
            setDateTo(`${yStr}-${mStr}-${String(lastDay.getDate()).padStart(2, '0')}`);
        } else if (preset === 'single_day') {
            const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
            setDateFrom(todayStr);
            setDateTo(todayStr);
        } else if (preset !== 'custom') {
            const { from, to } = getPresetDates(preset);
            setDateFrom(from);
            setDateTo(to);
        }
    };

    const handleMonthSelectChange = (month, year) => {
        setSelectedMonth(month);
        setSelectedYear(year);
        const lastDay = new Date(year, month, 0).getDate();
        const mStr = String(month).padStart(2, '0');
        setDateFrom(`${year}-${mStr}-01`);
        setDateTo(`${year}-${mStr}-${String(lastDay).padStart(2, '0')}`);
        setCurrentPage(1);
    };

    // Authentication Guard & Initial Data Fetching
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/_studio_admin/login');
            } else {
                setAuthChecking(false);
                fetchData();
            }
        };
        checkAuth();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch finished/completed bookings
            const { data: bookingsData, error: bookErr } = await supabase
                .from('bookings')
                .select('*')
                .eq('status', 'completed')
                .order('booking_date', { ascending: false });

            if (bookErr) throw bookErr;

            // 2. Fetch completed POS transactions
            const { data: txData, error: txErr } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            // 3. Fetch customers for CRM contact matching
            const { data: custData, error: custErr } = await supabase
                .from('customers')
                .select('*');

            // 4. Fetch active barbers
            const { data: bData } = await supabase
                .from('barbers')
                .select('name')
                .eq('is_active', true);

            // 5. Fetch services
            const { data: sData } = await supabase
                .from('services')
                .select('name, price');

            setBookings(bookingsData || []);
            setTransactions(txData || []);
            setCustomersList(custData || []);
            if (bData) setBarbersList(bData.map(b => b.name));
            if (sData) setServicesList(sData || []);
        } catch (err) {
            console.error('Error fetching report data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Unify & deduplicate all finished transactions into a single spreadsheet dataset
    const unifiedFinishedRecords = useMemo(() => {
        return buildUnifiedTransactions(transactions, bookings, customersList, servicesList);
    }, [transactions, bookings, customersList, servicesList]);

    // Apply active filters (Date Range, Payment Method, Barber, Search Term, Sorting)
    const filteredRecords = useMemo(() => {
        return unifiedFinishedRecords.filter(item => {
            // 1. Date filter
            if (dateFrom && item.date < dateFrom) return false;
            if (dateTo && item.date > dateTo) return false;

            // 2. Payment Method filter
            if (paymentFilter !== 'all') {
                if (paymentFilter === 'tunai' && item.payment_method !== 'Tunai') return false;
                if (paymentFilter === 'qris' && item.payment_method !== 'QRIS') return false;
                if (paymentFilter === 'transfer' && item.payment_method !== 'Transfer') return false;
            }

            // 3. Barber filter
            if (barberFilter !== 'all' && item.barber_name !== barberFilter) {
                return false;
            }

            // 4. Search query
            if (searchTerm.trim()) {
                const query = searchTerm.toLowerCase().trim();
                const matchName = item.customer_name.toLowerCase().includes(query);
                const matchPhone = item.phone_number.toLowerCase().includes(query);
                const matchService = item.service_name.toLowerCase().includes(query);
                const matchBarber = item.barber_name.toLowerCase().includes(query);
                const matchNotes = item.notes.toLowerCase().includes(query);
                if (!matchName && !matchPhone && !matchService && !matchBarber && !matchNotes) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
            }
            return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
        });
    }, [unifiedFinishedRecords, dateFrom, dateTo, paymentFilter, barberFilter, searchTerm, sortOrder]);

    // Financial & Spreadsheet Calculation Metrics (Matching Google Sheet formulas)
    const metrics = useMemo(() => {
        let totalCash = 0;
        let countCash = 0;
        let totalQris = 0;
        let countQris = 0;
        let totalTransfer = 0;
        let countTransfer = 0;
        let grandTotal = 0;

        const barberSummary = {};

        filteredRecords.forEach(item => {
            const nom = item.nominal || 0;
            grandTotal += nom;

            if (item.payment_method === 'Tunai') {
                totalCash += nom;
                countCash += 1;
            } else if (item.payment_method === 'QRIS') {
                totalQris += nom;
                countQris += 1;
            } else if (item.payment_method === 'Transfer') {
                totalTransfer += nom;
                countTransfer += 1;
            }

            const bName = item.barber_name || 'Lainnya';
            if (!barberSummary[bName]) {
                barberSummary[bName] = { count: 0, total: 0 };
            }
            barberSummary[bName].count += 1;
            barberSummary[bName].total += nom;
        });

        const totalTransactions = filteredRecords.length;
        const avgTicket = totalTransactions > 0 ? Math.round(grandTotal / totalTransactions) : 0;

        return {
            grandTotal,
            totalCash,
            countCash,
            totalQris,
            countQris,
            totalTransfer,
            countTransfer,
            totalTransactions,
            avgTicket,
            barberSummary
        };
    }, [filteredRecords]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, currentPage, pageSize]);

    // Format Rupiah helper
    const formatIDR = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    // Format Date for table display (e.g. "20 Juni 2026")
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            }
            return dateStr;
        } catch {
            return dateStr;
        }
    };

    // Export to CSV Functionality (UTF-8 BOM for Microsoft Excel & Google Sheets)
    const exportToCSV = () => {
        if (filteredRecords.length === 0) {
            alert('Tidak ada data transaksi yang dapat diexport pada rentang filter ini.');
            return;
        }

        const dateRangeLabel = dateFrom === dateTo ? dateFrom : `${dateFrom}_sd_${dateTo}`;
        const fileName = `Laporan_Transaksi_AURO_${dateRangeLabel}.csv`;

        // CSV Header
        const headers = [
            'No',
            'Tanggal',
            'Waktu',
            'Nama Pelanggan',
            'Nominal (IDR)',
            'Jenis Transaksi',
            'Kapster',
            'Layanan',
            'Status',
            'Keterangan'
        ];

        // Format Rows
        const rows = filteredRecords.map((item, index) => [
            index + 1,
            `"${item.date}"`,
            `"${item.time || '-'}"`,
            `"${(item.customer_name || '').replace(/"/g, '""')}"`,
            item.nominal,
            `"${item.payment_method}"`,
            `"${(item.barber_name || '').replace(/"/g, '""')}"`,
            `"${(item.service_name || '').replace(/"/g, '""')}"`,
            `"Selesai"`,
            `"${(item.notes || '-').replace(/"/g, '""')}"`
        ]);

        // Recap / Calculation Section at the bottom of CSV (replicates spreadsheet structure)
        const summaryRows = [
            [],
            ['=== KALKULASI TRANSAKSI SELESAI ==='],
            ['Metode Pembayaran', 'Jumlah Transaksi', 'Total Nominal (IDR)'],
            ['Tunai (Cash)', metrics.countCash, metrics.totalCash],
            ['QRIS', metrics.countQris, metrics.totalQris],
            ...(metrics.totalTransfer > 0 ? [['Transfer', metrics.countTransfer, metrics.totalTransfer]] : []),
            ['Total Keseluruhan', metrics.totalTransactions, metrics.grandTotal],
            ['Rata-rata Transaksi (ATV)', '', metrics.avgTicket],
            [],
            ['=== PERFORMA KAPSTER ==='],
            ['Nama Kapster', 'Jumlah Kepala', 'Total Omset (IDR)'],
            ...Object.keys(metrics.barberSummary).map(b => [
                `"${b}"`,
                metrics.barberSummary[b].count,
                metrics.barberSummary[b].total
            ]),
            [],
            ['Periode Laporan', `"${dateFrom} s/d ${dateTo}"`],
            ['Waktu Cetak', `"${new Date().toLocaleString('id-ID')}"`]
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(',')),
            ...summaryRows.map(r => r.join(','))
        ].join('\r\n');

        // Prepend UTF-8 Byte Order Mark (BOM) so Excel opens Indonesian characters cleanly
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (authChecking) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const navItems = [
        { label: 'Kelola Toko', icon: Package, path: '/_studio_admin/products' },
        { label: 'Layanan', icon: Scissors, path: '/_studio_admin/services' },
        { label: 'Kapster', icon: UserCog, path: '/_studio_admin/capsters' },
        { label: 'Galeri', icon: ImageIcon, path: '/_studio_admin/gallery' },
        { label: 'Kategori', icon: Tag, path: '/_studio_admin/categories' },
        { label: 'Pengaturan Aplikasi', icon: Settings, path: '/_studio_admin/settings' },
        { label: 'Masukan', icon: MessageSquareText, path: '/_studio_admin/feedback' },
        { label: 'CRM & Blacklist', icon: Users, path: '/_studio_admin/insights' }
    ];

    const monthsList = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' }
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-8 pb-24 px-4 sm:px-6 relative">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header & Global Admin Navigation */}
                <header className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222] pb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/_studio_admin')}
                                className="p-2.5 bg-[#141414] hover:bg-[#222] border border-[#333] hover:border-[#d4af37]/50 rounded-lg text-[#d4af37] transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                            >
                                <ArrowLeft size={16} /> Reservasi
                            </button>
                            <div>
                                <span className="uppercase tracking-[0.3em] text-[#d4af37] text-[10px] font-bold block">
                                    AURO STUDIO REPORTS
                                </span>
                                <h1 className="serif text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-3 mt-1">
                                    <FileSpreadsheet className="text-[#d4af37]" size={32} />
                                    Laporan Keuangan & Klien
                                </h1>
                            </div>
                        </div>

                        {/* Export & Refresh Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="p-2.5 bg-[#141414] hover:bg-[#222] border border-[#333] text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                title="Perbarui Data"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin text-[#d4af37]' : 'text-gray-400'} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>

                            <button
                                onClick={exportToCSV}
                                disabled={filteredRecords.length === 0}
                                className="px-4 py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-lg shadow-lg hover:shadow-[#d4af37]/20 transition-all flex items-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={16} />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* Secondary Navigation */}
                    <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                        {navItems.map(({ label, icon: Icon, path }) => (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className="min-h-[46px] flex items-center justify-center gap-2 px-2.5 py-2 bg-[#141414] hover:bg-[#d4af37]/15 border border-[#333] hover:border-[#d4af37]/70 transition-all rounded text-xs font-bold text-[#d4af37] text-center leading-tight"
                            >
                                <Icon size={14} className="shrink-0" />
                                <span>{label}</span>
                            </button>
                        ))}
                        <button
                            onClick={async () => await supabase.auth.signOut()}
                            className="min-h-[46px] flex items-center justify-center gap-2 px-2.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/40 text-red-400 transition-colors rounded text-xs font-bold"
                        >
                            <LogOut size={14} className="shrink-0" /> Keluar
                        </button>
                    </nav>
                </header>

                {/* Filter Control Center */}
                <div className="glass-card p-5 md:p-6 border border-[#d4af37]/20 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold uppercase tracking-widest mb-3">
                            <CalendarIcon size={16} />
                            <span>Filter Rentang Waktu (Hanya Transaksi Selesai)</span>
                        </div>

                        {/* Date Preset Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'today', label: 'Hari Ini' },
                                { id: 'yesterday', label: 'Kemarin' },
                                { id: 'week', label: 'Minggu Ini' },
                                { id: 'last_week', label: 'Minggu Lalu' },
                                { id: 'month', label: 'Bulan Ini' },
                                { id: 'last_month', label: 'Bulan Lalu' },
                                { id: 'select_month', label: 'Pilih Bulan' },
                                { id: 'year', label: 'Tahun Ini' },
                                { id: 'single_day', label: 'Pilih 1 Hari' },
                                { id: 'custom', label: 'Rentang Kustom' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handlePresetChange(p.id)}
                                    className={`px-3.5 py-2 text-xs uppercase tracking-wider font-bold rounded-lg transition-all ${
                                        datePreset === p.id 
                                            ? 'bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20 border border-[#d4af37]' 
                                            : 'bg-[#111] border border-[#333] text-[#a1a1a1] hover:border-[#d4af37]/50 hover:text-white'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conditional Date Pickers */}
                    <AnimatePresence mode="wait">
                        {datePreset === 'select_month' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -5 }}
                                className="flex flex-wrap items-center gap-4 bg-[#141414]/90 p-4 rounded-lg border border-[#333]"
                            >
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-[#a1a1a1] uppercase font-bold tracking-wider">Pilih Bulan</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => handleMonthSelectChange(Number(e.target.value), selectedYear)}
                                        className="bg-[#1a1a1a] border border-[#444] text-white rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#d4af37]"
                                    >
                                        {monthsList.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-[#a1a1a1] uppercase font-bold tracking-wider">Tahun</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => handleMonthSelectChange(selectedMonth, Number(e.target.value))}
                                        className="bg-[#1a1a1a] border border-[#444] text-white rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#d4af37]"
                                    >
                                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-xs text-[#a1a1a1] pt-4 font-mono">
                                    Menampilkan: <strong className="text-white">{dateFrom}</strong> s/d <strong className="text-white">{dateTo}</strong>
                                </div>
                            </motion.div>
                        )}

                        {datePreset === 'single_day' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -5 }}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#141414]/90 p-4 rounded-lg border border-[#333]"
                            >
                                <label className="text-xs text-[#a1a1a1] uppercase font-bold tracking-wider">Pilih Tanggal:</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setDateTo(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-[#1a1a1a] border border-[#444] text-white rounded-lg px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#d4af37] cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                />
                            </motion.div>
                        )}

                        {datePreset === 'custom' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -5 }}
                                className="flex flex-wrap items-center gap-4 bg-[#141414]/90 p-4 rounded-lg border border-[#333]"
                            >
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-[#a1a1a1] uppercase font-bold tracking-wider">Dari Tanggal</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                                        className="bg-[#1a1a1a] border border-[#444] text-white rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#d4af37] cursor-pointer"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-[#a1a1a1] uppercase font-bold tracking-wider">Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                                        className="bg-[#1a1a1a] border border-[#444] text-white rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#d4af37] cursor-pointer"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Secondary Filters: Search, Payment Method, Barber */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#222]">
                        {/* Search Input */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Cari nama, hp, layanan..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-[#111] border border-[#333] hover:border-[#555] focus:border-[#d4af37] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                            />
                        </div>

                        {/* Payment Method Filter */}
                        <div className="relative">
                            <select
                                value={paymentFilter}
                                onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-[#111] border border-[#333] hover:border-[#555] focus:border-[#d4af37] rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors cursor-pointer font-medium"
                            >
                                <option value="all">Semua Metode Pembayaran</option>
                                <option value="tunai">💵 Tunai (Cash)</option>
                                <option value="qris">📱 QRIS</option>
                                <option value="transfer">🏦 Transfer Bank</option>
                            </select>
                        </div>

                        {/* Barber Filter */}
                        <div className="relative">
                            <select
                                value={barberFilter}
                                onChange={(e) => { setBarberFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-[#111] border border-[#333] hover:border-[#555] focus:border-[#d4af37] rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors cursor-pointer font-medium"
                            >
                                <option value="all">Semua Kapster</option>
                                {barbersList.map(b => (
                                    <option key={b} value={b}>✂️ {b}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Order */}
                        <div className="relative">
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] hover:border-[#555] focus:border-[#d4af37] rounded-lg px-3 py-2 text-xs text-white outline-none transition-colors cursor-pointer font-medium"
                            >
                                <option value="desc">Terbaru ke Terlama</option>
                                <option value="asc">Terlama ke Terbaru</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Financial Summary & Calculation Cards (Matches Spreadsheet Kalkulasi Transaksi) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Keseluruhan */}
                    <div className="glass-card p-5 border border-[#d4af37]/30 bg-gradient-to-br from-[#1c1708] to-[#121212] relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-[#d4af37] font-bold block">
                                    Total Keseluruhan
                                </span>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-white mt-1 font-mono">
                                    {formatIDR(metrics.grandTotal)}
                                </h3>
                            </div>
                            <div className="p-2.5 bg-[#d4af37]/20 rounded-lg text-[#d4af37]">
                                <DollarSign size={22} />
                            </div>
                        </div>
                        <div className="text-xs text-[#a1a1a1] pt-2 border-t border-[#d4af37]/15 flex justify-between items-center">
                            <span>Total Selesai:</span>
                            <strong className="text-white font-mono">{metrics.totalTransactions} Transaksi</strong>
                        </div>
                    </div>

                    {/* Card 2: Total Tunai */}
                    <div className="glass-card p-5 border border-emerald-500/20 bg-gradient-to-br from-[#0a1a10] to-[#121212]">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
                                    Total Tunai (Cash)
                                </span>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-emerald-300 mt-1 font-mono">
                                    {formatIDR(metrics.totalCash)}
                                </h3>
                            </div>
                            <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <Wallet size={22} />
                            </div>
                        </div>
                        <div className="text-xs text-[#a1a1a1] pt-2 border-t border-emerald-500/10 flex justify-between items-center">
                            <span>Jumlah:</span>
                            <strong className="text-white font-mono">{metrics.countCash} Kepala ({metrics.totalTransactions > 0 ? Math.round((metrics.countCash / metrics.totalTransactions) * 100) : 0}%)</strong>
                        </div>
                    </div>

                    {/* Card 3: Total QRIS */}
                    <div className="glass-card p-5 border border-cyan-500/20 bg-gradient-to-br from-[#081720] to-[#121212]">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold block">
                                    Total QRIS
                                </span>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-cyan-300 mt-1 font-mono">
                                    {formatIDR(metrics.totalQris)}
                                </h3>
                            </div>
                            <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400">
                                <QrCode size={22} />
                            </div>
                        </div>
                        <div className="text-xs text-[#a1a1a1] pt-2 border-t border-cyan-500/10 flex justify-between items-center">
                            <span>Jumlah:</span>
                            <strong className="text-white font-mono">{metrics.countQris} Kepala ({metrics.totalTransactions > 0 ? Math.round((metrics.countQris / metrics.totalTransactions) * 100) : 0}%)</strong>
                        </div>
                    </div>

                    {/* Card 4: Average Ticket & Summary */}
                    <div className="glass-card p-5 border border-purple-500/20 bg-gradient-to-br from-[#150a20] to-[#121212]">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold block">
                                    Rata-Rata Transaksi
                                </span>
                                <h3 className="text-2xl lg:text-3xl font-extrabold text-purple-300 mt-1 font-mono">
                                    {formatIDR(metrics.avgTicket)}
                                </h3>
                            </div>
                            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400">
                                <Sparkles size={22} />
                            </div>
                        </div>
                        <div className="text-xs text-[#a1a1a1] pt-2 border-t border-purple-500/10 flex justify-between items-center">
                            <span>Total Kepala:</span>
                            <strong className="text-white font-mono">{metrics.totalTransactions} Orang</strong>
                        </div>
                    </div>
                </div>

                {/* Capster Performance Breakdown Chips */}
                {Object.keys(metrics.barberSummary).length > 0 && (
                    <div className="glass-card p-4 border border-[#222]">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="text-xs uppercase tracking-wider text-[#d4af37] font-bold flex items-center gap-2">
                                <Scissors size={14} /> Ringkasan Kepala per Kapster
                            </span>
                            <span className="text-[11px] text-gray-400">
                                Periode: {dateFrom} s/d {dateTo}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.keys(metrics.barberSummary).map(barber => {
                                const bData = metrics.barberSummary[barber];
                                const pct = metrics.totalTransactions > 0 ? Math.round((bData.count / metrics.totalTransactions) * 100) : 0;
                                return (
                                    <div key={barber} className="p-3 bg-[#111] rounded-lg border border-[#222] flex justify-between items-center">
                                        <div>
                                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <span>✂️</span> {barber}
                                            </div>
                                            <div className="text-[11px] text-[#d4af37] font-mono mt-0.5">
                                                {formatIDR(bData.total)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-extrabold text-white font-mono">
                                                {bData.count} <span className="text-[10px] font-normal text-gray-400">kepala</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-semibold">
                                                {pct}% total
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Spreadsheet Table Section */}
                <div className="glass-card border border-[#d4af37]/20 overflow-hidden shadow-2xl">
                    <div className="p-4 sm:p-5 border-b border-[#222] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#141414]/70">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <span>Tabel Transaksi Selesai</span>
                                <span className="text-xs font-mono bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full">
                                    {filteredRecords.length} Baris
                                </span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Menampilkan riwayat transaksi yang sudah selesai sesuai format spreadsheet.
                            </p>
                        </div>

                        {/* Page Size Selector */}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>Tampilkan:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-[#111] border border-[#333] text-white rounded px-2 py-1 focus:outline-none focus:border-[#d4af37]"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Horizontal Scrollable Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-[#333] bg-[#111]/90 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                                    <th className="p-3.5 text-center w-12">No</th>
                                    <th className="p-3.5 whitespace-nowrap">Nominal</th>
                                    <th className="p-3.5 whitespace-nowrap">Jenis Transaksi</th>
                                    <th className="p-3.5 whitespace-nowrap">Nama Pelanggan</th>
                                    <th className="p-3.5 whitespace-nowrap">Tanggal & Waktu</th>
                                    <th className="p-3.5 whitespace-nowrap">Kapster</th>
                                    <th className="p-3.5 whitespace-nowrap">Layanan</th>
                                    <th className="p-3.5 whitespace-nowrap">Status</th>
                                    <th className="p-3.5">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]/60">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-[#d4af37]" size={28} />
                                                <span>Memuat data transaksi...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedRecords.length > 0 ? (
                                    paginatedRecords.map((row, idx) => {
                                        const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                                        return (
                                            <tr 
                                                key={row.unique_key || row.id || idx}
                                                className="hover:bg-[#141414] transition-colors"
                                            >
                                                {/* No */}
                                                <td className="p-3.5 text-center text-gray-500 font-mono">
                                                    {rowNumber}
                                                </td>

                                                {/* Nominal */}
                                                <td className="p-3.5 font-mono font-bold text-[#d4af37] whitespace-nowrap text-sm">
                                                    {formatIDR(row.nominal)}
                                                </td>

                                                {/* Jenis Transaksi */}
                                                <td className="p-3.5 whitespace-nowrap">
                                                    {row.payment_method === 'Tunai' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                                                            💵 Tunai
                                                        </span>
                                                    )}
                                                    {row.payment_method === 'QRIS' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold">
                                                            📱 QRIS
                                                        </span>
                                                    )}
                                                    {row.payment_method === 'Transfer' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] text-[11px] font-bold">
                                                            🏦 Transfer
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Nama Pelanggan */}
                                                <td className="p-3.5 font-semibold text-white whitespace-nowrap">
                                                    <div>{row.customer_name}</div>
                                                    {row.phone_number && (
                                                        <div className="text-[10px] text-gray-500 font-mono">
                                                            {row.phone_number}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Tanggal & Waktu */}
                                                <td className="p-3.5 whitespace-nowrap text-gray-300">
                                                    <div className="font-medium">{formatDisplayDate(row.date)}</div>
                                                    {row.time && (
                                                        <div className="text-[10px] text-gray-500 font-mono">
                                                            Pukul {row.time} WIB
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Kapster */}
                                                <td className="p-3.5 whitespace-nowrap text-gray-300">
                                                    <span className="bg-[#1a1a1a] px-2 py-0.5 rounded text-gray-300 border border-[#333] font-medium">
                                                        {row.barber_name}
                                                    </span>
                                                </td>

                                                {/* Layanan */}
                                                <td className="p-3.5 whitespace-nowrap text-gray-300">
                                                    {row.service_name}
                                                </td>

                                                {/* Status */}
                                                <td className="p-3.5 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase">
                                                        <CheckCircle2 size={12} /> Selesai
                                                    </span>
                                                </td>

                                                {/* Keterangan */}
                                                <td className="p-3.5 text-gray-400 max-w-xs truncate" title={row.notes}>
                                                    {row.notes}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FileSpreadsheet className="text-gray-600" size={36} />
                                                <p className="text-sm font-semibold text-gray-300">Tidak ada data transaksi selesai pada rentang ini.</p>
                                                <p className="text-xs text-gray-500">Coba pilih preset rentang waktu lain atau ubah filter pencarian.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                            {/* Table Footer Totals (Spreadsheet Kalkulasi Transaksi) */}
                            {filteredRecords.length > 0 && (
                                <tfoot>
                                    <tr className="bg-[#111] border-t-2 border-[#d4af37]/30 text-xs font-bold text-white">
                                        <td className="p-3.5 text-center text-[#d4af37] font-mono uppercase text-[10px]">
                                            TOTAL
                                        </td>
                                        <td className="p-3.5 font-mono text-[#d4af37] text-sm">
                                            {formatIDR(metrics.grandTotal)}
                                        </td>
                                        <td className="p-3.5 text-xs text-gray-300" colSpan={7}>
                                            <div className="flex flex-wrap items-center gap-4 text-[11px]">
                                                <span>💵 Tunai: <strong className="text-emerald-400 font-mono">{formatIDR(metrics.totalCash)}</strong> ({metrics.countCash}x)</span>
                                                <span>📱 QRIS: <strong className="text-cyan-400 font-mono">{formatIDR(metrics.totalQris)}</strong> ({metrics.countQris}x)</span>
                                                {metrics.totalTransfer > 0 && (
                                                    <span>🏦 Transfer: <strong className="text-[#d4af37] font-mono">{formatIDR(metrics.totalTransfer)}</strong> ({metrics.countTransfer}x)</span>
                                                )}
                                                <span className="text-gray-400">| Total: <strong className="text-white font-mono">{metrics.totalTransactions} Kepala</strong></span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Table Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-[#222] flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#111]/60">
                            <span className="text-xs text-gray-400">
                                Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong> (Total {filteredRecords.length} Transaksi)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                >
                                    <ChevronLeft size={14} /> Sebelumnya
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                                >
                                    Selanjutnya <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
