# 🛡️ RedUCM (Redshift Use Case Manager)

![Django](https://img.shields.io/badge/Backend-Django-092E20?style=for-the-badge&logo=django)
![Angular](https://img.shields.io/badge/Frontend-Angular-DD0031?style=for-the-badge&logo=angular)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?style=for-the-badge&logo=docker)

## 📖 Contexto do Projeto

O **Use Case Manager (RedUCM)** é uma aplicação web desenvolvida durante um estágio curricular de 3 meses em Cibersegurança na **Redshift Consulting**. 

O projeto nasceu para solucionar a problemática da fragmentação de processos na gestão de segurança. A plataforma atua como um repositório centralizado e unificado, permitindo gerir, armazenar, consultar e extrair casos de uso e regras de deteção aplicadas aos clientes da Redshift, otimizando o fluxo de trabalho das equipas de segurança e operações (SOC).

## ✨ Funcionalidades Principais

- 🔐 **Autenticação Segura:** Sistema de login com suporte nativo a MFA/TOTP (Time-Based One-Time Password) para garantir o acesso exclusivo a utilizadores autorizados.
- 📂 **Gestão de Casos de Uso:** Organização estruturada de casos de uso com mapeamento para taxonomias de referência do setor (ex: matriz **MITRE ATT&CK**, classificação interna do CNCS).
- 🎯 **Regras de Deteção e Correlação:** Associação direta de regras específicas a cada caso de uso, facilitando fluxos de deteção SIEM e extração de dados.
- 🔍 **Consulta Inteligente:** Interface intuitiva (SPA) desenhada para pesquisa rápida, filtragem e visualização de casos de uso.
- 📊 **Exportação de Dados:** Geração de relatórios e exportação de informações em formatos compatíveis com outras ferramentas do ecossistema de cibersegurança.

## 🛠️ Tecnologias Utilizadas

A arquitetura do projeto foi desenhada para garantir modularidade e escalabilidade:

* **Backend (Django / Python):** Responsável pela API REST. Escolhido pela sua robustez, eficiência do padrão MVT e facilidade de integração com bibliotecas de automação e segurança em Python.
* **Frontend (Angular / TypeScript):** Construção de uma *Single-Page Application* (SPA) modular, garantindo uma navegação fluida e reutilização de componentes na interface.
* **Base de Dados (PostgreSQL):** Armazenamento híbrido, suportando tanto o modelo relacional tradicional como entradas JSON dinâmicas necessárias para configurações de segurança.
