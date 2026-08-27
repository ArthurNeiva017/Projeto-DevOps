# Guia de Contribuição

Obrigado por contribuir com o **Cyber Threat Hub**!

## Estratégia de Versionamento

Nós utilizamos **Trunk-Based Development**. Isso significa que:

1. A branch `main` é a nossa única branch longa e ela deve **sempre** estar pronta para ir para produção.
2. Todas as novas funcionalidades, correções e atualizações devem ser feitas em branches pequenas, de vida curta (short-lived branches).
3. O merge para a `main` deve ser feito exclusivamente através de **Pull Requests (PR)**.

## Regras de Proteção da Branch `main`

A branch `main` possui regras estritas configuradas no repositório:
- **Push direto é bloqueado**: Você não pode fazer `git push origin main`.
- **Pull Request obrigatório**: Toda alteração precisa ser revisada.
- **CI/CD aprovado**: O merge só é liberado se a pipeline de Integração Contínua (Testes, Lint e Build) passar com sucesso.

## Padrão de Commits (Conventional Commits)

Utilizamos o padrão [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) para manter o histórico claro e possibilitar a geração automática de changelogs.

**Exemplos:**
- `feat: adiciona autenticação JWT`
- `fix: corrige problema de concorrência no banco`
- `test: adiciona testes unitários para a api`
- `docs: atualiza documentação de uso`
- `refactor: extrai lógica de formatação`
- `ci: ajusta workflow de deploy`

### Passo a Passo para Contribuir

1. Atualize sua base local: `git checkout main && git pull`
2. Crie sua branch: `git checkout -b feat/nome-da-feature`
3. Faça suas alterações e rode os testes localmente.
4. Faça o commit padronizado: `git commit -m "feat: descrição clara"`
5. Envie para o repositório remoto: `git push origin feat/nome-da-feature`
6. Abra o **Pull Request** no GitHub apontando para a branch `main`.
