import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Sends the welcome email once per account, only for accounts created in the last hour.
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.auth.getUser();
    const user = data.user;
    if (!user?.email) return { sent: false };
    const ageMs = Date.now() - new Date(user.created_at).getTime();
    if (ageMs > 60 * 60 * 1000) return { sent: false };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    try {
      const result = await sendTemplateEmail("welcome", user.email, {
        templateData: { name: (profile as { display_name?: string } | null)?.display_name ?? undefined },
        idempotencyKey: `welcome-${user.id}`,
      });
      return { sent: result.sent };
    } catch (error) {
      console.error("Welcome email failed", error);
      return { sent: false };
    }
  });
