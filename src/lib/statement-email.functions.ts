import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  path: z.string().min(1).max(300),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(1).max(100000),
});

// Emails the signed-in user a 7-day download link to a statement PDF they uploaded.
export const emailStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes("..")) {
      throw new Error("Statement not found");
    }
    const { data: userData } = await context.supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) throw new Error("Your account has no email address.");

    const { data: signed, error } = await context.supabase.storage
      .from("statements")
      .createSignedUrl(data.path, 60 * 60 * 24 * 7);
    if (error || !signed) throw new Error("Could not prepare the download link.");

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { EmailAPIError } = await import("@lovable.dev/email-js");
    try {
      const result = await sendTemplateEmail("statement-ready", email, {
        templateData: { start: data.start, end: data.end, count: data.count, url: signed.signedUrl },
        idempotencyKey: `statement-ready-${data.path}`,
      });
      if (!result.sent) return { status: "suppressed" as const, email };
      return { status: "sent" as const, email };
    } catch (e) {
      if (e instanceof EmailAPIError && e.code === "domain_not_verified") return { status: "pending_domain" as const, email };
      console.error("Statement email failed", e);
      throw new Error("Could not send the email. Please try again later.");
    }
  });
