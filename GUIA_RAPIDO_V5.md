# 🚀 GUIA RÁPIDO DE IMPLEMENTAÇÃO v5.0

## 📦 ARQUIVOS ENTREGUES

```
/
├── PLANO_EVOLUCAO_V5.0.md          # Plano técnico completo
├── migration-v5.js                  # Sistema de migração automática
├── useSalesMetricsV5.js             # Hook de métricas expandido
├── KPICardsV5.jsx                   # Componente de KPIs (dashboard)
├── TabNavigatorV5.jsx               # Sistema de abas
├── PendenciasTabV5.jsx              # Aba de pendências financeiras
├── EntregasTabV5.jsx                # Aba de entregas futuras
└── GUIA_RAPIDO_V5.md               # Este arquivo
```

---

## ⚡ IMPLEMENTAÇÃO EM 3 PASSOS

### PASSO 1: PREPARAR ESTRUTURA (5 min)

```bash
# 1. Criar pastas (se não existirem)
cd src
mkdir -p hooks components utils

# 2. Copiar arquivos para as pastas corretas
cp migration-v5.js src/utils/
cp useSalesMetricsV5.js src/hooks/
cp KPICardsV5.jsx src/components/
cp TabNavigatorV5.jsx src/components/
cp PendenciasTabV5.jsx src/components/
cp EntregasTabV5.jsx src/components/
```

---

### PASSO 2: ATUALIZAR App.jsx (20 min)

Adicionar no início do arquivo:

```javascript
// Imports adicionais
import { verificarMigracao } from './utils/migration-v5';
import { useSalesMetricsV5 } from './hooks/useSalesMetricsV5';
import { KPICardsV5 } from './components/KPICardsV5';
import { TabNavigatorV5 } from './components/TabNavigatorV5';
import { PendenciasTabV5 } from './components/PendenciasTabV5';
import { EntregasTabV5 } from './components/EntregasTabV5';
```

Adicionar states no componente App:

```javascript
const [activeTab, setActiveTab] = useState('vendas'); // Para o sistema de abas
```

Adicionar migração no useEffect existente:

```javascript
useEffect(() => { 
  let isMounted = true;
  
  const inicializar = async () => {
    // 1. Verificar e executar migração
    await verificarMigracao();
    
    // 2. Carregar vendas
    const dados = await getVendas();
    if (isMounted) {
      dados.sort((a, b) => {
        const dateA = new Date(a.data);
        const dateB = new Date(b.data);
        return dateB - dateA || b.id - a.id;
      });
      setVendas(dados);
    }
  };
  
  inicializar();
  
  return () => { isMounted = false; };
}, []);
```

Substituir o hook de métricas:

```javascript
// ANTES:
// const metricas = useSalesMetrics(vendas);

// DEPOIS:
const metricas = useSalesMetricsV5(vendas);
```

Criar função de separação de vendas:

```javascript
const separarVendas = () => {
  const hoje = new Date().toISOString().split('T')[0];
  const vendasAtivas = vendas.filter(v => v.status === 'Ativa');
  
  return {
    vendas: vendasAtivas.filter(v => 
      v.restante === 0 && 
      (v.tipoEntrega === 'Imediata' || 
       (v.tipoEntrega === 'Agendada' && v.dataEntrega <= hoje))
    ),
    
    pendencias: vendasAtivas.filter(v => v.restante > 0),
    
    entregas: vendasAtivas.filter(v => 
      v.tipoEntrega === 'Futura' || 
      (v.tipoEntrega === 'Agendada' && v.dataEntrega > hoje)
    )
  };
};

const { vendas: vendasPagas, pendencias, entregas } = separarVendas();
```

Atualizar DashboardView:

```javascript
const DashboardView = () => (
  <div className="pb-24">
    {/* KPIs no topo */}
    <KPICardsV5 metricas={metricas} />
    
    {/* Sistema de abas */}
    <TabNavigatorV5 
      activeTab={activeTab}
      onChange={setActiveTab}
      counts={{
        vendas: vendasPagas.length,
        pendencias: pendencias.length,
        entregas: entregas.length
      }}
    />
    
    {/* Conteúdo da aba ativa */}
    {activeTab === 'vendas' && (
      <ListView vendas={vendasPagas} />
    )}
    
    {activeTab === 'pendencias' && (
      <PendenciasTabV5 
        vendas={pendencias}
        onReceberRestante={handleReceberRestante}
        onEdit={handleEdit}
        onCancel={handleCancelarVenda}
        onDelete={handleDelete}
      />
    )}
    
    {activeTab === 'entregas' && (
      <EntregasTabV5 
        vendas={entregas}
        onMarcarEntregue={handleMarcarEntregue}
        onEdit={handleEdit}
        onCancel={handleCancelarVenda}
        onDelete={handleDelete}
      />
    )}
  </div>
);
```

