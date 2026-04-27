 import { supabase } from "@/integrations/supabase/client";
 
 export interface EmailTemplate {
   id: string;
   name: string;
   subject: string;
   body: string;
   trigger?: string;
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
 
     let body = template.body;
     let subject = template.subject;
 
     Object.entries(variables).forEach(([key, value]) => {
       const regex = new RegExp(`{${key}}`, 'g');
       body = body.replace(regex, value || "");
       subject = subject.replace(regex, value || "");
     });
 
     // Convert newlines to <br> for HTML
     const htmlBody = body.replace(/\n/g, '<br>');
 
     let finalHtml = htmlBody;
     const layout = layoutData?.value as string;
 
     if (layout && layout.trim()) {
       // Replace standard tags in layout too
       finalHtml = layout;
       Object.entries(variables).forEach(([key, value]) => {
         const regex = new RegExp(`{${key}}`, 'g');
         finalHtml = finalHtml.replace(regex, value || "");
       });
       // Replace the body placeholder
       finalHtml = finalHtml.replace(/{corpo}|{{corpo}}|{body}|{{body}}/gi, htmlBody);
     }
 
     return await sendEmail(to, subject, finalHtml);
   } catch (error) {
     console.error("Error sending templated email:", error);
     return { success: false, error };
   }
 };