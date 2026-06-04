import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_SETTINGS = {
    opening_hour: '10:00',
    closing_hour: '21:00',
    daily_hours: [
        { dayOfWeek: 1, dayName: 'Senin', isHoliday: false, openingHour: '10:00', closingHour: '22:00' },
        { dayOfWeek: 2, dayName: 'Selasa', isHoliday: false, openingHour: '10:00', closingHour: '22:00' },
        { dayOfWeek: 3, dayName: 'Rabu', isHoliday: false, openingHour: '10:00', closingHour: '22:00' },
        { dayOfWeek: 4, dayName: 'Kamis', isHoliday: false, openingHour: '10:00', closingHour: '22:00' },
        { dayOfWeek: 5, dayName: 'Jumat', isHoliday: false, openingHour: '10:00', closingHour: '22:00' },
        { dayOfWeek: 6, dayName: 'Sabtu', isHoliday: true, openingHour: '10:00', closingHour: '22:00' },
        { dayOfWeek: 0, dayName: 'Minggu', isHoliday: false, openingHour: '10:00', closingHour: '22:00' }
    ]
};

export function useStoreSettings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('*')
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching store settings:', error);
                } else if (data) {
                    let parsedDailyHours = data.daily_hours;
                    if (typeof parsedDailyHours === 'string') {
                        try {
                            parsedDailyHours = JSON.parse(parsedDailyHours);
                        } catch (e) {
                            console.error('Error parsing daily_hours on web:', e);
                        }
                    }
                    setSettings({
                        opening_hour: data.opening_hour || DEFAULT_SETTINGS.opening_hour,
                        closing_hour: data.closing_hour || DEFAULT_SETTINGS.closing_hour,
                        daily_hours: parsedDailyHours || DEFAULT_SETTINGS.daily_hours
                    });
                }
            } catch (err) {
                console.error('Exception fetching store settings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    return { settings, loading };
}
