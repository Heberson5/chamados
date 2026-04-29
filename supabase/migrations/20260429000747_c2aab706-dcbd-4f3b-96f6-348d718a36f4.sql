-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create help_menu_manuals table
CREATE TABLE IF NOT EXISTS public.help_menu_manuals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_menu_manuals ENABLE ROW LEVEL SECURITY;

-- Create policies (using DO block to avoid error if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view menu manuals') THEN
        CREATE POLICY "Everyone can view menu manuals" ON public.help_menu_manuals FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Master and Admin can manage menu manuals') THEN
        CREATE POLICY "Master and Admin can manage menu manuals" ON public.help_menu_manuals FOR ALL USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND (is_master = true OR regra = 'MASTER'::regra OR regra = 'ADMIN'::regra)
            )
        );
    END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_help_menu_manuals_updated_at ON public.help_menu_manuals;
CREATE TRIGGER update_help_menu_manuals_updated_at
BEFORE UPDATE ON public.help_menu_manuals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data if empty
INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'dashboard', 'Dashboard e Indicadores', '<div class="space-y-4"><p>O <strong>Dashboard</strong> é sua torre de controle. Aqui você visualiza o pulso da operação em tempo real.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4"><div class="p-3 border rounded-lg bg-card"><h4 class="font-bold text-primary mb-1">Indicadores Principais</h4><ul class="text-sm list-disc pl-4 space-y-1"><li><strong>Chamados Abertos:</strong> Total de solicitações aguardando ação.</li><li><strong>Em Atendimento:</strong> Trabalho sendo realizado no momento.</li><li><strong>SLA de Solução:</strong> Percentual de chamados resolvidos no prazo.</li></ul></div><div class="p-3 border rounded-lg bg-card"><h4 class="font-bold text-primary mb-1">Gráficos Analíticos</h4><ul class="text-sm list-disc pl-4 space-y-1"><li><strong>Volume por Categoria:</strong> Identifique as áreas com mais problemas.</li><li><strong>Desempenho Semanal:</strong> Acompanhe a tendência de aberturas vs encerramentos.</li></ul></div></div><p class="text-sm"><em>Dica:</em> Use o botão de exportar no topo do Dashboard para gerar um resumo executivo dos dados atuais.</p></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'dashboard');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'chamados', 'Gestão de Chamados (Tickets)', '<div class="space-y-4"><p>A central onde as solicitações são processadas. O sistema utiliza um fluxo de trabalho otimizado.</p><h4 class="font-bold mt-4">Fluxo de Trabalho (Kanban):</h4><ol class="list-decimal pl-5 space-y-2 text-sm"><li><strong>Novo:</strong> Chamado recém-aberto pelo usuário.</li><li><strong>Triagem:</strong> O administrador ou técnico assume o chamado ou o delega a outro responsável.</li><li><strong>Em Execução:</strong> O técnico trabalha na solução. Comentários podem ser trocados com o usuário.</li><li><strong>Pendente:</strong> Aguardando retorno do usuário ou de um fornecedor externo.</li><li><strong>Encerrado:</strong> Problema resolvido. O usuário recebe uma notificação para conferência.</li></ol><p class="bg-amber-50 dark:bg-amber-950/20 p-3 rounded border border-amber-200 dark:border-amber-800 text-xs"><strong>Importante:</strong> Sempre anexe evidências (fotos, prints de erro) para agilizar o diagnóstico técnico.</p></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'chamados');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'usuarios', 'Gerenciamento de Usuários', '<div class="space-y-4"><p>Controle quem acessa o sistema e qual o seu escopo de atuação.</p><ul class="list-disc pl-5 space-y-2 text-sm"><li><strong>Criação:</strong> Ao cadastrar, defina o e-mail (login) e o departamento.</li><li><strong>Associação de Perfil:</strong> Escolha entre Usuário, Técnico, Administrador ou Master.</li><li><strong>Redefinição de Senha:</strong> Administradores podem forçar a troca de senha de qualquer usuário por segurança.</li><li><strong>Inativação:</strong> Em vez de excluir, inative o usuário para preservar o histórico de chamados vinculados a ele.</li></ul></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'usuarios');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'permissoes', 'Níveis de Acesso (RBAC)', '<div class="space-y-4"><p>O sistema utiliza o modelo <em>Role-Based Access Control</em>, garantindo que cada usuário veja apenas o que é necessário para sua função.</p><div class="border rounded-lg overflow-hidden"><table class="w-full text-xs"><thead class="bg-muted"><tr><th class="p-2 text-left">Função</th><th class="p-2 text-left">Capacidades Principais</th></tr></thead><tbody class="divide-y"><tr><td class="p-2 font-bold">Master</td><td class="p-2">Acesso total, configurações de sistema, auditoria global.</td></tr><tr><td class="p-2 font-bold">Admin</td><td class="p-2">Gestão de usuários, departamentos e relatórios operacionais.</td></tr><tr><td class="p-2 font-bold">Técnico</td><td class="p-2">Visualização e resolução de chamados, acesso a relatórios técnicos.</td></tr><tr><td class="p-2 font-bold">Usuário</td><td class="p-2">Abertura de chamados e acompanhamento de seus próprios pedidos.</td></tr></tbody></table></div></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'permissoes');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'relatorios', 'Relatórios e BI', '<div class="space-y-4"><p>Extraia inteligência dos dados acumulados para melhorar a eficiência da equipe.</p><ul class="list-disc pl-5 space-y-2 text-sm"><li><strong>Desempenho por Técnico:</strong> Veja quem está resolvendo mais chamados e em menos tempo.</li><li><strong>Carga por Departamento:</strong> Identifique setores que demandam mais suporte.</li><li><strong>Tipologia de Erros:</strong> Analise as categorias de chamados mais frequentes para focar em treinamentos ou trocas de equipamentos.</li></ul><p class="text-xs italic">Formatos suportados: PDF (para visualização rápida) e Excel (para manipulação de dados em planilhas).</p></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'relatorios');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'departamentos', 'Estruturação de Departamentos', '<div class="space-y-4"><p>Configure a hierarquia da organização para direcionamento automático de chamados.</p><p class="text-sm">Cada departamento pode ter seu próprio fluxo e catálogo de serviços específicos. Ao cadastrar um departamento, você facilita a filtragem nos relatórios e a organização da fila de atendimento.</p></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'departamentos');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'configuracoes', 'Configurações Globais', '<div class="space-y-4"><p>Ajustes críticos que definem o comportamento e a aparência da plataforma.</p><div class="space-y-3"><div class="p-2 border-l-4 border-primary bg-muted/50"><h5 class="font-bold text-xs">Layout e Branding</h5><p class="text-[11px]">Personalize logos, cores e o nome da sua empresa no sistema.</p></div><div class="p-2 border-l-4 border-red-500 bg-muted/50"><h5 class="font-bold text-xs">Segurança</h5><p class="text-[11px]">Configure complexidade de senhas, expiração de sessão e bloqueio de tentativas de login.</p></div><div class="p-2 border-l-4 border-green-500 bg-muted/50"><h5 class="font-bold text-xs">Comunicação (SMTP)</h5><p class="text-[11px]">Configure as credenciais de e-mail para que o sistema envie notificações automáticas de chamados.</p></div></div></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'configuracoes');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'audit', 'Logs de Auditoria', '<div class="space-y-4"><p>Transparência total. Cada clique e alteração é registrado com data, hora, IP e usuário responsável.</p><p class="text-sm">Utilize a busca avançada para encontrar ações específicas, como exclusão de chamados ou alteração de permissões, garantindo a integridade dos dados.</p></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'audit');

INSERT INTO public.help_menu_manuals (menu_id, title, content) 
SELECT 'ajuda', 'Centro de Ajuda', '<div class="space-y-4"><p>Acesso rápido à documentação oficial do sistema. O conteúdo desta página é adaptado dinamicamente com base nas permissões concedidas ao seu perfil.</p></div>'
WHERE NOT EXISTS (SELECT 1 FROM public.help_menu_manuals WHERE menu_id = 'ajuda');
