# Instruções do projeto

## Manter a tela de Permissões sincronizada

Sempre que uma alteração adicionar, remover ou restringir uma função/ação
(ex: um novo botão de ação num chamado, uma nova aba em Configurações),
atualize `src/pages/Permissions.tsx` (array `availableMenus`) para
refletir isso — incluir a ação nova ou remover a que deixou de existir.
Não é necessário que o usuário peça a cada vez; isso deve ser feito por
padrão, como parte da própria alteração.

**Importante — natureza dessa lista**: as ações dentro de cada item de
`availableMenus` (ex: "Excluir", "Encerrar", "Cancelar" dentro de
"Chamados") são hoje apenas **documentação/inventário visual** na tela de
Permissões — nenhuma delas é lida por `hasPermission()` em nenhum lugar do
app (confirmado por busca no código: nenhuma string `"chamados:..."` é
consultada fora do próprio `Permissions.tsx`). O controle de acesso real
das ações dentro de Chamados é feito por checagem direta de papel
(`isMaster`, `regra === 'ADMIN'`, `is_tecnico()`, etc.) espalhada nos
componentes e nas RLS/triggers do Postgres — não pelo array de permissões
granulares. Isso é assim porque várias dessas regras (exclusão em massa,
cadastro retroativo, cancelamento) foram pedidas explicitamente como
"somente Master" ou "somente Admin/Master", ou seja, regras fixas, não
configuráveis por perfil customizado.

Ao manter essa lista sincronizada, portanto: adicione/remova o *rótulo* da
ação para a lista continuar correta como inventário, mas não assuma que
ligar/desligar o toggle na tela de Permissões muda o comportamento real do
app — a menos que isso seja explicitamente pedido (nesse caso, é um
trabalho à parte: ligar `hasPermission()` de fato nos componentes/RLS).

## Padrão de branch/deploy deste repositório

Desenvolvimento nesta sessão acontece na branch
`claude/chamados-exclusao-retroativo-k6zedw` e depois é mesclado
(`--no-ff`) direto na `main`, pois é o que faz a alteração valer no app em
produção (não há pipeline de PR/review neste repositório). Validar sempre
com `npx tsc --noEmit -p tsconfig.app.json` e `npm run build` antes de dar
push na `main`.
