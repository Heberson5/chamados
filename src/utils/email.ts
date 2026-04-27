 import { supabase } from "@/integrations/supabase/client";
 
 export interface EmailTemplate {
   id: string;
   name: string;
   subject: string;
   body: string;
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
 
 export const sendTemplatedEmail = async (to: string, templateId: string, variables: Record<string, string>) => {
   try {
     const { data: settingsData } = await supabase
       .from("system_settings")
       .select("value")
       .eq("key", "email_templates")
       .single();
 
     if (!settingsData || !settingsData.value) return { success: false, error: "Templates not found" };
 
     const templates = settingsData.value as unknown as EmailTemplate[];
     const template = templates.find(t => t.id === templateId);
 
     if (!template) return { success: false, error: "Template not found" };
 
     let body = template.body;
     let subject = template.subject;
 
     Object.entries(variables).forEach(([key, value]) => {
       const regex = new RegExp(`{${key}}`, 'g');
       body = body.replace(regex, value || "");
       subject = subject.replace(regex, value || "");
     });
 
     // Convert newlines to <br> for HTML
     const html = body.replace(/\n/g, '<br>');
 
     return await sendEmail(to, subject, html);
   } catch (error) {
     console.error("Error sending templated email:", error);
     return { success: false, error };
   }
 };