import React, { useEffect, useMemo, useState } from 'react';
import { addVenda, getVendas, deleteVenda, updateVenda, addVendasBatch } from './db';
import { verificarMigracao } from './utils/migration-v5';
import { useSalesMetricsV5 } from './hooks/useSalesMetricsV5';
import { KPICardsV5 } from './components/KPICardsV5';
import { TabNavigatorV5 } from './components/TabNavigatorV5';
import { PendenciasTabV5 } from './components/PendenciasTabV5';
import { EntregasTabV5 } from './components/EntregasTabV5';
import { Trash2, Edit, Plus, List, BarChart, Filter, Calendar } from 'lucide-react';

// --- UTILITÁRIOS ---
const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const toMoney = (val) => {
  if (val === null || val === undefined) return NaN;
  if (String(val).trim() === '') return NaN;
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
};


// Data local (evita bugs de fuso horário causados por toISOString/UTC)
const getLocalToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalMonthKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatLocalISODate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// ICS sanitize (RFC5545 basic escaping)
const sanitizeIcsText = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .trim();
};

const normalizarPagamentoDetalhe = (str) => {
  const s = String(str || '').toLowerCase();
  if (s.includes('pix') && s.includes('qr')) return 'Pix • QR Code';
  if (s.includes('pix') && s.includes('cnpj')) return 'Pix • CNPJ';
  if (s.includes('deb')) return 'Débito';
  if (s.includes('din')) return 'Dinheiro';
  const m = s.match(/(\d+)\s*x/);
  if (s.includes('cred') || s.includes('créd') || s.includes('cart')) {
    const parcelas = m ? Math.min(12, Math.max(1, Number(m[1]))) : 1;
    return `Crédito (${parcelas}x)`;
  }
  return 'Pix • QR Code';
};

const descontoOptions = ['Sem desconto', 'Preço de tabela', 'Acima da tabela', '10%', '15%'];
const pagamentoOptions = ['Pix • QR Code', 'Pix • CNPJ', 'Crédito (1x)', 'Crédito (2x)', 'Crédito (3x)', 'Crédito (4x)', 'Crédito (5x)', 'Crédito (6x)', 'Crédito (7x)', 'Crédito (8x)', 'Crédito (9x)', 'Crédito (10x)', 'Crédito (11x)', 'Crédito (12x)', 'Débito', 'Dinheiro'];

const motivoPendenciaOptions = [
  { value: 'aguardando_cartao', label: '💳 Aguardando cartão virar' },
  { value: 'pagamento_cliente', label: '👤 Aguardando pagamento do cliente' },
  { value: 'parcelado', label: '📅 Pagamento parcelado' },
  { value: 'aprovacao', label: '✅ Aguardando aprovação' },
  { value: 'outro', label: '🔹 Outro' },
];

