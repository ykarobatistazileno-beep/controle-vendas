import { getVendas, putVendasBatch } from '../db';

// Local storage keys
const LS_SCHEMA_KEY = 'vendas_schema_version';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

const toFiniteNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const normalizarPagamentoDetalhe = (str) => {
  const s = String(str || '').toLowerCase();

  if (s.includes('pix') && s.includes('qr')) return 'Pix • QR Code';
  if (s.includes('pix') && s.includes('cnpj')) return 'Pix • CNPJ';
  if (s.includes('deb')) return 'Débito';
  if (s.includes('din')) return 'Dinheiro';

  // Crédito (1x-12x)
  const m = s.match(/(\d+)\s*x/);
  if (s.includes('cred') || s.includes('créd') || s.includes('cart')) {
    const parcelas = m ? Math.min(12, Math.max(1, Number(m[1]))) : 1;
    return `Crédito (${parcelas}x)`;
  }

  // Default seguro
  return 'Pix • QR Code';
};

const normalizarDescontoAplicado = (str) => {
  const s = String(str || '').toLowerCase().trim();
  if (!s) return 'Sem desconto';
  if (s.includes('sem')) return 'Sem desconto';
  if (s.includes('tabela')) return 'Preço de tabela';
  if (s.includes('acima')) return 'Acima da tabela';
  if (s.includes('10')) return '10%';
  if (s.includes('15')) return '15%';
  return 'Sem desconto';
};

const normalizarTipoEntrega = (tipo, dataEntrega) => {
  const t = String(tipo || 'Imediata');
  if (t === 'Agendada') {
    if (isIsoDate(dataEntrega)) return { tipoEntrega: 'Agendada', dataEntrega };
    return { tipoEntrega: 'Futura', dataEntrega: '' };
  }
  if (t === 'Futura') return { tipoEntrega: 'Futura', dataEntrega: '' };
  return { tipoEntrega: 'Imediata', dataEntrega: '' };
};

const normalizarVenda = (item) => {
  // Critical fields
  const data = isIsoDate(item.data) ? item.data : null;
  const cliente = typeof item.cliente === 'string' ? item.cliente.trim() : '';
  const valor = toFiniteNumber(item.valor);

  if (!data || !cliente || !Number.isFinite(valor) || valor <= 0) return null;

  let valorEntrada = toFiniteNumber(item.valorEntrada);
  if (!Number.isFinite(valorEntrada) || valorEntrada < 0) valorEntrada = valor;
  if (valorEntrada > valor) valorEntrada = valor;

  const restante = round2(valor - valorEntrada);

  let percentual = toFiniteNumber(item.percentual);
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) percentual = 5;

  const comissao = round2(valor * (percentual / 100));

  // statusPagamento
  let statusPagamento = 'Pago';
  if (restante > 0) statusPagamento = 'Pendente';
  if (restante === valor) statusPagamento = 'Totalmente Pendente';

  // pagoEm coherence
  let pagoEm = item.pagoEm || null;
  if (restante > 0) pagoEm = null;

  const criadoEm = item.criadoEm || new Date().toISOString();
  const atualizadoEm = item.atualizadoEm || new Date().toISOString();

  // delivery
  const { tipoEntrega, dataEntrega } = normalizarTipoEntrega(item.tipoEntrega, item.dataEntrega);

  // v5 fields
  const valorTabelaRaw = toFiniteNumber(item.valorTabela);
  const valorTabela = Number.isFinite(valorTabelaRaw) && valorTabelaRaw > 0 ? valorTabelaRaw : valor;

  const descontoAplicado = normalizarDescontoAplicado(item.descontoAplicado);
  const pagamentoDetalhe = normalizarPagamentoDetalhe(item.pagamentoDetalhe || item.pagamento);

  const status = item.status === 'Cancelada' ? 'Cancelada' : 'Ativa';
  const motivoCancelamento = status === 'Cancelada' ? String(item.motivoCancelamento || '').trim() : '';
  const dataCancelamento = status === 'Cancelada' && isIsoDate(item.dataCancelamento) ? item.dataCancelamento : null;

  const motivoPendencia = restante > 0 ? String(item.motivoPendencia || 'aguardando_cartao') : null;
  const textoMotivo = restante > 0 ? String(item.textoMotivo || '').trim() : '';
  const previsaoPagamento = restante > 0 && isIsoDate(item.previsaoPagamento) ? item.previsaoPagamento : '';

  const motivoEntrega = (tipoEntrega === 'Futura') ? String(item.motivoEntrega || '').trim() : '';

  return {
    // core
    id: item.id, // keep id if exists; put will preserve
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

    tipoEntrega,
    dataEntrega,

    // new tracking
    valorTabela,
    descontoAplicado,

    // pendency extra
    motivoPendencia,
    textoMotivo,
    previsaoPagamento,

    // delivery extra
    motivoEntrega,

    // lifecycle
    status,
    motivoCancelamento,
    dataCancelamento,
    criadoEm,
    atualizadoEm,
  };
};

export const verificarMigracao = async () => {
  const current = Number(localStorage.getItem(LS_SCHEMA_KEY) || '0');
  if (current >= 5) return;

  const vendas = await getVendas();
  const normalizadas = [];
  let ignoradas = 0;

  for (const v of vendas) {
    try {
      const nv = normalizarVenda(v);
      if (nv) normalizadas.push(nv);
      else ignoradas++;
    } catch (e) {
      console.error("Erro ao normalizar venda ID:", v.id, e);
      ignoradas++;
    }
  }

  // Only write if something changes (or if current < 5)
  await putVendasBatch(normalizadas);

  localStorage.setItem(LS_SCHEMA_KEY, '5');
  console.info(`✅ Migração v5 aplicada. Registros: ${normalizadas.length}, Ignorados: ${ignoradas}`);
};