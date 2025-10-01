import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const brevoKey = Deno.env.get("BREVO_API_KEY") ?? "";

if (!supabaseUrl || !anonKey || !brevoKey) {
  console.error("Missing environment variables for send-test-email.");
}

async function getAuthenticatedUser(request: Request) {
  const token = request.headers.get("Authorization");
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: token } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non authentifié" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Corps de requête invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { to, subject, text } = payload;
  if (!to || !subject || !text) {
    return new Response(JSON.stringify({ success: false, error: "Champs requis : to, subject, text" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoKey,
      },
      body: JSON.stringify({
        sender: { name: "Misan", email: "contact-misan@parene.org" },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      return new Response(JSON.stringify({ success: false, error: errorText }), {
        status: brevoResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brevo API error:", error);
    return new Response(JSON.stringify({ success: false, error: "Erreur d'envoi Brevo" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