export default function App() {
  const [view, setView] = useState('dashboard'); // dashboard | add | reports
  const [vendas, setVendas] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('vendas'); // vendas | pendencias | entregas
  const [activeMonth, setActiveMonth] = useState(() => localStorage.getItem('active_month') || getLocalMonthKey());

  const [formData, setFormData] = useState({
    data: getLocalToday(),
    cliente: '',
    produtos: '',

    valor: '',
    valorEntrada: '',
    percentual: '5',

    // v5 fields
    valorTabela: '',
    descontoAplicado: 'Sem desconto',
    pagamentoDetalhe: 'Pix • QR Code',

    // pendency extra
    motivoPendencia: 'aguardando_cartao',
    textoMotivo: '',
    previsaoPagamento: '',

    // delivery
    tipoEntrega: 'Imediata', // Imediata | Agendada | Futura
    dataEntrega: '',
    motivoEntrega: '',

    // lifecycle
    status: 'Ativa',
    motivoCancelamento: '',
    dataCancelamento: null,

    criadoEm: null,
    atualizadoEm: null,
    pagoEm: null,
  });

  // Meta mensal (persistida por mês no localStorage)
  const goalKey = (month) => `cv_goal_${month}`;
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    try {
      const saved = localStorage.getItem(goalKey(new Date().toISOString().slice(0, 7)));
      const n = Number(saved);
      return Number.isFinite(n) ? n : 10000; // padrão
    } catch {
      return 10000;
    }
  });

  // Quando mudar o mês ativo, carregar a meta daquele mês (ou manter padrão)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(goalKey(activeMonth));
      const n = Number(saved);
      setMonthlyGoal(Number.isFinite(n) ? n : 10000);
    } catch {
      setMonthlyGoal(10000);
    }
  }, [activeMonth]);

  const [filtros, setFiltros] = useState({
    cliente: '',
    dataIni: '',
    dataFim: '',
    percentual: '',
  });

  // Init: migration + load
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await verificarMigracao();
      } catch (e) {
        console.warn('Migração falhou (seguindo):', e);
      }

      const dados = await getVendas();
      if (!isMounted) return;

      dados.sort((a, b) => {
        const dateA = new Date(a.data + 'T00:00:00');
        const dateB = new Date(b.data + 'T00:00:00');
        return dateB - dateA || (b.id || 0) - (a.id || 0);
      });
      setVendas(dados);
    };

    init();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('active_month', activeMonth);
  }, [activeMonth]);

  const carregarVendas = async () => {
    const dados = await getVendas();
    dados.sort((a, b) => {
      const dateA = new Date(a.data + 'T00:00:00');
      const dateB = new Date(b.data + 'T00:00:00');
      return dateB - dateA || (b.id || 0) - (a.id || 0);
    });
    setVendas(dados);
  };

  const limparForm = () => {
    setFormData((prev) => ({
      ...prev,
      data: getLocalToday(),
      cliente: '',
      produtos: '',
      valor: '',
      valorEntrada: '',
      percentual: '5',

      valorTabela: '',
      descontoAplicado: 'Sem desconto',
      pagamentoDetalhe: 'Pix • QR Code',

      motivoPendencia: 'aguardando_cartao',
      textoMotivo: '',
      previsaoPagamento: '',

      tipoEntrega: 'Imediata',
      dataEntrega: '',
      motivoEntrega: '',

      status: 'Ativa',
      motivoCancelamento: '',
      dataCancelamento: null,

      criadoEm: null,
      atualizadoEm: null,
      pagoEm: null,
    }));
  };

  const handleTipoEntregaChange = (novoTipo) => {
    setFormData((prev) => ({
      ...prev,
      tipoEntrega: novoTipo,
      dataEntrega: novoTipo === 'Agendada' ? prev.dataEntrega : '',
      motivoEntrega: novoTipo === 'Futura' ? prev.motivoEntrega : '',
    }));
  };

  const metricas = useSalesMetricsV5(vendas, activeMonth);

  const separarVendas = useMemo(() => {
    // IMPORTANT: Abas de Pendências e Entregas NÃO podem depender do mês ativo.
    // - Pendências: mostram todas as dívidas em aberto (restante > 0), mesmo de meses anteriores.
    // - Entregas: mostram todas as entregas não concluídas (Futura/Agendada), inclusive atrasadas.
    const vendasAtivas = vendas.filter((v) => v && v.status !== 'Cancelada');

    // Aba "Vendas": filtra pelo mês da DATA DA VENDA (mês ativo)
    const monthKey = (iso) => String(iso || '').slice(0, 7);
    const vendasDoMes = vendasAtivas.filter((v) => monthKey(v.data) === activeMonth);

    // Entrega só é considerada concluída quando o usuário marca como entregue
    const entregue = (v) => v.tipoEntrega === 'Imediata';

    const pendencias = vendasAtivas.filter((v) => (Number(v.restante) || 0) > 0);

    const entregas = vendasAtivas.filter((v) => {
      if (v.tipoEntrega === 'Futura') return true;
      if (v.tipoEntrega === 'Agendada' && isIsoDate(v.dataEntrega)) return true;
      return false;
    });

    const vendasOk = vendasDoMes.filter((v) => {
      const quitado = (Number(v.restante) || 0) === 0;
      return quitado && entregue(v);
    });

    return { vendasOk, pendencias, entregas };
  }, [vendas, activeMonth]);

  const vendasFiltradas = useMemo(() => {
    const { vendasOk, pendencias, entregas } = separarVendas;
    const all = activeTab === 'vendas' ? vendasOk : activeTab === 'pendencias' ? pendencias : entregas;

    const matchCliente = (v) => filtros.cliente
      ? String(v.cliente || '').toLowerCase().includes(filtros.cliente.toLowerCase())
      : true;

    const matchPerc = (v) => filtros.percentual
      ? String(v.percentual ?? '') === String(filtros.percentual)
      : true;

    const matchData = (v) => {
      if (filtros.dataIni && isIsoDate(v.data) && isIsoDate(filtros.dataIni)) {
        if (new Date(v.data + 'T00:00:00') < new Date(filtros.dataIni + 'T00:00:00')) return false;
      }
      if (filtros.dataFim && isIsoDate(v.data) && isIsoDate(filtros.dataFim)) {
        if (new Date(v.data + 'T00:00:00') > new Date(filtros.dataFim + 'T00:00:00')) return false;
      }
      return true;
    };

    return all.filter((v) => matchCliente(v) && matchPerc(v) && matchData(v));
  }, [separarVendas, activeTab, filtros]);

  // --- SAVE (blindado) ---
  const handleSave = async (e) => {
    e.preventDefault();

    const valorNum = toMoney(formData.valor);
    if (Number.isNaN(valorNum) || valorNum <= 0) {
      alert('Erro: Valor da venda inválido.');
      return;
    }

    if (!formData.cliente.trim()) {
      alert('Erro: Nome do cliente é obrigatório.');
      return;
    }

    // valorTabela é referência (não entra nos cálculos), mas deve ser coerente
    let valorTabela = toMoney(formData.valorTabela);
    if (!Number.isFinite(valorTabela) || valorTabela <= 0) valorTabela = valorNum;

    // Entrada
    const isEntradaVazia = formData.valorEntrada === null || formData.valorEntrada === undefined || String(formData.valorEntrada).trim() === '';
    let entradaNum = isEntradaVazia ? valorNum : toMoney(formData.valorEntrada);

    if (Number.isNaN(entradaNum) || entradaNum < 0) {
      alert('Erro: Entrada inválida.');
      return;
    }
    if (entradaNum > valorNum) {
      alert(`Erro: Entrada (${formatBRL(entradaNum)}) maior que total (${formatBRL(valorNum)}).`);
      return;
    }

    const restante = round2(valorNum - entradaNum);

    // Entrega
    if (formData.tipoEntrega === 'Agendada') {
      if (!isIsoDate(formData.dataEntrega)) {
        alert('Erro: Para entrega Agendada, selecione uma data válida.');
        return;
      }
    }

    // Comissão
    const percNum = Number(formData.percentual);
    if (!Number.isFinite(percNum) || percNum < 0 || percNum > 100) {
      alert('Erro: Percentual de comissão inválido.');
      return;
    }
    const comissao = round2(valorNum * (percNum / 100));

    // statusPagamento
    let statusPagamento = 'Pago';
    if (restante > 0) statusPagamento = 'Pendente';
    if (restante === valorNum) statusPagamento = 'Totalmente Pendente';

    // pagoEm coerente
    let pagoEm = formData.pagoEm;
    if (restante > 0) pagoEm = null;
    else if (restante === 0 && !pagoEm) pagoEm = new Date().toISOString();

    // Pêndencia extra
    let motivoPendencia = null;
    let textoMotivo = '';
    let previsaoPagamento = '';
    if (restante > 0) {
      motivoPendencia = formData.motivoPendencia || 'aguardando_cartao';
      textoMotivo = motivoPendencia === 'outro' ? String(formData.textoMotivo || '').trim() : '';
      previsaoPagamento = isIsoDate(formData.previsaoPagamento) ? formData.previsaoPagamento : '';
    }

    // Entrega futura motivo
    let motivoEntrega = '';
    if (formData.tipoEntrega === 'Futura') {
      motivoEntrega = String(formData.motivoEntrega || '').trim();
    }

    const pagamentoDetalhe = normalizarPagamentoDetalhe(formData.pagamentoDetalhe);

    const vendaObj = {
      data: formData.data,
      cliente: formData.cliente.trim(),
      produtos: formData.produtos,

      valor: valorNum,
      valorEntrada: entradaNum,
      restante,
      percentual: percNum,
      comissao,
      statusPagamento,

      valorTabela,
      descontoAplicado: formData.descontoAplicado || 'Sem desconto',
      pagamentoDetalhe,

      motivoPendencia,
      textoMotivo,
      previsaoPagamento,

      tipoEntrega: formData.tipoEntrega,
      dataEntrega: formData.tipoEntrega === 'Agendada' ? formData.dataEntrega : '',
      motivoEntrega,

      status: 'Ativa',
      motivoCancelamento: '',
      dataCancelamento: null,

      criadoEm: formData.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      pagoEm,
    };

    try {
      if (editingId) {
        vendaObj.id = editingId;
        await updateVenda(vendaObj);
      } else {
        await addVenda(vendaObj);
      }

      limparForm();
      setEditingId(null);
      await carregarVendas();
      setView('dashboard');
      setActiveTab('vendas');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  const handleEdit = (venda) => {
    setFormData({
      ...formData,
      ...venda,
      valor: String(venda.valor ?? ''),
      valorEntrada: String(venda.valorEntrada === 0 ? '0' : (venda.valorEntrada ?? '')),
      valorTabela: String(venda.valorTabela ?? ''),
      percentual: String(venda.percentual ?? '5'),
      descontoAplicado: venda.descontoAplicado || 'Sem desconto',
      pagamentoDetalhe: venda.pagamentoDetalhe || 'Pix • QR Code',
      previsaoPagamento: venda.previsaoPagamento || '',
      textoMotivo: venda.textoMotivo || '',
      motivoPendencia: venda.motivoPendencia || 'aguardando_cartao',
      tipoEntrega: venda.tipoEntrega || 'Imediata',
      dataEntrega: venda.dataEntrega || '',
      motivoEntrega: venda.motivoEntrega || '',
      criadoEm: venda.criadoEm || null,
      pagoEm: venda.pagoEm || null,
    });
    setEditingId(venda.id);
    setView('add');
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta venda? Isso é irreversível.')) return;
    await deleteVenda(id);
    await carregarVendas();
  };

  const handleCancelarVenda = async (venda) => {
    const motivo = prompt('Motivo do cancelamento:');
    if (!motivo) return;

    if (!confirm(`Confirmar cancelamento?\n\nCliente: ${venda.cliente}\nValor: ${formatBRL(venda.valor)}\nMotivo: ${motivo}`)) return;

    const vendaCancelada = {
      ...venda,
      status: 'Cancelada',
      motivoCancelamento: motivo,
      dataCancelamento: getLocalToday(),
      atualizadoEm: new Date().toISOString(),
    };

    await updateVenda(vendaCancelada);
    await carregarVendas();
  };

  const handleReceberRestante = async (venda) => {
    if (!confirm(`Receber restante de ${venda.cliente}?\nRestante: ${formatBRL(venda.restante)}`)) return;

    const atualizada = {
      ...venda,
      valorEntrada: venda.valor,
      restante: 0,
      statusPagamento: 'Pago',
      motivoPendencia: null,
      textoMotivo: '',
      previsaoPagamento: '',
      pagoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    await updateVenda(atualizada);
    await carregarVendas();
  };

  const handleMarcarEntregue = async (venda) => {
    if (!confirm(`Marcar entregue para ${venda.cliente}?`)) return;

    const hoje = getLocalToday();
    const atualizada = {
      ...venda,
      tipoEntrega: 'Imediata',
      dataEntrega: '',
      motivoEntrega: '',
      atualizadoEm: new Date().toISOString(),
      // mantém histórico de dataEntrega no futuro? não: preferi limpar para consistência
      // se quiser manter, crie campo dataEntregaReal
    };

    // Se estava agendada e já passou, ok; se era futura, agora virou entregue.
    // Mantemos a venda como "final" apenas se também estiver paga (restante 0).

    await updateVenda(atualizada);
    await carregarVendas();
  };

  // --- Backup / Restore ---
  const handleBackup = () => {
    const dadosStr = JSON.stringify(vendas);
    const blob = new Blob([dadosStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACKUP_VENDAS_${getLocalToday()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!confirm('Isso adicionará as vendas do arquivo ao banco atual.\nDeseja continuar?')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dadosBackup = JSON.parse(event.target.result);
        if (!Array.isArray(dadosBackup)) throw new Error('Formato inválido');

        let importadas = 0;
        let ignoradas = 0;
        let buffer = [];
        const CHUNK_SIZE = 50;
        let duplicadas = 0;
        const existingStrictSignatures = new Set(vendas.map(v => `${v.data}|${String(v.cliente || '').trim()}|${v.valor}|${v.criadoEm || ''}`));
        const existingLooseSignatures = new Set(vendas.map(v => `${v.data}|${String(v.cliente || '').trim()}|${v.valor}`));

        const flushBuffer = async () => {
          if (buffer.length === 0) return;
          try {
            await addVendasBatch(buffer);
            importadas += buffer.length;
          } catch (batchErr) {
            console.warn('Lote falhou, tentando um por um...', batchErr);
            for (const v of buffer) {
              try { await addVenda(v); importadas++; }
              catch { ignoradas++; }
            }
          }
          buffer = [];
          await new Promise((r) => setTimeout(r, 0));
        };

        // Normalização mínima (whitelist + coerência)
        for (const item of dadosBackup) {
          const data = isIsoDate(item.data) ? item.data : null;
          const cliente = typeof item.cliente === 'string' ? item.cliente.trim() : '';
          const valor = Number(item.valor);
          if (!data || !cliente || !Number.isFinite(valor) || valor <= 0) { ignoradas++; continue; }

          let valorEntrada = Number(item.valorEntrada);
          if (!Number.isFinite(valorEntrada) || valorEntrada < 0) valorEntrada = valor;
          if (valorEntrada > valor) valorEntrada = valor;

          const restante = round2(valor - valorEntrada);

          let percentual = Number(item.percentual);
          if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) percentual = 5;
          const comissao = round2(valor * (percentual / 100));

          let statusPagamento = 'Pago';
          if (restante > 0) statusPagamento = 'Pendente';
          if (restante === valor) statusPagamento = 'Totalmente Pendente';

          let pagoEm = item.pagoEm || null;
          if (restante > 0) pagoEm = null;

          const tipoEntrega = ['Imediata','Agendada','Futura'].includes(item.tipoEntrega) ? item.tipoEntrega : 'Imediata';
          let dataEntrega = '';
          if (tipoEntrega === 'Agendada' && isIsoDate(item.dataEntrega)) dataEntrega = item.dataEntrega;

          // v5 fields
          let valorTabela = Number(item.valorTabela);
          if (!Number.isFinite(valorTabela) || valorTabela <= 0) valorTabela = valor;

          const descontoAplicado = descontoOptions.includes(item.descontoAplicado) ? item.descontoAplicado : 'Sem desconto';
          const pagamentoDetalhe = normalizarPagamentoDetalhe(item.pagamentoDetalhe || item.pagamento);

          const motivoPendencia = restante > 0 ? String(item.motivoPendencia || 'aguardando_cartao') : null;
          const textoMotivo = restante > 0 ? String(item.textoMotivo || '').trim() : '';
          const previsaoPagamento = restante > 0 && isIsoDate(item.previsaoPagamento) ? item.previsaoPagamento : '';

          const motivoEntrega = tipoEntrega === 'Futura' ? String(item.motivoEntrega || '').trim() : '';

          const vendaNormalizada = {
            data,
            cliente,
            produtos: String(item.produtos || ''),
            pagamentoDetalhe,

            valor,
            valorEntrada,
            restante,

            percentual,
            comissao,
            statusPagamento,

            valorTabela,
            descontoAplicado,

            motivoPendencia,
            textoMotivo,
            previsaoPagamento,

            tipoEntrega,
            dataEntrega,
            motivoEntrega,

            status: 'Ativa',
            motivoCancelamento: '',
            dataCancelamento: null,

            criadoEm: item.criadoEm || new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            pagoEm,
          };

          const baseKey = `${vendaNormalizada.data}|${vendaNormalizada.cliente}|${vendaNormalizada.valor}`;
          const strictKey = `${baseKey}|${vendaNormalizada.criadoEm || ''}`;

          // Deduplicação legacy-proof:
          // - Se o item tiver criadoEm -> match estrito
          // - Se NÃO tiver criadoEm (backups antigos) -> match solto (data|cliente|valor)
          if (vendaNormalizada.criadoEm) {
            if (existingStrictSignatures.has(strictKey)) { duplicadas++; continue; }
          } else {
            if (existingLooseSignatures.has(baseKey)) { duplicadas++; continue; }
          }

          existingStrictSignatures.add(strictKey);
          existingLooseSignatures.add(baseKey);

          buffer.push(vendaNormalizada);
          if (buffer.length >= CHUNK_SIZE) await flushBuffer();
        }

        await flushBuffer();
        alert(`Restore concluído!\n✅ ${importadas} importadas\n♻️ ${duplicadas} duplicadas evitadas\n⚠️ ${ignoradas} ignoradas`);
        await carregarVendas();
      } catch (err) {
        console.error(err);
        alert('Erro ao processar backup. Verifique se o arquivo é um JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  // --- ICS ---
  const downloadIcs = (venda) => {
    if (!venda.dataEntrega || !isIsoDate(venda.dataEntrega)) return;

    let url = null;
    let link = null;

    try {
      const dtStart = venda.dataEntrega.replace(/-/g, '');
      const dateObj = new Date(venda.dataEntrega + 'T00:00:00');
      dateObj.setDate(dateObj.getDate() + 1);
      const dtEnd = formatLocalISODate(dateObj).replace(/-/g, '');

      const summary = sanitizeIcsText(`Entrega: ${venda.cliente}`);
      const description = sanitizeIcsText(`Produtos: ${venda.produtos} • Total: ${formatBRL(venda.valor)} • Restante: ${formatBRL(venda.restante)}`);

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${summary}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      url = URL.createObjectURL(blob);

      link = document.createElement('a');
      link.href = url;

      const clienteSanitizado = (venda.cliente || 'cliente').trim().replace(/\s+/g, '_').toLowerCase();
      link.setAttribute('download', `entrega_${clienteSanitizado}_${venda.dataEntrega}.ics`);

      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Erro ao gerar ICS:', error);
      alert('Não foi possível gerar o arquivo de agenda.');
    } finally {
      if (link && document.body.contains(link)) document.body.removeChild(link);
      if (url) URL.revokeObjectURL(url);
    }
  };

  // Month navigation (comparação com meses anteriores)
  const monthToInt = (m) => {
    const [y, mo] = m.split('-').map(Number);
    return y * 12 + (mo - 1);
  };
  const intToMonth = (n) => {
    const y = Math.floor(n / 12);
    const mo = (n % 12) + 1;
    return `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}`;
  };
  const handlePrevMonth = () => setActiveMonth(intToMonth(monthToInt(activeMonth) - 1));
  const handleNextMonth = () => setActiveMonth(intToMonth(monthToInt(activeMonth) + 1));

  // --- UI (Form/List/Reports) ---
  const FormView = () => {
    const valorSeguro = Number(formData.valor) || 0;
    const entradaValor = toMoney(formData.valorEntrada);
    const entradaSegura = Number.isNaN(entradaValor) ? valorSeguro : entradaValor;
    const faltaPagar = Math.max(0, valorSeguro - entradaSegura);
    const comissaoEstimada = valorSeguro * (Number(formData.percentual) / 100);

    return (
      <div className="p-4 max-w-md mx-auto bg-white rounded-2xl shadow-sm border mt-4 mb-28">
        <h2 className="text-xl font-extrabold mb-4 text-gray-900">{editingId ? 'Editar Venda' : 'Nova Venda'}</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700">Data</label>
              <input type="date" className="w-full p-3 border rounded-xl" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">Cliente</label>
              <input type="text" className="w-full p-3 border rounded-xl" placeholder="Nome do cliente" value={formData.cliente} onChange={(e) => setFormData({ ...formData, cliente: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700">Produtos / Descrição</label>
            <textarea className="w-full p-3 border rounded-xl" rows="3" placeholder="Ex: Colchão Queen + box..." value={formData.produtos} onChange={(e) => setFormData({ ...formData, produtos: e.target.value })} />
          </div>

          <div className="bg-gray-50 border rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Valor vendido</label>
                <input type="number" step="0.01" className="w-full p-3 border rounded-xl bg-white font-extrabold" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="0,00" required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Entrada</label>
                <input type="number" step="0.01" className="w-full p-3 border rounded-xl bg-white" value={formData.valorEntrada} onChange={(e) => setFormData({ ...formData, valorEntrada: e.target.value })} placeholder="Igual total" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Valor de tabela</label>
                <input type="number" step="0.01" className="w-full p-3 border rounded-xl bg-white" value={formData.valorTabela} onChange={(e) => setFormData({ ...formData, valorTabela: e.target.value })} placeholder="Referência" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Desconto aplicado</label>
                <select className="w-full p-3 border rounded-xl bg-white" value={formData.descontoAplicado} onChange={(e) => setFormData({ ...formData, descontoAplicado: e.target.value })}>
                  {descontoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {faltaPagar > 0 ? (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl text-sm font-bold">
                Pendência: {formatBRL(faltaPagar)}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-sm font-bold">
                Totalmente pago ✅
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700">Comissão</label>
              <select className="w-full p-3 border rounded-xl bg-white" value={formData.percentual} onChange={(e) => setFormData({ ...formData, percentual: e.target.value })}>
                {[6, 5, 4, 3].map((n) => <option key={n} value={n}>{n}%</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">Pagamento</label>
              <select className="w-full p-3 border rounded-xl bg-white" value={formData.pagamentoDetalhe} onChange={(e) => setFormData({ ...formData, pagamentoDetalhe: e.target.value })}>
                {pagamentoOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {faltaPagar > 0 && (
            <div className="bg-white border rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Motivo da pendência</label>
                <select className="w-full p-3 border rounded-xl bg-white" value={formData.motivoPendencia} onChange={(e) => setFormData({ ...formData, motivoPendencia: e.target.value })}>
                  {motivoPendenciaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {formData.motivoPendencia === 'outro' && (
                <input type="text" className="w-full p-3 border rounded-xl" placeholder="Descreva o motivo..." value={formData.textoMotivo} onChange={(e) => setFormData({ ...formData, textoMotivo: e.target.value })} />
              )}
              <div>
                <label className="text-xs font-bold text-gray-700">Previsão de pagamento</label>
                <input type="date" className="w-full p-3 border rounded-xl" value={formData.previsaoPagamento} onChange={(e) => setFormData({ ...formData, previsaoPagamento: e.target.value })} />
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-700">Entrega</label>
              <select className="w-full p-3 border rounded-xl bg-white" value={formData.tipoEntrega} onChange={(e) => handleTipoEntregaChange(e.target.value)}>
                <option value="Imediata">📦 Imediata</option>
                <option value="Agendada">📅 Agendada</option>
                <option value="Futura">🏭 Futura (produção)</option>
              </select>
            </div>

            {formData.tipoEntrega === 'Agendada' && (
              <div>
                <label className="text-xs font-bold text-gray-700">Data da entrega</label>
                <input type="date" className="w-full p-3 border rounded-xl bg-white" value={formData.dataEntrega} onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })} required />
              </div>
            )}

            {formData.tipoEntrega === 'Futura' && (
              <div>
                <label className="text-xs font-bold text-gray-700">Motivo (produção / espera)</label>
                <input type="text" className="w-full p-3 border rounded-xl bg-white" value={formData.motivoEntrega} onChange={(e) => setFormData({ ...formData, motivoEntrega: e.target.value })} placeholder="Ex: Produção na fábrica / Cliente aguardando obra" />
              </div>
            )}
          </div>

          <div className="bg-gray-50 border rounded-2xl p-4 flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500">Comissão prevista</div>
              <div className="text-2xl font-extrabold text-green-700">{formatBRL(comissaoEstimada)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); limparForm(); setView('dashboard'); }} className="flex-1 bg-gray-200 py-3 rounded-2xl font-extrabold">
                Cancelar
              </button>
            )}
            <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-extrabold text-lg">
              Salvar
            </button>
          </div>
        </form>
      </div>
    );
  };

  const VendaCard = ({ v }) => {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <div className="font-extrabold text-gray-900 text-lg truncate">{v.cliente}</div>
            <div className="text-xs text-gray-500 whitespace-pre-line">{v.produtos}</div>
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded-xl">{new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR').slice(0,5)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 border rounded-xl p-2">
            <div className="text-xs text-gray-500">Total</div>
            <div className="font-extrabold">{formatBRL(v.valor)}</div>
          </div>
          <div className="bg-gray-50 border rounded-xl p-2">
            <div className="text-xs text-gray-500">Comissão ({v.percentual}%)</div>
            <div className="font-extrabold text-green-700">{formatBRL(v.comissao)}</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 text-sm">
          <div className="flex justify-between">
            <span className="font-bold">Pagamento</span>
            <span className="text-gray-700">{v.pagamentoDetalhe}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-bold">Desconto</span>
            <span className="text-gray-700">{v.descontoAplicado}</span>
          </div>
        </div>

        {v.tipoEntrega === 'Agendada' && v.dataEntrega && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2 text-sm flex justify-between items-center">
            <span className="font-bold">Entrega: {new Date(v.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            <button type="button" onClick={() => downloadIcs(v)} className="text-blue-700 font-bold flex items-center gap-1">
              <Calendar size={18} /> ICS
            </button>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-gray-500">
            Status: <span className="font-bold">{v.statusPagamento}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleEdit(v)} className="text-blue-600"><Edit size={18} /></button>
            <button onClick={() => handleDelete(v.id)} className="text-red-600"><Trash2 size={18} /></button>
          </div>
        </div>
      </div>
    );
  };

  const DashboardView = () => (
    <div className="pb-28">
      <KPICardsV5 metricas={metricas} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} />

      <div className="px-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Pesquisar cliente..."
            className="flex-1 p-3 border rounded-2xl"
            value={filtros.cliente}
            onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
          />
          <button onClick={() => setShowFilters(!showFilters)} className="p-3 border rounded-2xl bg-white font-bold">
            <Filter size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-3 rounded-2xl shadow-sm border grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700">De</label>
                <input type="date" className="w-full border rounded-xl p-2" value={filtros.dataIni} onChange={(e) => setFiltros({ ...filtros, dataIni: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Até</label>
                <input type="date" className="w-full border rounded-xl p-2" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">% comissão</label>
              <select className="border rounded-xl p-2 w-full" value={filtros.percentual} onChange={(e) => setFiltros({ ...filtros, percentual: e.target.value })}>
                <option value="">Todas</option>
                {[6, 5, 4, 3].map((n) => <option key={n} value={n}>{n}%</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => setFiltros({ cliente: '', dataIni: '', dataFim: '', percentual: '' })} className="w-full text-blue-600 underline font-bold">
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      <TabNavigatorV5
        activeTab={activeTab}
        onChange={setActiveTab}
        counts={{
          vendas: separarVendas.vendasOk.length,
          pendencias: separarVendas.pendencias.length,
          entregas: separarVendas.entregas.length,
        }}
      />

      {activeTab === 'vendas' && (
        <div className="p-4 space-y-3">
          {vendasFiltradas.length === 0 && <div className="bg-white border rounded-2xl p-4 text-center text-gray-500">Nenhuma venda finalizada neste mês.</div>}
          {vendasFiltradas.map((v) => <VendaCard key={v.id} v={v} />)}
        </div>
      )}

      {activeTab === 'pendencias' && (
        <PendenciasTabV5
          vendas={vendasFiltradas}
          onReceberRestante={handleReceberRestante}
          onEdit={handleEdit}
          onCancel={handleCancelarVenda}
          onDelete={handleDelete}
        />
      )}

      {activeTab === 'entregas' && (
        <EntregasTabV5
          vendas={vendasFiltradas}
          onMarcarEntregue={handleMarcarEntregue}
          onEdit={handleEdit}
          onCancel={handleCancelarVenda}
          onDelete={handleDelete}
        />
      )}
    </div>
  );

  const ReportsView = () => (
    <div className="p-4 pb-28 max-w-xl mx-auto">
      <h2 className="text-2xl font-extrabold mb-4">Backup & Dados</h2>

      <div className="bg-white border rounded-2xl p-4 space-y-3">
        <button onClick={handleBackup} className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-extrabold shadow-sm">
          ☁️ Fazer Backup
        </button>

        <label className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 py-3 rounded-2xl flex justify-center cursor-pointer font-extrabold">
          📥 Restaurar Backup
          <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
        </label>

        <p className="text-xs text-center text-gray-500">Versão: v5.0 (offline-first)</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-safe">
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-30 font-extrabold flex justify-between shadow-md">
        <span>Controle Vendas</span>
        <span className="text-xs bg-blue-700 px-2 rounded pt-1 font-mono">v5.0</span>
      </header>

      <main className="max-w-xl mx-auto">
        {view === 'dashboard' && <DashboardView />}
        {view === 'add' && <FormView />}
        {view === 'reports' && <ReportsView />}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3 z-40 max-w-xl left-0 right-0 mx-auto pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => { setView('dashboard'); setActiveTab('vendas'); }} className={view === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}>
          <BarChart />
        </button>

        <button onClick={() => { limparForm(); setEditingId(null); setView('add'); }} className="bg-blue-600 text-white p-3 rounded-full -mt-8 shadow-lg active:scale-95 transition-transform">
          <Plus />
        </button>

        <button onClick={() => setView('reports')} className={view === 'reports' ? 'text-blue-600' : 'text-gray-400'}>
          <List />
        </button>
      </nav>
    </div>
  );
}