 import { ShieldAlert } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useNavigate } from "react-router-dom";
 
 export default function NotAuthorized() {
   const navigate = useNavigate();
   
   return (
     <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center space-y-6">
       <div className="bg-destructive/10 p-6 rounded-full">
         <ShieldAlert size={64} className="text-destructive" />
       </div>
       <div className="space-y-2">
         <h1 className="text-3xl font-bold tracking-tight">Acesso Restrito</h1>
         <p className="text-muted-foreground max-w-md mx-auto">
           Você não possui as permissões necessárias para acessar esta página. 
           Entre em contato com o administrador do sistema se acreditar que isso é um erro.
         </p>
       </div>
       <div className="flex gap-4">
         <Button onClick={() => navigate("/dashboard")}>Ir para o Início</Button>
         <Button variant="outline" onClick={() => window.history.back()}>Voltar</Button>
       </div>
     </div>
   );
 }