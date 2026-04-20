// supabase/functions/admin/index.ts
// Deno Edge Function - chạy với service_role, kiểm tra JWT admin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Xác thực user từ JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Kiểm tra admin (tùy chọn: check bảng admin_users)
    const { data: adminCheck } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden: not admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { action, payload } = await req.json()

    let result
    switch (action) {
      case 'list_orders':
        result = await supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false })
        break
      case 'delete_order':
        result = await supabaseAdmin.from('orders').delete().eq('id', payload.id)
        break
      case 'process_order':
        result = await supabaseAdmin.from('orders').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', payload.id)
        break
      case 'stats':
        const { data: orders } = await supabaseAdmin.from('orders').select('total,created_at')
        const totalOrders = orders?.length || 0
        const revenue = orders?.reduce((s, o) => s + Number(o.total || 0), 0) || 0
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        const todayOrders = orders?.filter(o => new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === today) || []
        result = { data: { totalOrders, revenue, todayOrders: todayOrders.length, todayRevenue: todayOrders.reduce((s, o) => s + Number(o.total || 0), 0) } }
        break
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (result.error) throw result.error

    return new Response(JSON.stringify(result.data || { success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
