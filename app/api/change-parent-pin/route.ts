import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { currentPin, newPin } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check session
  const { data: session } = await supabase
    .from("parent_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (!session) {
    return NextResponse.json({ error: "Not in parent mode" }, { status: 403 });
  }

  // Check pin
  const { data: family } = await supabase
    .from("families")
    .select("parent_pin")
    .eq("parent_id", user.id)
    .single();
  if (!family || family.parent_pin !== currentPin) {
    return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 400 });
  }

  // Update pin
  const { error } = await supabase
    .from("families")
    .update({ parent_pin: newPin })
    .eq("parent_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Failed to update PIN" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