Adicionar funções de ação:

```javascript
// Receber restante de pendência
const handleReceberRestante = async (venda) => {
  const confirmacao = confirm(
    `Receber restante de ${venda.cliente}?\n\n` +
    `Valor restante: ${formatBRL(venda.restante)}`
  );
  
  if (!confirmacao) return;
  
  const vendaAtualizada = {
    ...venda,
    valorEntrada: venda.valor,
    restante: 0,
    statusPagamento: 'Pago',
    pagoEm: Date.now(),
    atualizadoEm: Date.now()
  };
  
  await updateVenda(venda.id, vendaAtualizada);
  await carregarVendas();
  
  alert('✓ Pagamento recebido com sucesso!');
};

// Marcar entrega como concluída
const handleMarcarEntregue = async (venda) => {
  const confirmacao = confirm(
    `Marcar entrega como concluída para ${venda.cliente}?`
  );
  
  if (!confirmacao) return;
  
  const vendaAtualizada = {
    ...venda,
    tipoEntrega: 'Imediata',
    dataEntrega: new Date().toISOString().split('T')[0],
    atualizadoEm: Date.now()
  };
  
  await updateVenda(venda.id, vendaAtualizada);
  await carregarVendas();
  
  alert('✓ Entrega marcada como concluída!');
};

// Cancelar venda (mantém histórico)
const handleCancelarVenda = async (venda) => {
  const motivo = prompt('Motivo do cancelamento:');
  if (!motivo) return;
  
  const confirmacao = confirm(
    `Confirma cancelamento?\n\n` +
    `Cliente: ${venda.cliente}\n` +
    `Valor: ${formatBRL(venda.valor)}\n` +
    `Motivo: ${motivo}\n\n` +
    `A venda será mantida no histórico.`
  );
  
  if (!confirmacao) return;
  
  const vendaCancelada = {
    ...venda,
    status: 'Cancelada',
    motivoCancelamento: motivo,
    dataCancelamento: new Date().toISOString().split('T')[0],
    atualizadoEm: Date.now()
  };
  
  await updateVenda(venda.id, vendaCancelada);
  await carregarVendas();
  
  alert('✓ Venda cancelada');
};
```

---

### PASSO 3: ATUALIZAR FORMULÁRIO (15 min)

Adicionar novos campos ao estado formData:

```javascript
const [formData, setFormData] = useState({
  // ... campos existentes ...
  
  // NOVOS CAMPOS v5.0
  valorTabela: '',
  descontoAplicado: 'Sem desconto',
  parcelas: 1,
  motivoPendencia: 'aguardando_cartao',
  textoMotivo: '',
  previsaoPagamento: '',
  status: 'Ativa',
  motivoCancelamento: '',
  dataCancelamento: null
});
```

Adicionar campos no FormView (após o campo "valor"):

```javascript
{/* VALOR DE TABELA */}
<div>
  <label className="block text-sm font-bold text-gray-700 mb-2">
    Valor de Tabela (Referência)
  </label>
  <input 
    type="text"
    inputMode="decimal"
    className="w-full p-3 border rounded-lg"
    value={formData.valorTabela}
    onChange={e => setFormData({...formData, valorTabela: e.target.value})}
    placeholder="R$ 3.700,00"
  />
</div>

{/* DESCONTO APLICADO */}
<div>
  <label className="block text-sm font-bold text-gray-700 mb-2">
    Desconto Aplicado
  </label>
  <select 
    className="w-full p-3 border rounded-lg bg-white"
    value={formData.descontoAplicado}
    onChange={e => setFormData({...formData, descontoAplicado: e.target.value})}
  >
    <option value="Sem desconto">Sem desconto</option>
    <option value="Tabela">Preço de tabela</option>
    <option value="Acima da tabela">Acima da tabela</option>
    <option value="10%">10%</option>
    <option value="15%">15%</option>
  </select>
</div>

{/* MOTIVO DE PENDÊNCIA (se houver entrada parcial) */}
{formData.valorEntrada && toMoney(formData.valorEntrada) < toMoney(formData.valor) && (
  <>
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Motivo da Pendência
      </label>
      <select 
        className="w-full p-3 border rounded-lg bg-white"
        value={formData.motivoPendencia}
        onChange={e => setFormData({...formData, motivoPendencia: e.target.value})}
      >
        <option value="aguardando_cartao">💳 Aguardando cartão virar</option>
        <option value="pagamento_cliente">👤 Aguardando pagamento do cliente</option>
        <option value="parcelado">📅 Pagamento parcelado</option>
        <option value="aprovacao">✓ Aguardando aprovação</option>
        <option value="outro">🔹 Outro</option>
      </select>
    </div>
    
    {formData.motivoPendencia === 'outro' && (
      <input 
        type="text"
        className="w-full p-3 border rounded-lg"
        value={formData.textoMotivo}
        onChange={e => setFormData({...formData, textoMotivo: e.target.value})}
        placeholder="Descreva o motivo..."
      />
    )}
    
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Previsão de Pagamento
      </label>
      <input 
        type="date"
        className="w-full p-3 border rounded-lg"
        value={formData.previsaoPagamento}
        onChange={e => setFormData({...formData, previsaoPagamento: e.target.value})}
      />
    </div>
  </>
)}
```

