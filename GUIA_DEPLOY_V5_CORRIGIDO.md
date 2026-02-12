# 🚀 Guia de Deploy - Sistema de Controlo de Vendas V5.0 (Corrigido)

Este guia explica como colocar a sua aplicação online de forma gratuita e segura.

## 📦 1. Preparação Local
Certifique-se de que tem o Node.js instalado. Na pasta do projeto, execute:
```bash
npm install
npm run build
```
Isto criará a pasta `dist/` com os ficheiros otimizados.

## 🌐 2. Publicação (Hosting)

### Opção A: Netlify (Recomendado para PWA)
1. Aceda a [app.netlify.com](https://app.netlify.com/).
2. Faça login (ou crie conta gratuita).
3. Vá a **Sites** > **Add new site** > **Deploy manually**.
4. Arraste a pasta `dist/` para a área indicada.
5. **Importante:** O Netlify fornece HTTPS automaticamente, o que é obrigatório para o PWA funcionar.

### Opção B: Vercel
1. Instale a CLI: `npm i -g vercel`.
2. Na raiz do projeto, digite `vercel`.
3. Siga as instruções no terminal.

## 📱 3. Checklist de Testes no Telemóvel
1. **Instalação:** Abra o URL no Chrome (Android) ou Safari (iOS) e use a opção "Adicionar ao Ecrã Principal".
2. **Offline:** Crie uma venda com o Wi-Fi desligado. O sistema deve guardar os dados no IndexedDB.
3. **Migração:** Se tiver dados antigos, o sistema irá detetar automaticamente e converter para o novo formato V5.
4. **Backup:** Teste a função de Exportar/Importar JSON para garantir a segurança dos seus dados.

---
**Versão:** 5.0.1 (Build Corrigida)
**Status:** Pronto para Produção
