# v5.0 - Pacote Completo (Offline-first)

## Como usar
1. Copie a pasta `src/` para dentro do seu projeto React+Vite+Tailwind (substituindo o App.jsx e db.js).
2. Rode `npm install idb lucide-react` (se ainda não tiver).
3. Rode `npm run dev`.

## O que foi adicionado
- KPIs por mês (Vendido, Comissão, Recebido, Pendências, Descontos)
- 3 abas: Vendas (finalizadas), Pendências (financeiras), Entregas (futuras/produção)
- Campos novos no cadastro: Valor de Tabela, Desconto aplicado, Pagamento detalhado, Motivo/Previsão da pendência, Motivo da entrega futura
- Migração automática (v5) ao abrir o app (normaliza dados antigos e cria campos faltantes)

## Observação
- O mês ativo é salvo em `localStorage` como `active_month`. Use as setas nos KPIs para navegar meses.
