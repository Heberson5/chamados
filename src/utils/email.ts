 import { supabase } from "@/integrations/supabase/client";
 
 export interface EmailTemplate {
   id: string;
   name: string;
   subject: string;
   body: string;
   trigger?: string;
 }
 
 /** Tags que os modelos podem usar e um exemplo de valor para a pré-visualização. */
 export const EMAIL_TEMPLATE_TAGS: Record<string, string> = {
   os: "1042",
   user: "Ana Souza",
   titulo: "Impressora do financeiro não imprime",
   status: "Em Atendimento",
   descricao: "A impressora mostra erro de papel atolado desde hoje cedo.",
   comentario: "Já troquei o toner, pode testar novamente?",
   motivo: "Transferido para a equipe de infraestrutura.",
 };

 const escapeHtml = (v: string) =>
   v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

 /**
  * Monta assunto e HTML finais de um modelo (o mesmo código serve o envio
  * real e a pré-visualização em Configurações). Os valores das tags vêm de
  * dados digitados por usuários, então são escapados no HTML.
  */
 export function renderEmailTemplate(
   template: Pick<EmailTemplate, "subject" | "body">,
   layout: string | null | undefined,
   variables: Record<string, string>
 ): { subject: string; html: string } {
   let body = template.body || "";
   let subject = template.subject || "";
   Object.entries(variables).forEach(([key, value]) => {
     const regex = new RegExp(`{${key}}`, "g");
     body = body.replace(regex, escapeHtml(value || ""));
     subject = subject.replace(regex, value || "");
   });
   const htmlBody = body.replace(/\n/g, "<br>");
   if (!layout || !layout.trim()) return { subject, html: htmlBody };
   let html = layout;
   Object.entries(variables).forEach(([key, value]) => {
     html = html.replace(new RegExp(`{${key}}`, "g"), escapeHtml(value || ""));
   });
   html = html.replace(/{corpo}|{{corpo}}|{body}|{{body}}/gi, htmlBody);
   return { subject, html };
 }

 export const sendEmail = async (to: string, subject: string, html: string) => {
   try {
     const { data, error } = await supabase.functions.invoke("send-email", {
       body: { to, subject, html }
     });
 
     if (error) throw error;
     if (data?.error) throw new Error(data.error);
     return { success: true };
   } catch (error) {
     console.error("Error sending email:", error);
     return { success: false, error };
   }
 };
 
 export const sendTemplatedEmail = async (to: string, templateIdOrTrigger: string, variables: Record<string, string>) => {
   try {
     const { data: settingsData } = await supabase
       .from("system_settings")
       .select("key, value");
 
     if (!settingsData) return { success: false, error: "Settings not found" };
 
     const templatesData = settingsData.find(s => s.key === "email_templates");
     const layoutData = settingsData.find(s => s.key === "email_layout");
 
     if (!templatesData || !templatesData.value) return { success: false, error: "Templates not found" };
 
     const templates = templatesData.value as unknown as EmailTemplate[];
     
     // Try to find by ID first, then by trigger
     let template = templates.find(t => t.id === templateIdOrTrigger);
     if (!template) {
       template = templates.find(t => t.trigger === templateIdOrTrigger);
     }
 
     if (!template) return { success: false, error: "Template not found" };
 
     const { subject, html: finalHtml } = renderEmailTemplate(template, layoutData?.value as string, variables);
     return await sendEmail(to, subject, finalHtml);
   } catch (error) {
     console.error("Error sending templated email:", error);
     return { success: false, error };
   }
 };