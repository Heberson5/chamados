 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
 
 export default function Reports() {
   const data = [
     { name: 'Hardware', value: 45 },
     { name: 'Software', value: 25 },
     { name: 'Rede', value: 20 },
     { name: 'Acesso', value: 10 },
   ];
 
   const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
 
   return (
     <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Relatórios Operacionais</h1>
         <p className="text-muted-foreground">Análise detalhada de atendimentos e desempenho.</p>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card>
           <CardHeader>
             <CardTitle>Chamados por Categoria</CardTitle>
           </CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data}
                   cx="50%"
                   cy="50%"
                   labelLine={false}
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   outerRadius={80}
                   fill="#8884d8"
                   dataKey="value"
                 >
                   {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle>Performance de Técnicos</CardTitle>
           </CardHeader>
           <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[
                 { name: 'João', resolvidos: 12 },
                 { name: 'Maria', resolvidos: 19 },
                 { name: 'Carlos', resolvidos: 15 },
                 { name: 'Ana', resolvidos: 22 },
               ]}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip />
                 <Bar dataKey="resolvidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }