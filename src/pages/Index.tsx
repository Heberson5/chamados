import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Index() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Help-Me System</CardTitle>
          <CardDescription>
            Iniciando a migração para o sistema Help-Me baseado no repositório diego64/help-me.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Este projeto está sendo resetado para utilizar a estrutura de chamados, técnicos e SLA do novo repositório.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}