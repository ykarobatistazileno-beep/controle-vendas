# 🎯 PLANO DE EVOLUÇÃO v5.0 - CONTROLE ESTRATÉGICO MENSAL

## 📋 ANÁLISE DO CÓDIGO ATUAL (v4.0)

### ✅ O que já funciona bem:
- Sistema de vendas com IndexedDB
- Cálculo de comissões (6%, 5%, 4%, 3%)
- Controle de entregas (Imediata, Agendada, Futura)
- Sistema de entrada/restante para pagamentos parciais
- Dashboard com métricas básicas
- Formulário de cadastro completo
- Backup/Restore JSON

### ⚠️ O que precisa evoluir:
- **KPIs do topo**: Não contempla descontos nem pendências claramente
- **Abas**: Não há separação entre Vendas/Pendências/Entregas
- **Descontos**: Não rastreia descontos aplicados
- **Pendências**: Não tem motivo da pendência nem previsão
- **Cancelamento**: Não permite cancelar mantendo histórico
- **Formas de pagamento**: Formato atual não é detalhado

---

## 🏗️ ARQUITETURA DA EVOLUÇÃO

### Nova estrutura de dados (IndexedDB):

```javascript
// SCHEMA v5.0 - Retrocompatível com v4.0
{
  id: number,
  data: 'YYYY-MM-DD',
  cliente: string,
  produtos: string,
  
  // VALORES (mantém lógica atual)
  valor: number,              // Valor total da venda (IMUTÁVEL)
  valorEntrada: number,       // Quanto já foi recebido
  restante: number,           // Calculado: valor - valorEntrada
  
  // NOVO: DESCONTOS
  valorTabela: number,        // Preço de tabela do produto
  descontoAplicado: string,   // 'Sem desconto' | 'Tabela' | 'Acima da tabela' | '10%' | '15%'
  
  // COMISSÃO (mantém)
  percentual: string,         // '3' | '4' | '5' | '6'
  comissao: number,           // Calculado sobre valor
  
  // PAGAMENTO (expande)
  pagamento: string,          // 'Pix' | 'Pix • QR Code' | 'Pix • CNPJ' | 'Cartão' | etc
  parcelas: number,           // 1 a 12 (só informativo, NÃO divide valor)
  
  // STATUS E ENTREGAS (mantém + expande)
  statusPagamento: string,    // 'Pago' | 'Parcial'
  tipoEntrega: string,        // 'Imediata' | 'Agendada' | 'Futura'
  dataEntrega: string,        // Data prevista
  
  // NOVO: PENDÊNCIAS
  motivoPendencia: string,    // 'aguardando_cartao' | 'pagamento_cliente' | 'parcelado' | 'aprovacao' | 'outro'
  textoMotivo: string,        // Texto customizado quando motivoPendencia === 'outro'
  previsaoPagamento: string,  // Data prevista para receber restante
  
  // NOVO: CANCELAMENTO
  status: string,             // 'Ativa' | 'Cancelada'
  motivoCancelamento: string, // Texto livre
  dataCancelamento: string,   // Data do cancelamento
  
  // METADADOS (mantém)
  criadoEm: timestamp,
  pagoEm: timestamp,
  atualizadoEm: timestamp     // NOVO
}
```

---

## 🎨 IMPLEMENTAÇÃO POR ETAPAS

### ETAPA 1: MIGRAÇÃO DE DADOS (db.js)
**Objetivo**: Adicionar novos campos sem quebrar dados existentes