Atualizar função handleSave para incluir novos campos:

```javascript
const vendaData = {
  // ... campos existentes ...
  
  // Novos campos v5.0
  valorTabela: toMoney(formData.valorTabela) || valorNum,
  descontoAplicado: formData.descontoAplicado,
  parcelas: Number(formData.parcelas) || 1,
  motivoPendencia: restante > 0 ? formData.motivoPendencia : null,
  textoMotivo: formData.textoMotivo || '',
  previsaoPagamento: formData.previsaoPagamento || '',
  status: formData.status || 'Ativa',
  motivoCancelamento: '',
  dataCancelamento: null,
  atualizadoEm: Date.now()
};
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após implementar, testar os seguintes cenários:

### Migração
- [ ] Abrir app com dados v4.0 → Deve migrar automaticamente
- [ ] Verificar no console: "✅ Migração concluída"
- [ ] Dados antigos devem continuar funcionando

### KPIs
- [ ] Dashboard mostra todos os 6 KPIs
- [ ] Valores calculados corretamente
- [ ] Comissão detalhada por percentual
- [ ] Descontos aparecem quando aplicados
- [ ] Pendências mostram valor correto

### Abas
- [ ] 3 abas visíveis (Vendas, Pendências, Entregas)
- [ ] Contadores corretos em cada aba
- [ ] Trocar de aba funciona suavemente
- [ ] Vendas aparecem na aba correta automaticamente

### Pendências
- [ ] Vendas com restante > 0 vão para Pendências
- [ ] Motivo da pendência é salvo
- [ ] Previsão de pagamento funciona
- [ ] Botão "Receber Restante" move para aba Vendas
- [ ] Barra de progresso mostra % recebido

### Entregas
- [ ] Vendas futuras aparecem na aba Entregas
- [ ] Separação por urgência funciona (atrasadas, 7 dias, futuras)
- [ ] Botão "Marcar Entregue" move para aba Vendas
- [ ] Contador de dias correto

### Formulário
- [ ] Novos campos aparecem
- [ ] Valor de tabela e desconto calculam corretamente
- [ ] Motivo de pendência só aparece se houver entrada parcial
- [ ] Valores padrão corretos ao criar nova venda

### Cancelamento
- [ ] Cancelar venda mantém histórico
- [ ] Venda cancelada não aparece em nenhuma aba
- [ ] Venda cancelada não conta nas métricas
- [ ] Possível ver vendas canceladas (implementar tab opcional)

---

## 🎯 RESULTADO ESPERADO

Após a implementação completa, o usuário terá:

✅ **Dashboard Estratégico**
- 6 KPIs visuais e informativos
- Métricas calculadas automaticamente
- Indicador de saúde financeira

✅ **Organização Clara**
- Vendas separadas por situação (pagas/pendentes/entregas)
- Navegação intuitiva por abas
- Contadores em tempo real

✅ **Controle Financeiro**
- Pendências rastreadas com motivo e previsão
- Barra de progresso de recebimento
- Alertas de urgência

✅ **Gestão de Entregas**
- Separação por urgência (atrasadas, próximas, futuras)
- Contador de dias para entrega
- Ação rápida para marcar como entregue

✅ **Análise de Descontos**
- Rastreamento de descontos aplicados
- Comparação com valor de tabela
- Insights para precificação

---

## 🐛 TROUBLESHOOTING

**Problema**: Migração não roda automaticamente
**Solução**: Limpar localStorage e recarregar página

**Problema**: KPIs mostram valores errados
**Solução**: Verificar se vendas têm campos válidos (valor, valorEntrada, restante)

**Problema**: Vendas não aparecem nas abas corretas
**Solução**: Verificar lógica de separação em separarVendas()

**Problema**: Formulário não salva novos campos
**Solução**: Verificar se handleSave inclui todos os campos de formData

---

## 📞 SUPORTE

Qualquer dúvida, consultar:
1. PLANO_EVOLUCAO_V5.0.md (documentação completa)
2. Código comentado nos arquivos
3. Console do navegador para mensagens de debug

**Versão**: 5.0.0 - Controle Estratégico Mensal
**Data**: Fevereiro 2026
