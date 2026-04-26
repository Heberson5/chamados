  import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
 import { toast } from "sonner";
 import { ImagePlus, X, Loader2 } from "lucide-react";

const schema = z.object({
  subject: z.string().trim().min(3, "Assunto muito curto").max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
   category: z.string().trim().min(1, "Selecione uma categoria"),
});

 const CATEGORIES = [
   "Suporte Técnico",
   "Financeiro / Faturamento",
   "Dúvidas Gerais",
   "Sugestões / Feedback",
   "Comercial",
 ];
 
 const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
 const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
 
export const NewTicketDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}) => {
   const { user, org, profile } = useAuth();
   const [selectedOrgId, setSelectedOrgId] = useState("");
   const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
   const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
   const [category, setCategory] = useState("");
   const [files, setFiles] = useState<File[]>([]);
   const [previews, setPreviews] = useState<string[]>([]);
   const [busy, setBusy] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const selectedFiles = Array.from(e.target.files || []);
     
     for (const file of selectedFiles) {
       if (file.size > MAX_FILE_SIZE) {
         toast.error(`Arquivo ${file.name} muito grande. Máximo 2MB.`);
         continue;
       }
       if (!ALLOWED_TYPES.includes(file.type)) {
         toast.error(`Arquivo ${file.name} não permitido. Apenas imagens.`);
         continue;
       }
       setFiles(prev => [...prev, file]);
       setPreviews(prev => [...prev, URL.createObjectURL(file)]);
     }
     if (fileInputRef.current) fileInputRef.current.value = "";
   };
 
   const removeFile = (index: number) => {
     setFiles(prev => prev.filter((_, i) => i !== index));
     setPreviews(prev => {
       URL.revokeObjectURL(prev[index]);
       return prev.filter((_, i) => i !== index);
     });
   };

  const submit = async () => {
     const parsed = schema.safeParse({ subject, description, priority, category });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
     const targetOrgId = org?.id || selectedOrgId;
     if (!user || !targetOrgId) return;
    setBusy(true);
 
     const uploadedUrls: string[] = [];
     for (const file of files) {
       const ext = file.name.split(".").pop();
       const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
       const { data, error: uploadError } = await supabase.storage
         .from("ticket-attachments")
         .upload(path, file);
       
       if (uploadError) {
         setBusy(false);
         return toast.error("Erro ao enviar imagem: " + uploadError.message);
       }
       const { data: { publicUrl } } = supabase.storage.from("ticket-attachments").getPublicUrl(data.path);
       uploadedUrls.push(publicUrl);
     }
 
    const { error } = await supabase.from("tickets").insert({
      subject: parsed.data.subject,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      category: parsed.data.category,
      attachment_urls: uploadedUrls,
      organization_id: targetOrgId,
      requester_id: user.id,
    });

    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Chamado criado");
    setSubject("");
    setDescription("");
    setPriority("medium");
    setCategory("");
    setFiles([]);
    setPreviews([]);
    onOpenChange(false);
    onCreated?.();
  };

  useEffect(() => {
    if (profile?.is_master) {
      supabase
        .from("organizations")
        .select("id, name")
        .order("name")
        .then(({ data }) => {
          setAllOrgs(data || []);
        });
    }
  }, [profile?.is_master]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo chamado</DialogTitle>
          <DialogDescription>Descreva o problema ou solicitação.</DialogDescription>
        </DialogHeader>
         <div className="space-y-4">
           {profile?.is_master && !org && (
             <div className="space-y-1.5">
               <Label>Empresa</Label>
               <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione a empresa..." />
                 </SelectTrigger>
                 <SelectContent>
                   {allOrgs.map((o) => (
                     <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           )}
          <div className="space-y-1.5">
            <Label htmlFor="subject">Assunto</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Erro ao acessar relatório" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhe o que está acontecendo..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-1.5">
               <Label>Categoria</Label>
               <Select value={category} onValueChange={setCategory}>
                 <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                 <SelectContent>
                   {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
          </div>
           
           <div className="space-y-1.5">
             <Label>Anexos (Imagens, max 2MB)</Label>
             <div className="flex flex-wrap gap-2">
               {previews.map((src, i) => (
                 <div key={src} className="relative size-16 rounded-md border overflow-hidden bg-muted">
                   <img src={src} className="size-full object-cover" alt="Preview" />
                   <button 
                     onClick={() => removeFile(i)}
                     className="absolute top-0 right-0 p-0.5 bg-background/80 hover:bg-background text-destructive rounded-bl-md"
                   >
                     <X className="size-3" />
                   </button>
                 </div>
               ))}
               <button
                 onClick={() => fileInputRef.current?.click()}
                 className="size-16 rounded-md border border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors"
               >
                 <ImagePlus className="size-5 text-muted-foreground" />
                 <span className="text-[10px] text-muted-foreground">Adicionar</span>
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*" 
                 multiple 
                 onChange={handleFileChange} 
               />
             </div>
           </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
           <Button onClick={submit} disabled={busy}>
             {busy ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 Criando...
               </>
             ) : (
               "Criar chamado"
             )}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};