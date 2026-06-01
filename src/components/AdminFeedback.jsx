import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Loader2, MessageSquareText, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PAGE_SIZE = 6;

const statusLabels = {
    new: 'Baru',
    reviewed: 'Ditinjau',
    done: 'Selesai',
    archived: 'Diarsipkan'
};

const statusStyles = {
    new: 'text-[#d4af37] border-[#d4af37]/40 bg-[#d4af37]/10',
    reviewed: 'text-blue-300 border-blue-400/40 bg-blue-400/10',
    done: 'text-green-400 border-green-400/40 bg-green-400/10',
    archived: 'text-[#a1a1a1] border-[#333] bg-[#1a1a1a]'
};

const activeStatusOptions = [
    { key: 'all', label: 'Aktif' },
    { key: 'new', label: 'Baru' },
    { key: 'reviewed', label: 'Ditinjau' },
    { key: 'done', label: 'Selesai' }
];

const applySearch = (query, searchTerm) => {
    const term = searchTerm.trim();
    if (!term) return query;

    const escaped = term.replace(/[%_,]/g, '');
    return query.or(`name.ilike.%${escaped}%,phone_number.ilike.%${escaped}%,category.ilike.%${escaped}%,message.ilike.%${escaped}%`);
};

const Pagination = ({ page, total, onPageChange, label }) => {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 text-xs text-[#a1a1a1]">
            <span>
                {label}: {start}-{end} dari {total}
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="w-9 h-9 rounded border border-[#333] text-[#d4af37] disabled:text-[#444] disabled:cursor-not-allowed hover:border-[#d4af37]/60 transition-colors flex items-center justify-center"
                    aria-label={`Halaman ${label} sebelumnya`}
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="min-w-16 text-center font-mono">
                    {page} / {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="w-9 h-9 rounded border border-[#333] text-[#d4af37] disabled:text-[#444] disabled:cursor-not-allowed hover:border-[#d4af37]/60 transition-colors flex items-center justify-center"
                    aria-label={`Halaman ${label} berikutnya`}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

const FeedbackCard = ({ item, updatingId, onUpdateStatus, compact = false }) => {
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card border border-[#d4af37]/10 ${compact ? 'p-5' : 'p-6'}`}
        >
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-2 py-1 rounded bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 text-[10px] uppercase tracking-widest font-bold">
                    {item.category}
                </span>
                <span className={`px-2 py-1 rounded border text-[10px] uppercase tracking-widest font-bold ${statusStyles[item.status] || statusStyles.new}`}>
                    {statusLabels[item.status] || item.status}
                </span>
                <span className="text-[11px] text-[#777]">{formatDate(item.created_at)}</span>
            </div>

            <p className={`text-white leading-relaxed whitespace-pre-wrap break-words mb-5 ${compact ? 'text-sm' : ''}`}>
                {item.message}
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#a1a1a1] border-t border-[#333]/70 pt-4">
                <span>Nama: <span className="text-white">{item.name || '-'}</span></span>
                <span>WhatsApp: <span className="text-white font-mono">{item.phone_number || '-'}</span></span>
                <span>Sumber: <span className="text-white">{item.source || '-'}</span></span>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
                {item.status === 'archived' && (
                    <button
                        onClick={() => onUpdateStatus(item.id, 'new')}
                        disabled={updatingId === item.id}
                        className="h-10 min-w-[140px] flex items-center justify-center gap-2 px-4 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#d4af37] rounded text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                    >
                        {updatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Aktifkan
                    </button>
                )}
                {item.status !== 'reviewed' && item.status !== 'done' && item.status !== 'archived' && (
                    <button
                        onClick={() => onUpdateStatus(item.id, 'reviewed')}
                        disabled={updatingId === item.id}
                        className="h-10 min-w-[140px] flex items-center justify-center gap-2 px-4 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/30 text-blue-300 rounded text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                    >
                        {updatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Tinjau
                    </button>
                )}
                {item.status !== 'done' && item.status !== 'archived' && (
                    <button
                        onClick={() => onUpdateStatus(item.id, 'done')}
                        disabled={updatingId === item.id}
                        className="h-10 min-w-[140px] flex items-center justify-center gap-2 px-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                    >
                        {updatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Selesai
                    </button>
                )}
                {item.status !== 'archived' && (
                    <button
                        onClick={() => onUpdateStatus(item.id, 'archived')}
                        disabled={updatingId === item.id}
                        className="h-10 min-w-[140px] flex items-center justify-center gap-2 px-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-[#a1a1a1] rounded text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                    >
                        {updatingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                        Arsip
                    </button>
                )}
            </div>
        </motion.article>
    );
};

const AdminFeedback = () => {
    const navigate = useNavigate();
    const [activeFeedback, setActiveFeedback] = useState([]);
    const [archivedFeedback, setArchivedFeedback] = useState([]);
    const [activeTotal, setActiveTotal] = useState(0);
    const [archiveTotal, setArchiveTotal] = useState(0);
    const [counts, setCounts] = useState({ all: 0, new: 0, reviewed: 0, done: 0, archived: 0 });
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activePage, setActivePage] = useState(1);
    const [archivePage, setArchivePage] = useState(1);

    const fetchCounts = async () => {
        const buildCountQuery = (status) => {
            let query = supabase
                .from('feedback_submissions')
                .select('id', { count: 'exact', head: true });

            if (status === 'all') query = query.neq('status', 'archived');
            else query = query.eq('status', status);

            return applySearch(query, searchTerm);
        };

        const [all, fresh, reviewed, done, archived] = await Promise.all([
            buildCountQuery('all'),
            buildCountQuery('new'),
            buildCountQuery('reviewed'),
            buildCountQuery('done'),
            buildCountQuery('archived')
        ]);

        const countErrors = [all, fresh, reviewed, done, archived].find((result) => result.error);
        if (countErrors?.error) throw countErrors.error;

        setCounts({
            all: all.count || 0,
            new: fresh.count || 0,
            reviewed: reviewed.count || 0,
            done: done.count || 0,
            archived: archived.count || 0
        });
    };

    const fetchSection = async ({ archived = false, page = 1 }) => {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
            .from('feedback_submissions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (archived) {
            query = query.eq('status', 'archived');
        } else if (statusFilter === 'all') {
            query = query.neq('status', 'archived');
        } else {
            query = query.eq('status', statusFilter);
        }

        query = applySearch(query, searchTerm);
        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        return { data: data || [], count: count || 0 };
    };

    const fetchFeedback = async () => {
        setLoading(true);
        setError('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/_studio_admin/login');
                return;
            }

            const [active, archived] = await Promise.all([
                fetchSection({ archived: false, page: activePage }),
                fetchSection({ archived: true, page: archivePage }),
                fetchCounts()
            ]);

            setActiveFeedback(active.data);
            setActiveTotal(active.count);
            setArchivedFeedback(archived.data);
            setArchiveTotal(archived.count);
        } catch (err) {
            console.error('Error fetching feedback:', err);
            setError('Gagal memuat saran dan masukan.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(fetchFeedback, 250);
        return () => clearTimeout(delay);
    }, [searchTerm, statusFilter, activePage, archivePage]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) navigate('/_studio_admin/login');
        });

        const channel = supabase
            .channel('admin-feedback-submissions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'feedback_submissions' },
                () => fetchFeedback()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            subscription.unsubscribe();
        };
    }, [navigate, searchTerm, statusFilter, activePage, archivePage]);

    useEffect(() => {
        setActivePage(1);
        setArchivePage(1);
    }, [searchTerm]);

    useEffect(() => {
        setActivePage(1);
    }, [statusFilter]);

    const activeFilterLabel = useMemo(() => {
        const match = activeStatusOptions.find((option) => option.key === statusFilter);
        return match?.label || 'Aktif';
    }, [statusFilter]);

    const updateStatus = async (id, status) => {
        setUpdatingId(id);
        setError('');

        try {
            const { error: updateError } = await supabase
                .from('feedback_submissions')
                .update({ status })
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchFeedback();
        } catch (err) {
            console.error('Error updating feedback status:', err);
            setError('Gagal memperbarui status masukan.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white px-5 py-8 sm:px-8 sm:py-10 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10">
                    <div className="mb-7">
                        <button
                            onClick={() => navigate('/_studio_admin')}
                            className="flex items-center gap-2 text-[#a1a1a1] hover:text-[#d4af37] transition-colors mb-4 text-sm"
                        >
                            <ArrowLeft size={16} /> Kembali ke Studio
                        </button>
                        <span className="uppercase tracking-[0.3em] text-[#d4af37] text-xs">Suara Pelanggan</span>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h1 className="serif text-4xl sm:text-5xl font-bold leading-none">
                                Saran dan Masukan
                            </h1>
                            <div className="h-10 w-10 rounded border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center shrink-0">
                                <MessageSquareText size={21} />
                            </div>
                        </div>

                        <div className="relative w-full">
                            <Search size={19} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#555]" />
                            <input
                                type="text"
                                placeholder="Cari nama, nomor, kategori, pesan..."
                                className="h-14 w-full bg-[#111] border border-[#333] rounded px-5 pl-14 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <div className="flex gap-5 overflow-x-auto pb-2 mb-12">
                    {[
                        ['all', 'Aktif', counts.all, MessageSquareText],
                        ['new', 'Baru', counts.new, Inbox],
                        ['reviewed', 'Ditinjau', counts.reviewed, ShieldCheck],
                        ['done', 'Selesai', counts.done, CheckCircle2],
                        ['archived', 'Arsip', counts.archived, Archive]
                    ].map(([key, label, count, Icon]) => {
                        const isArchiveCard = key === 'archived';
                        const isActive = !isArchiveCard && statusFilter === key;

                        return (
                            <button
                                key={key}
                                onClick={() => {
                                    if (isArchiveCard) return;
                                    setStatusFilter(key);
                                }}
                                className={`h-[96px] min-w-[230px] flex-1 glass-card px-5 py-4 text-left border transition-colors flex items-center gap-4 ${isActive ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-[#333] hover:border-[#d4af37]/50'} ${isArchiveCard ? 'cursor-default opacity-80' : ''}`}
                            >
                                <div className="h-11 w-11 rounded bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] flex items-center justify-center shrink-0">
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-[#a1a1a1] mb-2">{label}</div>
                                    <div className="text-3xl leading-none font-bold text-[#d4af37]">{count}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div className="mb-6 border border-red-500/30 bg-red-500/10 text-red-300 rounded p-4 text-sm">
                        {error}
                    </div>
                )}

                <section className="mb-20">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                        <div>
                            <h2 className="serif text-2xl font-bold">Kotak Masukan {activeFilterLabel}</h2>
                            <p className="text-sm text-[#a1a1a1] mt-1">Masukan aktif dikelola di sini. Arsip dipisahkan di bawah.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#a1a1a1]">
                            <Loader2 className="animate-spin mb-4 text-[#d4af37]" size={32} />
                            <p className="uppercase tracking-widest text-xs">Memuat masukan pelanggan...</p>
                        </div>
                    ) : activeFeedback.length === 0 ? (
                        <div className="glass-card min-h-[220px] p-12 text-center flex flex-col items-center justify-center">
                            <Inbox size={38} className="mx-auto mb-4 text-[#d4af37]/70" />
                            <p className="serif text-2xl font-bold mb-2">Tidak ada masukan aktif.</p>
                            <p className="text-sm text-[#a1a1a1]">Masukan baru dari tombol floating akan muncul di sini.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {activeFeedback.map((item) => (
                                    <FeedbackCard
                                        key={item.id}
                                        item={item}
                                        updatingId={updatingId}
                                        onUpdateStatus={updateStatus}
                                    />
                                ))}
                            </div>
                            <Pagination
                                page={activePage}
                                total={activeTotal}
                                onPageChange={setActivePage}
                                label="Masukan aktif"
                            />
                        </>
                    )}
                </section>

                <section className="glass-card p-6 sm:p-7 border border-[#333] mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                        <div>
                            <h2 className="serif text-2xl font-bold flex items-center gap-3">
                                Arsip Masukan <Archive size={22} className="text-[#d4af37]" />
                            </h2>
                            <p className="text-sm text-[#a1a1a1] mt-1">Masukan yang sudah diarsipkan dipisahkan agar daftar utama tetap ringkas.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-[#a1a1a1] text-sm">Memuat arsip...</div>
                    ) : archivedFeedback.length === 0 ? (
                        <div className="py-10 text-center text-[#555] text-sm italic">Belum ada masukan yang diarsipkan.</div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {archivedFeedback.map((item) => (
                                    <FeedbackCard
                                        key={item.id}
                                        item={item}
                                        updatingId={updatingId}
                                        onUpdateStatus={updateStatus}
                                        compact
                                    />
                                ))}
                            </div>
                            <Pagination
                                page={archivePage}
                                total={archiveTotal}
                                onPageChange={setArchivePage}
                                label="Arsip"
                            />
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminFeedback;
