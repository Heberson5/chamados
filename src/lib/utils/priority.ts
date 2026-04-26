 export const PRIORITY_LABELS: Record<string, string> = {
   P1: "Crítico",
   P2: "Alto",
   P3: "Médio",
   P4: "Baixo",
   P5: "Muito Baixo"
 };
 
 export const getPriorityLabel = (priority: string) => {
   return PRIORITY_LABELS[priority] || priority;
 };