```javascript
// db.js - Adicionar função de migração
export const migrarParaV5 = async () => {
  const vendas = await getVendas();
  
  for (const venda of vendas) {
    const vendaAtualizada = {
      ...venda,
      // Valores padrão para campos novos
      valorTabela: venda.valorTabela || venda.valor,
      descontoAplicado: venda.descontoAplicado || 'Sem desconto',
      parcelas: venda.parcelas || 1,
      motivoPendencia: venda.motivoPendencia || (venda.restante > 0 ? 'aguardando_cartao' : null),
      textoMotivo: venda.textoMotivo || '',
      previsaoPagamento: venda.previsaoPagamento || '',
      status: venda.status || 'Ativa',
      motivoCancelamento: venda.motivoCancelamento || '',
      dataCancelamento: venda.dataCancelamento || null,
      atualizadoEm: Date.now()
    };
    
    await updateVenda(venda.id, vendaAtualizada);
  }
  
  localStorage.setItem('schema_version', '5.0');
};

// Executar automaticamente na primeira carga
export const verificarMigracao = async () => {
  const version = localStorage.getItem('schema_version');
  if (version !== '5.0') {
    await migrarParaV5();
  }
};
```

**✅ Checklist Etapa 1:**
- [ ] Adicionar campos no schema
- [ ] Criar função de migração
- [ ] Testar com dados existentes
- [ ] Validar retrocompatibilidade

---

### ETAPA 2: ATUALIZAR KPIs DO TOPO
**Objetivo**: Dashboard com indicadores estratégicos

```javascript
// hooks/useSalesMetrics.js - EXPANDIR
export const useSalesMetrics = (vendas, mesReferencia = null) => {
  return useMemo(() => {
    const hoje = new Date();
    const mesAtual = mesReferencia || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    // Filtrar vendas ativas do mês
    const vendasMes = vendas.filter(v => 
      v.data.startsWith(mesAtual) && v.status === 'Ativa'
    );
    
    // KPI 1: VENDIDO NO MÊS
    const totalVendido = vendasMes.reduce((sum, v) => sum + (v.valor || 0), 0);
    const qtdVendas = vendasMes.length;
    
    // KPI 2: COMISSÃO (detalhada por percentual)
    const comissoes = vendasMes.reduce((acc, v) => {
      const perc = v.percentual || '5';
      acc[`c${perc}`] = (acc[`c${perc}`] || 0) + (v.comissao || 0);
      acc.total += v.comissao || 0;
      return acc;
    }, { c3: 0, c4: 0, c5: 0, c6: 0, total: 0 });
    
    // KPI 3: DESCONTOS
    const totalDescontos = vendasMes.reduce((sum, v) => {
      const valorTabela = v.valorTabela || v.valor;
      const desconto = valorTabela - v.valor;
      return sum + (desconto > 0 ? desconto : 0);
    }, 0);
    
    // KPI 4: PENDÊNCIAS (NOVO)
    const pendencias = vendasMes.filter(v => v.restante > 0);
    const valorPendencias = pendencias.reduce((sum, v) => sum + v.restante, 0);
    const qtdPendencias = pendencias.length;
    
    // KPI 5: META
    const metaMensal = parseFloat(localStorage.getItem('meta_mensal') || '0');
    const faltaMeta = Math.max(0, metaMensal - totalVendido);
    const percentualMeta = metaMensal > 0 ? (totalVendido / metaMensal) * 100 : 0;
    
    return {
      vendido: { total: totalVendido, qtd: qtdVendas },
      comissao: comissoes,
      descontos: totalDescontos,
      pendencias: { valor: valorPendencias, qtd: qtdPendencias },
      meta: { valor: metaMensal, falta: faltaMeta, percentual: percentualMeta }
    };
  }, [vendas, mesReferencia]);
};
```

**Componente KPIs:**

