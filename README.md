# Dash - Personal Finance Dashboard 📊

O **Dash** é uma aplicação Full Stack de gestão financeira pessoal, projetada para oferecer uma experiência intuitiva, rápida e segura no controle de receitas e despesas.  

O objetivo principal do projeto é combinar uma interface moderna e responsiva com uma infraestrutura de backend robusta e confiável.

---

## 🚀 Tecnologias

A aplicação utiliza uma stack enxuta, focada em performance e agilidade de deploy:

- **Front-end:** HTML5, CSS3 e JavaScript (Vanilla ES6+)  
- **Backend-as-a-Service (BaaS):** Supabase (PostgreSQL + Auth)  
- **Deploy & Hosting:** Netlify  
- **CI/CD:** Integração contínua automatizada via GitHub + Netlify  

---

## ✨ Funcionalidades

- 🔐 **Autenticação Segura**  
  Sistema de login e gerenciamento de sessões utilizando Supabase Auth.

- 💰 **Gestão de Transações**  
  Operações completas de CRUD para entradas e saídas financeiras.

- 📈 **Dashboard em Tempo Real**  
  Visualização dinâmica de saldo total, receitas e despesas.

- 🛡️ **Segurança de Dados (RLS)**  
  Implementação de *Row Level Security* garantindo isolamento total dos dados por usuário.

- 📱 **Interface Responsiva**  
  Design adaptável para diferentes dispositivos e tamanhos de tela.

---

## 🛠️ Engenharia e Arquitetura

O **Dash** adota uma abordagem moderna, priorizando segurança e simplicidade:

### 1. Segurança no Banco de Dados (RLS)
Toda a lógica de segurança é aplicada diretamente no banco de dados via *Row Level Security*.  
Isso impede acessos indevidos mesmo em chamadas diretas à API.

### 2. Front-end Leve e Eficiente
Uso de JavaScript puro para manipulação do DOM e gerenciamento de estado, evitando dependências desnecessárias e garantindo alta performance.

### 3. Pipeline de Deploy Contínuo
Cada alteração no repositório é automaticamente testada e publicada via Netlify, garantindo entregas rápidas e confiáveis.



