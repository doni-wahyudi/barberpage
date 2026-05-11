// supabase/functions/send-voucher-otp/index.ts
// Edge Function: Validate student eligibility & send OTP email via Sumopod SMTP
// Deploy: supabase functions deploy send-voucher-otp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  // Cryptographically secure 6-digit OTP
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 1000000).padStart(6, '0')
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '****'
  const visible = local.length > 2 ? local[0] + local[1] : local[0]
  return `${visible}***@${domain}`
}

function normalizePhone(raw: string): string {
  // Strip all non-digits, normalize to 08xx format
  let phone = raw.replace(/\D/g, '')
  if (phone.startsWith('62')) phone = '0' + phone.slice(2)
  if (!phone.startsWith('0')) phone = '0' + phone
  return phone
}

function phoneMatches(input: string, stored: string | null): boolean {
  if (!stored) return false
  return normalizePhone(input) === normalizePhone(stored)
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { npm, phone, program_id } = await req.json()

    // --- Input validation ---
    if (!npm || !phone || !program_id) {
      return new Response(
        JSON.stringify({ error: 'npm, phone, dan program_id wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Supabase client (service role to bypass RLS) ---
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Fetch the program to get OTP expiry duration
    const { data: program, error: programError } = await supabase
      .from('promotion_programs')
      .select('id, name, otp_expiry_minutes, is_active, start_date, end_date')
      .eq('id', program_id)
      .single()

    if (programError || !program) {
      return new Response(
        JSON.stringify({ error: 'Program voucher tidak ditemukan.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!program.is_active) {
      return new Response(
        JSON.stringify({ error: 'Program ini sudah tidak aktif.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check program validity window
    const today = new Date().toISOString().split('T')[0]
    if (program.start_date && today < program.start_date) {
      return new Response(
        JSON.stringify({ error: 'Program ini belum dimulai.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (program.end_date && today > program.end_date) {
      return new Response(
        JSON.stringify({ error: 'Program ini sudah berakhir.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Check if NPM is eligible
    const npmStr = String(npm).replace(/\D/g, '')
    const { data: eligible, error: eligibleError } = await supabase
      .from('program_eligible_users')
      .select('identifier, email, name, phone_number')
      .eq('program_id', program_id)
      .eq('identifier', npmStr)
      .single()

    if (eligibleError || !eligible) {
      return new Response(
        JSON.stringify({ error: 'NPM tidak ditemukan dalam daftar peserta program ini.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate phone number matches registered data
    if (!phoneMatches(phone, eligible.phone_number)) {
      return new Response(
        JSON.stringify({ error: 'Nomor HP tidak sesuai dengan data pendaftaran.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check if already claimed
    const { data: existingClaim } = await supabase
      .from('program_claims')
      .select('id, claimed_at')
      .eq('program_id', program_id)
      .eq('identifier', npmStr)
      .single()

    if (existingClaim) {
      const claimedDate = new Date(existingClaim.claimed_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
      return new Response(
        JSON.stringify({ error: `Voucher ini sudah pernah diklaim pada ${claimedDate}. Setiap NPM hanya dapat mengklaim satu kali.` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Generate OTP and calculate expiry
    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + program.otp_expiry_minutes * 60 * 1000).toISOString()

    // 6. Invalidate any previous unused OTPs for this user/program
    await supabase
      .from('program_otps')
      .update({ is_used: true })
      .eq('program_id', program_id)
      .eq('identifier', npmStr)
      .eq('is_used', false)

    // 7. Insert new OTP record
    const { error: otpInsertError } = await supabase
      .from('program_otps')
      .insert({
        program_id,
        identifier: npmStr,
        otp_code: otp,
        email_sent_to: eligible.email,
        is_used: false,
        expires_at: expiresAt,
      })

    if (otpInsertError) {
      console.error('OTP insert error:', otpInsertError)
      return new Response(
        JSON.stringify({ error: 'Gagal membuat kode OTP. Coba lagi.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Send OTP email via Sumopod SMTP (using nodemailer)
    const smtpUser = Deno.env.get('SUMOPOD_USER')!
    const smtpPass = Deno.env.get('SUMOPOD_PASS')!
    const senderEmail = Deno.env.get('SENDER_EMAIL') || smtpUser

    const transporter = nodemailer.createTransport({
      host: 'smtp.sumopod.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const studentName = eligible.name || 'Mahasiswa'
    const emailBody = `
Halo ${studentName},

Terima kasih telah bergabung dalam Program ${program.name}!

Kode verifikasi (OTP) Anda adalah:

  ━━━━━━━━━━━━━━━━━━━━
        ${otp}
  ━━━━━━━━━━━━━━━━━━━━

Kode ini berlaku selama ${program.otp_expiry_minutes} menit.
Jangan bagikan kode ini kepada siapapun.

Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.

Salam hangat,
Auro Barbershop
`.trim()

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;">
    <tr>
      <td style="background:#141414;border:1px solid #d4af3730;border-radius:8px;padding:40px;text-align:center;">
        <h1 style="color:#d4af37;font-size:22px;letter-spacing:0.2em;margin:0 0 8px;">AURO BARBERSHOP</h1>
        <p style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 32px;">Program ${program.name}</p>
        
        <p style="color:#a1a1a1;font-size:14px;margin:0 0 8px;">Halo <strong style="color:#fff;">${studentName}</strong>,</p>
        <p style="color:#a1a1a1;font-size:14px;margin:0 0 32px;">Kode verifikasi Anda:</p>
        
        <div style="background:#1f1f1f;border:1px solid #d4af37;border-radius:6px;padding:24px;margin:0 0 24px;">
          <p style="color:#d4af37;font-size:42px;font-weight:bold;letter-spacing:0.3em;margin:0;font-family:monospace;">${otp}</p>
        </div>
        
        <p style="color:#666;font-size:12px;margin:0 0 8px;">Berlaku selama <strong style="color:#a1a1a1;">${program.otp_expiry_minutes} menit</strong></p>
        <p style="color:#555;font-size:11px;margin:0;">Jangan bagikan kode ini kepada siapapun.</p>
        
        <hr style="border:none;border-top:1px solid #222;margin:32px 0;">
        <p style="color:#333;font-size:10px;margin:0;">© ${new Date().getFullYear()} Auro Barbershop. Semua hak dilindungi.</p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

    await transporter.sendMail({
      from: `"Auro Barbershop" <${senderEmail}>`,
      to: eligible.email,
      subject: `[${otp}] Kode Verifikasi Program ${program.name} - Auro Barbershop`,
      text: emailBody,
      html: emailHtml,
    })

    // 9. Return success (masked email for display)
    return new Response(
      JSON.stringify({
        success: true,
        maskedEmail: maskEmail(eligible.email),
        studentName: eligible.name,
        expiryMinutes: program.otp_expiry_minutes,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-voucher-otp error:', err)
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan server. Coba beberapa saat lagi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