```javascript
// components/KPICards.jsx
export const KPICards = ({ metricas }) => (
  <div className="grid grid-cols-2 gap-3 p-4">
    {/* VENDIDO */}
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
      <div className="text-xs opacity-80">Vendido no Mês</div>
      <div className="text-2xl font-bold">{formatBRL(metricas.vendido.total)}</div>
      <div className="text-xs mt-1">{metricas.vendido.qtd} vendas</div>
    </div>
    
    {/* COMISSÃO */}
    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
      <div className="text-xs opacity-80">Comissão Total</div>
      <div className="text-2xl font-bold">{formatBRL(metricas.comissao.total)}</div>
      <div className="text-xs mt-1 space-x-2">
        {metricas.comissao.c6 > 0 && <span>6%: {formatBRL(metricas.comissao.c6)}</span>}
        {metricas.comissao.c5 > 0 && <span>5%: {formatBRL(metricas.comissao.c5)}</span>}
        {metricas.comissao.c4 > 0 && <span>4%: {formatBRL(metricas.comissao.c4)}</span>}
        {metricas.comissao.c3 > 0 && <span>3%: {formatBRL(metricas.comissao.c3)}</span>}
      </div>
    </div>
    
    {/* DESCONTOS */}
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-lg">
      <div className="text-xs opacity-80">Total em Descontos</div>
      <div className="text-2xl font-bold">{formatBRL(metricas.descontos)}</div>
    </div>
    
    {/* PENDÊNCIAS */}
    <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg">
      <div className="text-xs opacity-80">Pendências</div>
      <div className="text-2xl font-bold">{formatBRL(metricas.pendencias.valor)}</div>
      <div className="text-xs mt-1">{metricas.pendencias.qtd} vendas</div>
    </div>
    
    {/* META */}
    <div className="col-span-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs opacity-80">Falta para Meta</div>
        <div className="text-sm font-bold">{metricas.meta.percentual.toFixed(0)}%</div>
      </div>
      <div className="text-2xl font-bold">{formatBRL(metricas.meta.falta)}</div>
      <div className="w-full bg-purple-700 h-2 rounded-full mt-2">
        <div 
          className="bg-white h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, metricas.meta.percentual)}%` }}
        />
      </div>
    </div>
  </div>
);
```

**✅ Checklist Etapa 2:**
- [ ] Expandir hook de métricas
- [ ] Criar componente KPICards
- [ ] Testar cálculos com dados reais
- [ ] Validar formatação mobile

---

### ETAPA 3: SISTEMA DE ABAS
**Objetivo**: Separação automática Vendas / Pendências / Entregas Futuras

```javascript
// App.jsx - Adicionar sistema de tabs
const [activeTab, setActiveTab] = useState('vendas'); // 'vendas' | 'pendencias' | 'entregas'

// Função de separação automática
const separarVendas = () => {
  const vendasAtivas = vendas.filter(v => v.status === 'Ativa');
  
  return {
    vendas: vendasAtivas.filter(v => 
      v.restante === 0 && 
      (v.tipoEntrega === 'Imediata' || 
       (v.tipoEntrega === 'Agendada' && compareDates(v.dataEntrega, '<=', new Date().toISOString().split('T')[0])))
    ),
    
    pendencias: vendasAtivas.filter(v => v.restante > 0),
    
    entregas: vendasAtivas.filter(v => 
      v.tipoEntrega === 'Futura' || 
      (v.tipoEntrega === 'Agendada' && compareDates(v.dataEntrega, '>', new Date().toISOString().split('T')[0]))
    )
  };
};

