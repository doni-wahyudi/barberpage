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
        log('Fetching all rows from public.discounts table...');
        const { data, error } = await supabase.from('discounts').select('*');
        if (error) {
            log('Error fetching discounts:', error);
        } else {
            log('Found ' + data.length + ' rows:', data);
        }
    } catch (e) {
        log('Exception: ' + e.message);
    }

    fs.writeFileSync('test_output_discounts.txt', output);
}

run();
