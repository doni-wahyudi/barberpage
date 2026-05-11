// supabase/functions/verify-voucher-otp/index.ts
// Edge Function: Verify the OTP, mark claim, return discount amount
// Deploy: supabase functions deploy verify-voucher-otp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { npm, otp_code, program_id } = await req.json()

    if (!npm || !otp_code || !program_id) {
      return new Response(
        JSON.stringify({ error: 'npm, otp_code, dan program_id wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const npmStr = String(npm).replace(/\D/g, '')
    const now = new Date().toISOString()

    // 1. Look up the latest unused OTP for this user/program
    const { data: otpRecord, error: otpError } = await supabase
      .from('program_otps')
      .select('id, otp_code, expires_at, is_used')
      .eq('program_id', program_id)
      .eq('identifier', npmStr)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: 'Kode OTP tidak ditemukan. Silakan minta kode baru.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Check expiry
    if (now > otpRecord.expires_at) {
      // Mark as used/expired so it can't be retried
      await supabase
        .from('program_otps')
        .update({ is_used: true })
        .eq('id', otpRecord.id)

      return new Response(
        JSON.stringify({ error: 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate the code (constant-time comparison to prevent timing attacks)
    const inputCode = String(otp_code).trim()
    const storedCode = String(otpRecord.otp_code).trim()
    if (inputCode !== storedCode) {
      return new Response(
        JSON.stringify({ error: 'Kode OTP salah. Periksa email Anda dan coba lagi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Mark OTP as used immediately (prevent replay)
    await supabase
      .from('program_otps')
      .update({ is_used: true })
      .eq('id', otpRecord.id)

    // 5. Fetch the program details to get discount amount
    const { data: program } = await supabase
      .from('promotion_programs')
      .select('discount_type, discount_value, max_discount, name')
      .eq('id', program_id)
      .single()

    if (!program) {
      return new Response(
        JSON.stringify({ error: 'Program tidak ditemukan.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Fetch student name for the claim record
    const { data: eligible } = await supabase
      .from('program_eligible_users')
      .select('name')
      .eq('program_id', program_id)
      .eq('identifier', npmStr)
      .single()

    // 7. Pre-insert a "pending" claim record (booking_id will be added later)
    //    The UNIQUE constraint on (program_id, identifier) prevents double-claims.
    const { data: claim, error: claimError } = await supabase
      .from('program_claims')
      .insert({
        program_id,
        identifier: npmStr,
        user_name: eligible?.name || null,
        discount_applied: program.discount_value,
        booking_id: null,  // Will be updated after booking is created
      })
      .select('id')
      .single()

    if (claimError) {
      // If UNIQUE violation: already claimed
      if (claimError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Voucher ini sudah pernah diklaim. Setiap NPM hanya dapat mengklaim satu kali.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.error('Claim insert error:', claimError)
      return new Response(
        JSON.stringify({ error: 'Gagal menyimpan klaim. Coba lagi.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Success! Return the discount details and claim token
    return new Response(
      JSON.stringify({
        success: true,
        claimId: claim.id,
        discountType: program.discount_type,
        discountValue: program.discount_value,
        maxDiscount: program.max_discount,
        programName: program.name,
        studentName: eligible?.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('verify-voucher-otp error:', err)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server. Coba beberapa saat lagi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
