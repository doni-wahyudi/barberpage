const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ifawbnmbmedwwsmaqzxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYXdibm1ibWVkd3dzbWFxenhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjU0NzMsImV4cCI6MjA4NjU0MTQ3M30.Aav9g5LDDViNyW4lR8xlQEXFapxWFabeRd4xg6dkzxc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    let output = '';
    const log = (msg, obj) => {
        output += msg + (obj ? ' ' + JSON.stringify(obj, null, 2) : '') + '\n';
    };

    try {
        log('--- CUSTOMERS SCHEMA CHECK ---');
        const { data: customers, error } = await supabase.from('customers').select('*').limit(5);
        if (error) {
            log('Error fetching customers:', error);
        } else {
            log('Fetched customers:', customers);
        }

        log('--- BOOKINGS FOR JALU AND ANANTA ---');
        const { data: bookings, error: bookErr } = await supabase.from('bookings').select('*').in('phone_number', ['085608385988', '081367769396']);
        if (bookErr) {
            log('Error fetching bookings:', bookErr);
        } else {
            log('Fetched bookings:', bookings);
        }
    } catch (e) {
        log('Unhandled exception: ' + e.message);
    }

    fs.writeFileSync('customers_output.txt', output);
}

run();
