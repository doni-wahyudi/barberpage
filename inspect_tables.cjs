const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ifawbnmbmedwwsmaqzxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYXdibm1ibWVkd3dzbWFxenhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjU0NzMsImV4cCI6MjA4NjU0MTQ3M30.Aav9g5LDDViNyW4lR8xlQEXFapxWFabeRd4xg6dkzxc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    try {
        console.log('--- Fetching policies ---');
        // Let's run a query to get pg_policies for transactions
        const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'transactions' });
        
        if (error) {
            console.log('RPC failed (probably does not exist). Querying directly via a general select if possible...');
            // Let's try executing a raw query if we can or check what error we get.
            // Since we can't run raw SQL directly without RPC, let's select from pg_policies if it's exposed, but pg_catalog is usually not exposed over PostgREST.
            // So let's try reading from transactions with a known user_id or see if we can do select * from transactions.
            const { data: txs, error: err2 } = await supabase.from('transactions').select('*').limit(1);
            console.log('Sample transaction select:', err2 || txs);
        } else {
            console.log('Policies:', data);
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

run();
