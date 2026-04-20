import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) throw new Error("Missing auth");
    
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader);
    if (userErr || !user) throw new Error("Invalid token");

    // Check admin
    const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).single();
    if (!admin) return new Response(JSON.stringify({ error: "Forbidden: not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = new URL(req.url);
    const actionParam = url.searchParams.get("action");

    // Handle file upload
    if (actionParam === "upload" && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file") as File;
      if (!file) throw new Error("No file");
      const ext = file.name.split(".").pop();
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return new Response(JSON.stringify({ url: data.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || actionParam;

    // PRODUCTS
    if (action === "list_products") {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }
    if (action === "create_product") {
      const { data, error } = await supabase.from("products").insert(body).select().single();
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }
    if (action === "update_product") {
      const { id, ...updates } = body;
      const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }
    if (action === "delete_product") {
      const { error } = await supabase.from("products").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // ORDERS
    if (action === "list_orders") {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }
    if (action === "update_order") {
      const { id, status } = body;
      const { data, error } = await supabase.from("orders").update({ status, processed_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }
    if (action === "delete_order") {
      const { error } = await supabase.from("orders").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // STATS
    if (action === "stats") {
      const { data: orders } = await supabase.from("orders").select("total, created_at");
      const total_orders = orders?.length || 0;
      const revenue = orders?.reduce((s, o) => s + Number(o.total || 0), 0) || 0;
      const today = new Date().toISOString().slice(0, 10);
      const todayOrders = orders?.filter(o => o.created_at?.startsWith(today)) || [];
      const today_revenue = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      return Response.json({ total_orders, revenue, today_orders: todayOrders.length, today_revenue }, { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
