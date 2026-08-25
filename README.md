# Use Case Manager (RedUCM)

## Introdução

O Use Case Manager (RedUCM) é uma aplicação web desenvolvida para centralizar e gerir os casos de uso e regras de deteção utilizados pela RedShift nos seus clientes. Este projeto visa solucionar a problemática da fragmentação de processos de gestão de segurança, proporcionando uma plataforma unificada para armazenamento, consulta e extração de informações relacionadas com a cibersegurança.

## Funcionalidades

- **Autenticação de Utilizadores:** Sistema de login para garantir que apenas utilizadores autorizados acedem à plataforma.
- **Gestão de Casos de Uso:** Armazenamento e organização dos diferentes casos de uso de acordo com várias taxonomias (MITRE ATT&CK, classificação interna do Centro Nacional de Cibersegurança, entre outros).
- **Regras de Deteção:** Associações de regras específicas a cada caso de uso, permitindo a sua extração e consulta.
- **Consulta e Pesquisa:** Interface intuitiva para a pesquisa e visualização de casos de uso e respetivas regras.
- **Exportação de Dados:** Funcionalidade para exportar informações em formatos utilizáveis para outras ferramentas e relatórios.

## Tecnologias Utilizadas

### Desenvolvimento de Software

- **Backend - Django:**
  - Framework Python especializada no desenvolvimento web utilizando o padrão MVT (Model-View-Template).
  - Utilizada para criar a API REST que comunica com o frontend.
  - Escolhida pela sua eficiência e pela necessidade de bibliotecas específicas em Python.

- **Frontend - Angular:**
  - Plataforma de desenvolvimento baseada em TypeScript, focada em Single-Page Applications (SPA).
  - Escolhida pela modularidade e capacidade de reutilização de código.

- **SGBD - Postgres:**
  - Sistema de gestão de base de dados open-source, reconhecido pela sua performance e escalabilidade.
  - Capacidade de armazenamento híbrido (relacional e não-relacional) através de entradas JSON.

## Como executar (Docker, recomendado)

Pré-requisitos: Docker e Docker Compose instalados.

```bash
cp .env.example .env      # valores por omissão já funcionam localmente
docker compose up --build
```

Isto arranca 3 containers:

- `postgres` — base de dados, vazia (só o schema, via migrations automáticas).
- `django` — API, em http://localhost:8000. Ao arrancar corre `migrate` e cria
  automaticamente **uma conta de demonstração** (definida em `.env`, por
  omissão `admin@example.com` / `ChangeMe123!`) e uma "Demo Company" fictícia,
  para haver algo para testar. Não há dados reais de clientes/utilizadores.
- `angular` — frontend, em http://localhost:8080.

### Primeiro login

O login usa TOTP (código de 6 dígitos tipo Google Authenticator) — não é
preciso configurar email/SMTP. No primeiro login com a conta de demonstração,
a app mostra um QR code: digitaliza com uma app de autenticação (Google
Authenticator, Authy, etc.) e usa o código gerado para entrar.

### Repor a base de dados

```bash
docker compose down -v   # apaga o volume da BD; próximo "up" recria tudo limpo
```

### Configuração

Todas as variáveis (secret key, credenciais da BD, conta de demo, SMTP
opcional) estão no `.env` — ver comentários em `.env.example`. Por omissão os
emails de OTP são apenas impressos na consola do container `django`
(`docker compose logs django`); para usar SMTP real, muda `EMAIL_BACKEND` e
preenche `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` no `.env`.

## Como executar (sem Docker)

```bash
# backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env   # ajusta POSTGRES_HOST=localhost se a BD não estiver em Docker
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver

# frontend (noutro terminal)
cd frontend
npm install
ng serve
```