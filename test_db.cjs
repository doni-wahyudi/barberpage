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
        log('--- Testing supabase connection ---');
        
        log('1. Fetching all rows from discounts...');
        const { data: allDiscounts, error: err1 } = await supabase.from('discounts').select('*');
        if (err1) log('Error fetching all:', err1);
        else log('All discounts rows count: ' + allDiscounts.length, allDiscounts);

        log('2. Fetching with filters (is_active=true AND show_public=true)...');
        const { data: filteredDiscounts, error: err2 } = await supabase
            .from('discounts')
            .select('*')
            .eq('is_active', true)
            .eq('show_public', true);
        if (err2) log('Error fetching filtered:', err2);
        else log('Filtered discounts rows count: ' + filteredDiscounts.length, filteredDiscounts);
        
    } catch (e) {
        log('Unhandled exception: ' + e.message);
    }

    fs.writeFileSync('test_output.txt', output);
}

run();
