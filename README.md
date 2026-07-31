<h1>Sistema de Biblioteca (API)</h1>


A API de Biblioteca é um sistema web desenvolvido para gerenciar livros, usuários e empréstimos de uma biblioteca. O projeto é composto por um Backend em Python, responsável pelas regras de negócio e persistência de dados, e um Frontend web, responsável pela interface gráfica para os usuários.


## **🎯 Objetivos**
- Gerenciar o acervo de livros da biblioteca.
- Controlar empréstimos e devoluções.
- Disponibilizar uma interface amigável para os usuários.
- Aplicar práticas modernas de DevOps durante todo o ciclo de desenvolvimento.

## **🛠 Tecnologias Utilizadas**

**Back-End**
- Python 3.12
- PostgreSQL

**Front-End**
- HTML
- CSS
- JavaScript



## **📂 Estrutura do Projeto**
```yaml
biblioteca-devops/
│
├── backend/
│   ├── app.py
│   ├── models/
│   ├── routes/
│   ├── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│
├── database/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md

```

## **✨ Funcionalidades**
**Livros**<br>

- Cadastrar livro
- Editar livro
- Excluir livro
- Pesquisar livros
- Visualizar catálogo<br>

**Usuários**<br>

- Cadastro de usuários
- Atualização de dados
- Consulta de usuários<br>

**Empréstimos**<br>
- Registrar empréstimo
- Registrar devolução
- Verificar disponibilidade
- Histórico de empréstimos