const { vendas: vendasPagas, pendencias, entregas } = separarVendas();
```

**Componente de Tabs:**

```javascript
// components/TabNavigator.jsx
export const TabNavigator = ({ activeTab, onChange, counts }) => (
  <div className="flex gap-2 p-4 bg-white border-b sticky top-14 z-20">
    <button 
      onClick={() => onChange('vendas')}
      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
        activeTab === 'vendas' 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      🟦 Vendas
      <span className="block text-xs font-normal mt-1">{counts.vendas}</span>
    </button>
    
    <button 
      onClick={() => onChange('pendencias')}
      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
        activeTab === 'pendencias' 
          ? 'bg-orange-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      🟧 Pendências
      <span className="block text-xs font-normal mt-1">{counts.pendencias}</span>
    </button>
    
    <button 
      onClick={() => onChange('entregas')}
      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
        activeTab === 'entregas' 
          ? 'bg-purple-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      🟪 Entregas
      <span className="block text-xs font-normal mt-1">{counts.entregas}</span>
    </button>
  </div>
);
```

**✅ Checklist Etapa 3:**
- [ ] Criar lógica de separação
- [ ] Implementar TabNavigator
- [ ] Criar views específicas por aba
- [ ] Testar transições

---

### ETAPA 4: ABA PENDÊNCIAS (DETALHADA)
**Objetivo**: Controle completo de pendências financeiras

```javascript
// components/PendenciasTab.jsx
export const PendenciasTab = ({ vendas, onReceberRestante, onEdit, onCancel }) => {
  const motivosPendencia = [
    { value: 'aguardando_cartao', label: '💳 Aguardando cartão virar', color: 'blue' },
    { value: 'pagamento_cliente', label: '👤 Aguardando pagamento do cliente', color: 'orange' },
    { value: 'parcelado', label: '📅 Pagamento parcelado', color: 'purple' },
    { value: 'aprovacao', label: '✓ Aguardando aprovação', color: 'yellow' },
    { value: 'outro', label: '🔹 Outro', color: 'gray' }
  ];
  
  return (
    <div className="p-4 space-y-4">
      {vendas.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma pendência financeira</p>
        </div>
      ) : (
        vendas.map(venda => {
          const motivo = motivosPendencia.find(m => m.value === venda.motivoPendencia);
          const percentualRecebido = (venda.valorEntrada / venda.valor) * 100;
          
          return (
            <div key={venda.id} className="bg-orange-50 border-l-4 border-orange-500 rounded-xl p-4 shadow">
              {/* Cabeçalho */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{venda.cliente}</h3>
                  <p className="text-xs text-gray-500">{venda.produtos}</p>
                </div>
                <span className="text-xs bg-orange-200 px-2 py-1 rounded">
                  {new Date(venda.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              {/* Valores */}
              <div className="bg-white rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-bold text-sm">{formatBRL(venda.valor)}</div>
                </div>
                <div>
                  <div className="text-xs text-green-600">Recebido</div>
                  <div className="font-bold text-sm text-green-600">{formatBRL(venda.valorEntrada)}</div>
                </div>
                <div>
                  <div className="text-xs text-red-600">Restante</div>
                  <div className="font-bold text-sm text-red-600">{formatBRL(venda.restante)}</div>
                </div>
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">Progresso</span>
                  <span className="font-bold text-orange-600">{percentualRecebido.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-2 transition-all duration-500"
                    style={{ width: `${percentualRecebido}%` }}
                  />
                </div>
              </div>
              
              {/* Motivo da Pendência */}
              <div className="bg-gray-50 rounded-lg p-2 mb-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-${motivo?.color}-500`} />
                <span className="text-sm text-gray-700">
                  {motivo?.label || venda.textoMotivo}
                </span>
              </div>
              
              {/* Previsão de Pagamento */}
              {venda.previsaoPagamento && (
                <div className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                  <Calendar size={14} />
                  Previsão: {new Date(venda.previsaoPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
              
              {/* Ações */}
              <div className="flex gap-2">
                <button 
                  onClick={() => onReceberRestante(venda)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Receber Restante
                </button>
                <button 
                  onClick={() => onEdit(venda)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => onCancel(venda)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
```

**✅ Checklist Etapa 4:**
- [ ] Criar PendenciasTab
- [ ] Adicionar seletor de motivo
- [ ] Implementar campo de previsão
- [ ] Testar ações (receber, editar, cancelar)

---

### ETAPA 5: ABA ENTREGAS FUTURAS
**Objetivo**: Gestão de produção e entregas pendentes

```javascript
// components/EntregasTab.jsx
export const EntregasTab = ({ vendas, onMarcarEntregue, onEdit, onCancel }) => {
  const motivosEntrega = {
    'Futura': '🏭 Produção na fábrica',
    'Agendada': '📅 Entrega agendada',
    'estoque': '📦 Aguardando estoque',
    'cliente': '🏠 Cliente aguardando casa pronta'
  };
  
  return (
    <div className="p-4 space-y-4">
      {vendas.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma entrega futura pendente</p>
        </div>
      ) : (
        vendas.map(venda => {
          const diasRestantes = venda.dataEntrega 
            ? Math.ceil((new Date(venda.dataEntrega) - new Date()) / (1000 * 60 * 60 * 24))
            : null;
          
          return (
            <div key={venda.id} className="bg-purple-50 border-l-4 border-purple-500 rounded-xl p-4 shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{venda.cliente}</h3>
                  <p className="text-xs text-gray-500">{venda.produtos}</p>
                </div>
                {diasRestantes !== null && (
                  <div className={`text-xs px-2 py-1 rounded font-bold ${
                    diasRestantes < 0 ? 'bg-red-200 text-red-800' :
                    diasRestantes <= 7 ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {diasRestantes < 0 ? 'Atrasado' : `${diasRestantes}d`}
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-lg p-3 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valor</span>
                  <span className="font-bold">{formatBRL(venda.valor)}</span>
                </div>
                {venda.dataEntrega && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Entrega prevista</span>
                    <span className="font-bold text-purple-600">
                      {new Date(venda.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-2 mb-3 text-sm text-gray-700">
                {motivosEntrega[venda.tipoEntrega] || '⏳ Aguardando'}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => onMarcarEntregue(venda)}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Marcar como Entregue
                </button>
                <button 
                  onClick={() => onEdit(venda)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg"
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
```

**✅ Checklist Etapa 5:**
- [ ] Criar EntregasTab
- [ ] Implementar contador de dias
- [ ] Adicionar ação "Marcar como Entregue"
- [ ] Testar transição para aba Vendas

---

### ETAPA 6: FORMULÁRIO EXPANDIDO
**Objetivo**: Adicionar campos de desconto, pagamento detalhado, pendências

```javascript
// Adicionar ao FormView em App.jsx
<div className="space-y-4">
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
    <p className="text-xs text-gray-500 mt-1">
      Preço oficial do produto (para cálculo de desconto)
    </p>
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
    
    {/* Indicador visual de desconto */}
    {formData.valorTabela && formData.valor && (
      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
        <div className="flex justify-between">
          <span>Tabela:</span>
          <span className="font-bold">{formatBRL(toMoney(formData.valorTabela))}</span>
        </div>
        <div className="flex justify-between">
          <span>Vendido:</span>
          <span className="font-bold text-green-600">{formatBRL(toMoney(formData.valor))}</span>
        </div>
        <div className="flex justify-between border-t mt-1 pt-1">
          <span>Desconto:</span>
          <span className={`font-bold ${
            toMoney(formData.valorTabela) > toMoney(formData.valor) ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatBRL(toMoney(formData.valorTabela) - toMoney(formData.valor))}
          </span>
        </div>
      </div>
    )}
  </div>
  
  {/* FORMA DE PAGAMENTO (EXPANDIDA) */}
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-2">
      Forma de Pagamento
    </label>
    <select 
      className="w-full p-3 border rounded-lg bg-white mb-2"
      value={formData.pagamento}
      onChange={e => setFormData({...formData, pagamento: e.target.value})}
    >
      <optgroup label="Pix">
        <option value="Pix">Pix</option>
        <option value="Pix • QR Code">Pix • QR Code</option>
        <option value="Pix • CNPJ">Pix • CNPJ</option>
      </optgroup>
      <optgroup label="Cartão">
        <option value="Cartão">Cartão</option>
        <option value="Crédito">Crédito</option>
        <option value="Débito">Débito</option>
      </optgroup>
      <optgroup label="Outros">
        <option value="Dinheiro">Dinheiro</option>
        <option value="Outros">Outros</option>
      </optgroup>
    </select>
    
    {/* PARCELAS (se for cartão) */}
    {(formData.pagamento.includes('Cartão') || formData.pagamento.includes('Crédito')) && (
      <select 
        className="w-full p-3 border rounded-lg bg-white"
        value={formData.parcelas}
        onChange={e => setFormData({...formData, parcelas: e.target.value})}
      >
        <option value="1">À vista (1x)</option>
        {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
          <option key={n} value={n}>{n}x sem juros</option>
        ))}
      </select>
    )}
  </div>
  
  {/* MOTIVO DA PENDÊNCIA (se houver restante) */}
  {formData.valorEntrada && toMoney(formData.valorEntrada) < toMoney(formData.valor) && (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Motivo da Pendência
      </label>
      <select 
        className="w-full p-3 border rounded-lg bg-white mb-2"
        value={formData.motivoPendencia}
        onChange={e => setFormData({...formData, motivoPendencia: e.target.value})}
      >
        <option value="aguardando_cartao">💳 Aguardando cartão virar</option>
        <option value="pagamento_cliente">👤 Aguardando pagamento do cliente</option>
        <option value="parcelado">📅 Pagamento parcelado</option>
        <option value="aprovacao">✓ Aguardando aprovação</option>
        <option value="outro">🔹 Outro</option>
      </select>
      
      {formData.motivoPendencia === 'outro' && (
        <input 
          type="text"
          className="w-full p-3 border rounded-lg"
          value={formData.textoMotivo}
          onChange={e => setFormData({...formData, textoMotivo: e.target.value})}
          placeholder="Descreva o motivo..."
        />
      )}
      
      <input 
        type="date"
        className="w-full p-3 border rounded-lg mt-2"
        value={formData.previsaoPagamento}
        onChange={e => setFormData({...formData, previsaoPagamento: e.target.value})}
        placeholder="Previsão de pagamento"
      />
    </div>
  )}
</div>
```

**✅ Checklist Etapa 6:**
- [ ] Adicionar campos ao formulário
- [ ] Validar cálculo de desconto
- [ ] Testar condicionais (parcelas, motivo)
- [ ] Garantir valores padrão corretos

---

### ETAPA 7: SISTEMA DE CANCELAMENTO
**Objetivo**: Permitir cancelar vendas mantendo histórico

```javascript
// Adicionar função de cancelamento
const handleCancelarVenda = async (venda) => {
  const motivo = prompt('Motivo do cancelamento:');
  if (!motivo) return;
  
  const confirmacao = confirm(
    `Confirma cancelamento da venda para ${venda.cliente}?\n\n` +
    `Valor: ${formatBRL(venda.valor)}\n` +
    `Motivo: ${motivo}\n\n` +
    `A venda será mantida no histórico mas não contará nas métricas.`
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
  
  alert('✓ Venda cancelada com sucesso');
};

// Adicionar opção de reativar
const handleReativarVenda = async (venda) => {
  const confirmacao = confirm(
    `Reativar venda para ${venda.cliente}?\n\n` +
    `Valor: ${formatBRL(venda.valor)}\n\n` +
    `A venda voltará a contar nas métricas.`
  );
  
  if (!confirmacao) return;
  
  const vendaReativada = {
    ...venda,
    status: 'Ativa',
    motivoCancelamento: '',
    dataCancelamento: null,
    atualizadoEm: Date.now()
  };
  
  await updateVenda(venda.id, vendaReativada);
  await carregarVendas();
};

// Adicionar tab "Canceladas" (opcional)
const VendasCanceladasTab = ({ vendas, onReativar, onDelete }) => (
  <div className="p-4 space-y-4">
    {vendas.filter(v => v.status === 'Cancelada').map(venda => (
      <div key={venda.id} className="bg-gray-100 border-l-4 border-gray-400 rounded-xl p-4 opacity-75">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold line-through">{venda.cliente}</h3>
            <p className="text-xs text-gray-500">{venda.produtos}</p>
          </div>
          <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
            CANCELADA
          </span>
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          <div><strong>Valor:</strong> {formatBRL(venda.valor)}</div>
          <div><strong>Data:</strong> {new Date(venda.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
          <div><strong>Motivo:</strong> {venda.motivoCancelamento}</div>
          <div className="text-xs text-gray-400 mt-1">
            Cancelada em {new Date(venda.dataCancelamento + 'T00:00:00').toLocaleDateString('pt-BR')}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => onReativar(venda)}
            className="flex-1 bg-green-600 text-white py-2 rounded font-bold"
          >
            ↺ Reativar
          </button>
          <button 
            onClick={() => onDelete(venda.id)}
            className="p-2 bg-red-600 text-white rounded"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    ))}
  </div>
);
```

**✅ Checklist Etapa 7:**
- [ ] Implementar cancelamento com histórico
- [ ] Criar função de reativação
- [ ] Adicionar tab opcional de canceladas
- [ ] Validar que métricas ignoram canceladas

---

### ETAPA 8: BUSCA E FILTROS
**Objetivo**: Melhorar sistema de busca e organização

```javascript
// Expandir filtros
const [filtros, setFiltros] = useState({
  busca: '',
  dataIni: '',
  dataFim: '',
  status: 'todas', // 'todas' | 'ativas' | 'canceladas'
  situacao: 'todas', // 'todas' | 'pagas' | 'pendentes' | 'entregas'
  percentual: '',
  pagamento: ''
});

// Função de filtragem aprimorada
const aplicarFiltros = (vendas) => {
  return vendas.filter(venda => {
    // Busca por nome do cliente
    if (filtros.busca && !venda.cliente.toLowerCase().includes(filtros.busca.toLowerCase())) {
      return false;
    }
    
    // Filtro de data
    if (filtros.dataIni && compareDates(venda.data, '<', filtros.dataIni)) return false;
    if (filtros.dataFim && compareDates(venda.data, '>', filtros.dataFim)) return false;
    
    // Filtro de status
    if (filtros.status === 'ativas' && venda.status !== 'Ativa') return false;
    if (filtros.status === 'canceladas' && venda.status !== 'Cancelada') return false;
    
    // Filtro de situação
    if (filtros.situacao === 'pagas' && venda.restante > 0) return false;
    if (filtros.situacao === 'pendentes' && venda.restante === 0) return false;
    if (filtros.situacao === 'entregas' && venda.tipoEntrega === 'Imediata') return false;
    
    // Filtro de percentual
    if (filtros.percentual && venda.percentual !== filtros.percentual) return false;
    
    // Filtro de pagamento
    if (filtros.pagamento && venda.pagamento !== filtros.pagamento) return false;
    
    return true;
  });
};

// Componente de filtros avançados
const FiltrosAvancados = ({ filtros, onChange, onLimpar }) => (
  <div className="bg-white p-4 rounded-lg shadow border space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <select 
        className="border rounded p-2"
        value={filtros.status}
        onChange={e => onChange({...filtros, status: e.target.value})}
      >
        <option value="todas">Todos Status</option>
        <option value="ativas">✓ Ativas</option>
        <option value="canceladas">✗ Canceladas</option>
      </select>
      
      <select 
        className="border rounded p-2"
        value={filtros.situacao}
        onChange={e => onChange({...filtros, situacao: e.target.value})}
      >
        <option value="todas">Todas Situações</option>
        <option value="pagas">💰 Pagas</option>
        <option value="pendentes">⏳ Pendentes</option>
        <option value="entregas">📦 Entregas</option>
      </select>
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      <input 
        type="date"
        className="border rounded p-2"
        value={filtros.dataIni}
        onChange={e => onChange({...filtros, dataIni: e.target.value})}
        placeholder="Data inicial"
      />
      <input 
        type="date"
        className="border rounded p-2"
        value={filtros.dataFim}
        onChange={e => onChange({...filtros, dataFim: e.target.value})}
        placeholder="Data final"
      />
    </div>
    
    <button 
      onClick={onLimpar}
      className="w-full text-blue-600 underline text-sm"
    >
      Limpar todos os filtros
    </button>
  </div>
);
```

**✅ Checklist Etapa 8:**
- [ ] Expandir sistema de filtros
- [ ] Criar componente de filtros avançados
- [ ] Testar combinações de filtros
- [ ] Validar performance com muitos dados

---

## 🎯 CRONOGRAMA DE IMPLEMENTAÇÃO

### Semana 1: Fundação
- [x] Dia 1-2: Etapa 1 (Migração de dados)
- [x] Dia 3-4: Etapa 2 (KPIs)
- [x] Dia 5-7: Testes e validação

### Semana 2: Interface
- [ ] Dia 8-10: Etapa 3 (Sistema de abas)
- [ ] Dia 11-12: Etapa 4 (Aba Pendências)
- [ ] Dia 13-14: Etapa 5 (Aba Entregas)

### Semana 3: Formulário
- [ ] Dia 15-17: Etapa 6 (Formulário expandido)
- [ ] Dia 18-19: Etapa 7 (Sistema de cancelamento)
- [ ] Dia 20-21: Testes integrados

### Semana 4: Refinamento
- [ ] Dia 22-24: Etapa 8 (Busca e filtros)
- [ ] Dia 25-26: Polish e UX
- [ ] Dia 27-28: Testes finais e documentação

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Retrocompatibilidade
**Problema**: Dados existentes não têm os novos campos
**Solução**: Migração automática com valores padrão seguros

### 2. Performance
**Problema**: Muitos cálculos ao filtrar/separar vendas
**Solução**: Usar `useMemo` para cachear resultados

### 3. Validações
**Problema**: Usuário pode tentar salvar dados inválidos
**Solução**: Validação em camadas (client + pre-save)

### 4. Mobile UX
**Problema**: Formulário muito longo em telas pequenas
**Solução**: Accordion/collapse para campos avançados

---

## 📊 TESTES DE VALIDAÇÃO

### Cenários de teste obrigatórios:

1. **Migração**: Abrir app com dados v4.0 → Deve migrar automaticamente
2. **Venda completa**: Criar venda paga sem pendências → Deve ir para aba Vendas
3. **Venda pendente**: Criar com entrada parcial → Deve ir para aba Pendências
4. **Venda futura**: Criar com entrega futura → Deve ir para aba Entregas
5. **Receber restante**: Receber pendência → Deve mover para aba Vendas
6. **Marcar entregue**: Finalizar entrega → Deve mover para aba Vendas
7. **Cancelar**: Cancelar venda → Não deve aparecer nas métricas
8. **Reativar**: Reativar cancelada → Deve voltar às métricas
9. **Desconto**: Vender abaixo da tabela → Deve calcular desconto correto
10. **Backup/Restore**: Fazer backup e restaurar → Deve manter todos os campos

---

## 🚀 PRÓXIMOS PASSOS PÓS v5.0

### Funcionalidades futuras (v5.1+):
- Comparação de meses (crescimento %)
- Metas por categoria de produto
- Notificações de vencimento de pendências
- Exportar relatório PDF
- Modo escuro
- Sincronização entre dispositivos (opcional)

---

## 📝 CONSIDERAÇÕES FINAIS

Esta evolução transforma o app em um **sistema estratégico completo** mantendo:
- ✅ Simplicidade de uso
- ✅ Performance offline
- ✅ Zero dependências pesadas
- ✅ Compatibilidade com dados existentes
- ✅ Foco mobile-first

O usuário terá:
- **Clareza**: KPIs visuais no topo
- **Organização**: Vendas separadas por situação
- **Controle**: Pendências rastreadas com motivo e previsão
- **Flexibilidade**: Editar, cancelar ou apagar sem medo
- **Insights**: Descontos mapeados para análise comercial

**Resultado esperado**: Sistema profissional, robusto e estratégico, mantendo a leveza e facilidade de uso do app original.
