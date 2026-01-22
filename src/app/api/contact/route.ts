import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/contact" });

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  acceptPrivacy: boolean;
}

/**
 * POST /api/contact
 *
 * Contact form submission - sends email to admin
 *
 * Body:
 * - name: string (required)
 * - email: string (required)
 * - subject: string (required)
 * - message: string (required)
 * - acceptPrivacy: boolean (required, must be true)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "Tutti i campi sono obbligatori" },
        { status: 400 },
      );
    }

    // Validate privacy acceptance
    if (!body.acceptPrivacy) {
      return NextResponse.json(
        { error: "Devi accettare la Privacy Policy per continuare" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 },
      );
    }

    // Get admin email from environment (fallback to default)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@mirrorbuddy.org";

    // Prepare email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Nuovo messaggio da MirrorBuddy</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Nome</div>
                <div class="value">${body.name}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value">${body.email}</div>
              </div>
              <div class="field">
                <div class="label">Oggetto</div>
                <div class="value">${body.subject}</div>
              </div>
              <div class="field">
                <div class="label">Messaggio</div>
                <div class="value" style="white-space: pre-wrap;">${body.message}</div>
              </div>
              <div class="footer">
                <p>
                  Inviato dal form di contatto MirrorBuddy<br>
                  Data: ${new Date().toLocaleString("it-IT")}<br>
                  Privacy Policy accettata: Sì
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Nuovo messaggio da MirrorBuddy

Da: ${body.name} <${body.email}>
Oggetto: ${body.subject}

Messaggio:
${body.message}

---
Inviato dal form di contatto
Data: ${new Date().toLocaleString("it-IT")}
Privacy Policy accettata: Sì
    `;

    // Send email
    const result = await sendEmail({
      to: adminEmail,
      subject: `[MirrorBuddy Contatti] ${body.subject}`,
      html: htmlContent,
      text: textContent,
      replyTo: body.email, // Allow admin to reply directly
    });

    if (!result.success) {
      log.error("[Contact] Failed to send email", {
        error: result.error,
        from: body.email,
      });
      return NextResponse.json(
        { error: "Errore durante l'invio del messaggio. Riprova più tardi." },
        { status: 500 },
      );
    }

    log.info("[Contact] Message sent successfully", {
      messageId: result.messageId,
      from: body.email,
      subject: body.subject,
    });

    return NextResponse.json({
      success: true,
      message: "Messaggio inviato con successo",
    });
  } catch (error) {
    log.error("[Contact] Unexpected error", { error: String(error) });
    return NextResponse.json(
      { error: "Errore del server. Riprova più tardi." },
      { status: 500 },
    );
  }
}
