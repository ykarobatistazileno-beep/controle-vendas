const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const monthKey = (isoDate) => String(isoDate || '').slice(0, 7); // YYYY-MM

const parseDescontoValor = (venda) => {
  const vt = Number(venda.valorTabela);
  const vv = Number(venda.valor);
  if (Number.isFinite(vt) && vt > 0 && Number.isFinite(vv) && vv > 0) {
    // positive when sold below table
    return round2(Math.max(0, vt - vv));
  }
  return 0;
};

export const useSalesMetricsV5 = (vendas, activeMonth) => {
  const month = activeMonth || new Date().toISOString().slice(0, 7);

  const ativas = (vendas || []).filter((v) => v && v.status !== 'Cancelada' && monthKey(v.data) === month);

  const vendidoMes = round2(ativas.reduce((acc, v) => acc + (Number(v.valor) || 0), 0));
  const recebidoMes = round2(ativas.reduce((acc, v) => acc + (Number(v.valorEntrada) || 0), 0));
  const pendenteMes = round2(ativas.reduce((acc, v) => acc + (Number(v.restante) || 0), 0));

  const comissaoMes = round2(ativas.reduce((acc, v) => acc + (Number(v.comissao) || 0), 0));

  const descontosMes = round2(ativas.reduce((acc, v) => acc + parseDescontoValor(v), 0));

  const contagem = {
    total: ativas.length,
    pagas: ativas.filter((v) => (Number(v.restante) || 0) === 0).length,
    pendencias: ativas.filter((v) => (Number(v.restante) || 0) > 0).length,
    entregas: ativas.filter((v) => {
      if (v.tipoEntrega === 'Futura') return true;
      if (v.tipoEntrega === 'Agendada' && v.dataEntrega) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataEnt = new Date(v.dataEntrega + 'T00:00:00');
        return dataEnt >= hoje;
      }
      return false;
    }).length,
  };

  const comissoesPorPerc = ativas.reduce((acc, v) => {
    const p = String(v.percentual ?? '');
    const val = Number(v.comissao) || 0;
    if (!acc[p]) acc[p] = 0;
    acc[p] = round2(acc[p] + val);
    return acc;
  }, {});

  return {
    month,
    vendidoMes,
    recebidoMes,
    pendenteMes,
    descontosMes,
    comissaoMes,
    contagem,
    comissoesPorPerc,
  };
};