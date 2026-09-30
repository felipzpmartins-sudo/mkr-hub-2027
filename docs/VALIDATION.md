# Validação da primeira entrega

Verificação executada em 29/09/2026 no Windows, com Node.js 26.5, Chrome e PostgreSQL 18.4 isolado para testes.

| Verificação                       | Resultado                            |
| --------------------------------- | ------------------------------------ |
| Prisma schema                     | Válido                               |
| Migration inicial                 | Aplicada em PostgreSQL vazio         |
| Seed dos cinco sistemas           | Executado duas vezes, sem duplicação |
| Criação do primeiro administrador | Confirmada                           |
| ESLint                            | Sem erros ou avisos                  |
| TypeScript                        | Sem erros                            |
| Build de produção Next.js         | Concluído                            |
| Testes unitários                  | 20 aprovados                         |
| Cenários integrados em navegador  | 5 aprovados                          |
| Formatação Prettier               | Conforme                             |
| Auditoria npm de produção         | Nenhuma vulnerabilidade reportada    |

Os cenários integrados verificaram: login e layout responsivo; bloqueio de navegação administrativa anônima; criação de usuários; URLs e status de sistemas; vínculos com contas antigas; permissões específicas por aplicação; proibição de acesso administrativo para colaboradores; auditoria antes do redirecionamento; revogação de acesso; bloqueio de conta inativa com sessão anterior; proteção da própria conta administrativa; alteração de senha e revogação das sessões; logout; limitação de tentativas de login persistida no PostgreSQL.

Uma execução adicional do cenário administrativo gerou capturas de desktop e mobile após o término do carregamento. O conteúdo foi revisado visualmente. As aplicações externas foram simuladas por interceptação de navegação; nenhum login externo ou banco real foi acessado.

O deploy no Railway e o build da imagem Docker não foram executados nesta máquina. A configuração está entregue no projeto. A conexão de produção, o domínio público e as URLs reais dos sistemas ainda precisam ser fornecidos na instalação.
