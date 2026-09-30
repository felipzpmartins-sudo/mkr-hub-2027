# Identidade central e evolução para SSO

## Contrato atual

- `User.id` é a identidade estável dentro do HUB. O e-mail pode mudar e não deve ser usado como identificador imutável.
- `User.hubRole` define administração do HUB.
- `UserSystemAccess` é único por `(userId, systemId)` e registra `enabled`, `role`, `externalUserId` e `externalUserEmail`.
- `role` é uma string específica da aplicação. O HUB não tenta converter os perfis externos para uma enumeração universal.
- As contas e históricos externos permanecem em suas bases originais.
- `launchSystem` é a fronteira atual: autenticar → consultar permissão → conferir disponibilidade/URL → registrar auditoria → redirecionar sem credenciais.

## Como integrar sem perder históricos

1. Escolher um provedor de identidade com suporte a OpenID Connect; integrar o HUB a esse provedor ou adotar uma solução consolidada de servidor de identidade. A configuração atual do Auth.js é de cliente de autenticação, não de provedor OIDC.
2. Vincular `User.id` ao par imutável `(issuer, subject)` do provedor em uma tabela de identidades. Planejar a migração das senhas existentes ou um fluxo de redefinição. Não presumir que hashes de senha possam ser transferidos entre provedores.
3. Auditar manualmente o vínculo de cada aplicação. Utilizar primeiro o ID externo estável, confirmando a conta com seu responsável; o e-mail externo ajuda na conferência, mas não deve vincular contas automaticamente só por coincidência de endereço.
4. Adaptar uma aplicação por vez para Authorization Code com PKCE, callbacks HTTPS previamente cadastrados, validação de `state`, `nonce`, assinatura, emissor e audiência.
5. No primeiro login federado, associar a identidade central à conta externa já existente, preservando a chave primária e os registros dessa conta. Não criar uma nova conta por padrão quando houver mapeamento legado.
6. Definir um contrato de autorização por aplicação: leitura de permissões pelo backend, claims de curta duração ou sincronização autenticada. Desativação e revogação precisam chegar à aplicação externa; o bloqueio no HUB, sozinho, não invalida uma sessão já aberta em outro sistema.
7. Implementar logout e revogação coordenados conforme o protocolo e o provedor escolhidos. Tratar replay, expiração, rotação de chaves e indisponibilidade do provedor.

## Fronteiras importantes

- Central de Compras e Central de Marketing precisam de adaptação compatível com a autenticação existente no Lovable Cloud. Isso depende dos projetos e dos recursos disponíveis nesse ambiente.
- Maker Car, Central de Vídeos e Maker Wallet precisarão validar a identidade e a autorização em seus próprios backends.
- Os atuais cookies do HUB não devem ser compartilhados com aplicações externas.
- Nunca transportar senha, JWT de sessão ou dados pessoais em query strings. Um fluxo OIDC formal utiliza seu código de autorização de uso único conforme o protocolo; não é o redirecionamento simples desta versão.
- Antes do SSO, remover uma permissão no HUB impede novos redirecionamentos pelo portal. O administrador ainda precisa gerenciar o acesso direto e as sessões no sistema externo.

Cada integração deve ser lançada com testes de vínculo de contas antigas, troca de e-mail, acesso revogado, conta desativada, sessões simultâneas e indisponibilidade. O HUB continuará responsável por sua própria base, sem migração dos bancos operacionais.
