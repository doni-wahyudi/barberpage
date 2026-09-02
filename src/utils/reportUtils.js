/**
 * reportUtils.js
 * Utility functions for deduplicating, unifying, and calculating
 * financial transactions and customer metrics across POS and Web Bookings.
 */

export function normalizeStr(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizePhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('62')) return '0' + clean.slice(2);
    return clean;
}

/**
 * Builds a unified, clean, and deduplicated transaction dataset.
 * Combines POS transactions (source of truth for payment methods & amounts)
 * with Web reservations (source of truth for customer contacts & voucher programs)
 * and incorporates unmatched historical bookings.
 */
export function buildUnifiedTransactions(transactions = [], bookings = [], customers = [], servicesList = []) {
    const custMap = {};
    (customers || []).forEach(c => {
        if (c.id) custMap[c.id] = c;
        if (c.phone_number) custMap[normalizePhone(c.phone_number)] = c;
    });

    const matchedBookingIds = new Set();
    const unifiedRecords = [];

    // Helper to check if an item is a service or product
    const isServiceItem = (item) => {
        const pid = item.productId;
        if (pid === null || pid === undefined) {
            const name = (item.productName || item.name || '').toLowerCase();
            if (servicesList && servicesList.some(s => name.includes(s.name.toLowerCase()))) return true;
            return name.includes('mullet') || name.includes('cut') || name.includes('crop') || name.includes('fade') || name.includes('part') || name.includes('dewasa') || name.includes('anak') || name.includes('kustom') || name.includes('cukur');
        }
        const isNum = typeof pid === 'number' || (!isNaN(Number(pid)) && String(pid).trim() !== '' && !pid.toString().includes('-'));
        return isNum;
    };

    // 1. Process POS Transactions as primary financial source of truth
    (transactions || []).forEach(tx => {
        const txDate = tx.created_at ? tx.created_at.substring(0, 10) : '';
        const custFromId = custMap[tx.customer_id];
        const custPhone = custFromId?.phone_number || tx.customer_phone || tx.phone_number || '';
        const normCustPhone = normalizePhone(custPhone);
        const txNameNorm = normalizeStr(tx.customer_name);

        // Find best matching completed booking
        const matchingBooking = (bookings || []).find(b => {
            if (matchedBookingIds.has(b.id)) return false;
            
            // Explicit ID match if present
            if (tx.booking_id && tx.booking_id === b.id) return true;

            const bDate = b.booking_date || b.created_at?.substring(0, 10);
            if (bDate !== txDate) return false;

            const normBPhone = normalizePhone(b.phone_number);
            if (normCustPhone && normBPhone) {
                if (normCustPhone === normBPhone || normCustPhone.endsWith(normBPhone.slice(-8)) || normBPhone.endsWith(normCustPhone.slice(-8))) {
                    return true;
                }
            }

            const bNameNorm = normalizeStr(b.customer_name);
            if (txNameNorm && bNameNorm) {
                if (txNameNorm === bNameNorm || txNameNorm.includes(bNameNorm) || bNameNorm.includes(txNameNorm)) {
                    return true;
                }
            }
            return false;
        });

        if (matchingBooking) {
            matchedBookingIds.add(matchingBooking.id);
        }

        // Extract barber name and clean service name
        let barberName = null;
        let cleanServiceName = null;

        if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
            const serviceItems = [];
            for (const item of tx.items) {
                const rawName = item.productName || item.name || '';
                const match = rawName.match(/\(([^)]+)\)$/);
                if (match && (!barberName || barberName === 'Kasir / Studio')) {
                    barberName = match[1].trim();
                }
                const cleaned = rawName.replace(/\s*\([^)]+\)\s*$/, '').trim();
                if (cleaned) serviceItems.push(cleaned);
            }
            if (serviceItems.length > 0) {
                cleanServiceName = serviceItems.join(', ');
            }
        }

        if (!barberName || barberName === 'Kasir / Studio') {
            barberName = matchingBooking?.barber_name || tx.barber_name || 'Kasir / Studio';
        }
        if (!cleanServiceName) {
            cleanServiceName = matchingBooking?.service_type || 'Produk / POS';
        }

        let pm = (tx.payment_method || 'cash').toLowerCase();
        let paymentMethod = 'Tunai';
        if (pm.includes('qris')) paymentMethod = 'QRIS';
        else if (pm.includes('transfer')) paymentMethod = 'Transfer';
        else if (pm.includes('gopay')) paymentMethod = 'Gopay';
        else if (pm.includes('ovo')) paymentMethod = 'OVO';
        else paymentMethod = 'Tunai';

        const notesList = [];
        if (matchingBooking?.voucher_program) notesList.push(`Voucher: ${matchingBooking.voucher_program}`);
        if (matchingBooking?.referral_code) notesList.push(`Ref: ${matchingBooking.referral_code}`);
        if (tx.discount_total) notesList.push(`Diskon: Rp ${Number(tx.discount_total).toLocaleString('id-ID')}`);
        if (tx.note) notesList.push(tx.note);
        if (matchingBooking?.notes) notesList.push(matchingBooking.notes);

        // Separate service vs product revenue within transaction items
        let serviceRev = 0;
        let productRev = 0;
        if (tx.items && Array.isArray(tx.items) && tx.items.length > 0) {
            tx.items.forEach(item => {
                const sub = item.subtotal || (item.price * (item.quantity || 1)) || 0;
                if (isServiceItem(item)) {
                    serviceRev += sub;
                } else {
                    productRev += sub;
                }
            });
        } else {
            serviceRev = Number(tx.grand_total) || 0;
        }

        unifiedRecords.push({
            id: tx.id,
            unique_key: `pos_${tx.id}`,
            source: matchingBooking ? 'booking_pos' : 'pos',
            is_booking: !!matchingBooking,
            booking_id: matchingBooking?.id || null,
            date: txDate,
            time: tx.created_at ? new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
            customer_name: tx.customer_name || matchingBooking?.customer_name || 'Pelanggan Walk-in',
            phone_number: custPhone || matchingBooking?.phone_number || '',
            nominal: Number(tx.grand_total) || 0,
            subtotal: Number(tx.subtotal) || Number(tx.grand_total) || 0,
            discount: Number(tx.discount_total) || (matchingBooking?.voucher_discount || 0),
            service_revenue: serviceRev,
            product_revenue: productRev,
            payment_method: paymentMethod,
            barber_name: barberName,
            service_name: cleanServiceName,
            status: 'completed',
            notes: notesList.join(' | ') || '-',
            raw_created_at: tx.created_at,
            items: tx.items || []
        });
    });

    // 2. Add unmatched completed bookings (e.g. historical before POS or direct completed bookings)
    (bookings || []).forEach(b => {
        if (matchedBookingIds.has(b.id)) return;

        let paymentMethod = 'Tunai';
        if (b.payment_method) {
            const pm = b.payment_method.toLowerCase();
            if (pm.includes('qris')) paymentMethod = 'QRIS';
            else if (pm.includes('transfer')) paymentMethod = 'Transfer';
            else paymentMethod = 'Tunai';
        } else if (b.proof_url) {
            paymentMethod = 'QRIS';
        }

        const dateStr = b.booking_date || (b.created_at ? b.created_at.substring(0, 10) : '');
        const timeStr = b.booking_time ? b.booking_time.substring(0, 5) : '';

        const notesList = [];
        if (b.voucher_program) notesList.push(`Voucher: ${b.voucher_program}`);
        if (b.referral_code) notesList.push(`Ref: ${b.referral_code}`);
        if (b.notes) notesList.push(b.notes);

        const nominal = Number(b.total_price) || 0;
        const discount = Number(b.voucher_discount) || 0;

        unifiedRecords.push({
            id: b.id,
            unique_key: `booking_${b.id}`,
            source: 'booking',
            is_booking: true,
            booking_id: b.id,
            date: dateStr,
            time: timeStr,
            customer_name: b.customer_name || 'Pelanggan Anonim',
            phone_number: b.phone_number || '',
            nominal: nominal,
            subtotal: nominal + discount,
            discount: discount,
            service_revenue: nominal,
            product_revenue: 0,
            payment_method: paymentMethod,
            barber_name: b.barber_name || 'Capster',
            service_name: b.service_type || 'Haircut',
            status: 'completed',
            notes: notesList.join(' | ') || '-',
            raw_created_at: b.created_at || `${dateStr}T${timeStr || '00:00'}:00`,
            items: []
        });
    });

    return unifiedRecords;
}
