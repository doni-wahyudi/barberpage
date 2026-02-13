import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ifawbnmbmedwwsmaqzxm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmYXdibm1ibWVkd3dzbWFxenhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjU0NzMsImV4cCI6MjA4NjU0MTQ3M30.Aav9g5LDDViNyW4lR8xlQEXFapxWFabeRd4xg6dkzxc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
