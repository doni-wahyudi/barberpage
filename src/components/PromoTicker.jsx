import React from 'react';
import { X } from 'lucide-react';

const formatDiscount = (discount) => {
    if (discount.type === 'percent' || discount.type === 'percentage') {
        return `${Number(discount.value)}% OFF`;
    }

    return `${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(discount.value))} OFF`;
};

const formatMinimumPurchase = (discount) => {
    if (!discount.min_purchase || Number(discount.min_purchase) <= 0) return '';

    return ` - Minimum belanja ${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(discount.min_purchase))}`;
};

const PromoTicker = ({ discounts, onClose }) => {
    if (!discounts.length) return null;

    return (
        <aside
            className="promo-ticker fixed inset-x-0 top-0 z-[60] h-10 overflow-hidden border-b border-[#f1d592]/40 text-[#0a0a0a] shadow-[0_4px_18px_rgba(212,175,55,0.22)]"
            aria-label="Promo aktif"
        >
            <div className="promo-ticker-track h-full">
                <span className="flex h-full shrink-0 items-center gap-3 whitespace-nowrap px-8 text-[11px] font-black uppercase tracking-[0.13em] sm:text-xs">
                    <span className="promo-ticker-badge">HOT DEAL</span>
                    <span aria-hidden="true" className="text-base leading-none">✦</span>
                    {discounts.map((discount, index) => (
                        <React.Fragment key={discount.id}>
                            {index > 0 && <span aria-hidden="true" className="text-black/50">|</span>}
                            <span>
                                {discount.name} - HEMAT {formatDiscount(discount)}
                                {formatMinimumPurchase(discount)}
                            </span>
                        </React.Fragment>
                    ))}
                    <span aria-hidden="true" className="text-black/50">|</span>
                    <span className="promo-ticker-cta">
                        BOOKING SEKARANG
                        <span aria-hidden="true" className="promo-ticker-cta-arrow">→</span>
                    </span>
                    <span aria-hidden="true" className="text-base leading-none">✦</span>
                </span>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center border-l border-black/20 bg-[#d4af37]/95 text-[#0a0a0a] backdrop-blur-sm transition-colors hover:bg-[#f1d592] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
                aria-label="Tutup promo"
                title="Tutup promo"
            >
                <X size={17} strokeWidth={2.5} />
            </button>
        </aside>
    );
};

export default PromoTicker;
