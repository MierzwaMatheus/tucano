# 🐦 Tucano

<div align="center">
  <img src="https://i.postimg.cc/kMLz6myM/img0.png" alt="Capa Tucano" width="800"/>
  
  <p><em>Organize suas finanças e controle suas compras com clareza e leveza</em></p>
  
  [![Licença MIT](https://img.shields.io/badge/Licença-MIT-blue.svg)](LICENSE)
  [![React](https://img.shields.io/badge/React-18.x-61DAFB.svg?logo=react)](https://reactjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-9.x-FFCA28.svg?logo=firebase)](https://firebase.google.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-4.x-646CFF.svg?logo=vite)](https://vitejs.dev/)
</div>

---

## 🌟 Visão Geral

**Tucano** é uma aplicação mobile-first, moderna e acessível que integra:

- 🛒 Gestão de **listas de compras mensais**
- 💰 Planejamento de **receitas e despesas**
- 💳 Controle inteligente de **gastos no cartão de crédito**
- 📊 Visualização por dashboards e filtros

Você poderá controlar o que compra, como paga e para onde seu dinheiro está indo — de forma limpa, sem planilhas complexas.

---

## 📱 Demonstração

Acesse o projeto em produção:

🔗 https://tucano-financas.web.app/shopping

---

## ✨ Funcionalidades

- Autenticação com nome, email e senha com validações
- Registro de receitas e despesas com filtros inteligentes
- Suporte a transações com:
  - Parcelamento no crédito
  - Assinaturas mensais
  - Campo de recorrência
- Página dedicada ao **cartão de crédito**, com agrupamento automático por fatura
- Sistema de **listas de compras** por mês com orçamento
- Dashboards com gráficos, saldo, gastos por categoria e mais
- Modo escuro e claro com UI clean e responsiva

---

## 🧩 Estrutura de Páginas

| Página         | Descrição                                                                 |
|----------------|---------------------------------------------------------------------------|
| `/transactions` | Registro de transações financeiras (entrada/saída)                       |
| `/credit`       | Agrupamento de gastos no cartão de crédito, controle por fatura          |
| `/shopping`     | Listas de compras mensais, itens, filtros, controle de orçamento         |
| `/dashboard`    | Dashboards com análise de dados                                          |
| `/settings`     | Preferências de usuário, dias de fatura e categorias personalizadas      |

---

## 💳 Funcionalidade Especial: Página "Crédito"

- Todas as transações feitas com **cartão de crédito** são agrupadas em um único card chamado, por exemplo, **"Crédito C6"**
- A data da fatura é determinada com base nas configurações do usuário:
  - **Dia de fechamento da fatura**
  - **Dia de pagamento**
- Parcelas são geradas automaticamente conforme a quantidade e a regra de vencimento
- Esse card aparece no topo da página de transações enquanto **não estiver pago**
- Ao ser **marcado como pago**, todas as transações agrupadas são marcadas como quitadas
- Transações de crédito **individuais não são exibidas nas realizadas** após o pagamento
- O valor desse card **não é somado nas estatísticas** mensais da página

---

## ⚙️ Tecnologias Utilizadas

- **Framework:** [Next.js](https://nextjs.org/) (com SSR e SSG)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilo:** [Tailwind CSS](https://tailwindcss.com/)
- **Autenticação e deploy inicial:** Firebase
- **API (prevista):** GraphQL (Apollo Server)
- **Banco (previsto):** PostgreSQL (Railway)
- **Deploy:** Vercel

---

## 🛠️ Instalação Local

### Pré-requisitos

- Node.js 18+
- Conta no Firebase ou Vercel
- (Futuro: backend GraphQL + PostgreSQL)

### Passos

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/tucano.git
cd tucano

# Instale as dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite com suas configurações

# Inicie o servidor local
npm run dev
```

---

## 🧪 Roadmap

- [ ] Exportação de dados para PDF ou CSV
- [ ] Múltiplos cartões de crédito
- [ ] Integração com notificações push
- [ ] Dashboard com previsão de gastos futuros

---

## 🤝 Contribuindo

Contribuições são sempre bem-vindas!

```bash
# Fork do projeto
git checkout -b feature/NovaFuncionalidade

# Commit suas alterações
git commit -m "Nova funcionalidade"

# Push e abra um Pull Request
```

---

## 📜 Licença

Este projeto está licenciado sob a **Licença MIT**.

---

<div align="center">
  <p>Feito com 💛 por quem ama praticidade e controle financeiro</p>
  <p><a href="https://github.com/seu-usuario/tucano/issues">Reportar bug</a> • <a href="https://github.com/seu-usuario/tucano/issues">Sugerir melhoria</a></p>
  <a href="https://github.com/MierzwaMatheus">
    <img src="https://avatars.githubusercontent.com/u/48134874?v=4" alt="Matheus Mierzwa" width="150"/>
  </a>
</div>
```
