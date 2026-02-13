import React, { useMemo } from 'react';

// Form separado do App para evitar remontagem a cada digitação (bug de perder foco)
// e para permitir uma barra de ações fixa premium (botão confirmar nunca escondido).

export function FormViewV5({
  editingId,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  onTipoEntregaChange,
  descontoOptions,
  pagamentoOptions,
  motivoPendenciaOptions,
  formatBRL,
  toMoney,
}) {
  const valorSeguro = Number(formData.valor) || 0;
  const entradaValor = toMoney(formData.valorEntrada);
  const entradaSegura = Number.isNaN(entradaValor) ? valorSeguro : entradaValor;
  const faltaPagar = Math.max(0, valorSeguro - entradaSegura);

  const comissaoEstimada = useMemo(() => {
    const p = Number(formData.percentual) || 0;
    return valorSeguro * (p / 100);
  }, [valorSeguro, formData.percentual]);

  const update = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  return (
    <div className="py-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b bg-gradient-to-b from-slate-50 to-white">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {editingId ? 'Editar Venda' : 'Nova Venda'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Preencha os dados com segurança. O botão confirmar fica sempre visível.</p>
          </div>

          {/* Conteúdo do formulário: padding bottom grande para não ficar atrás da action bar fixa */}
          <form id="saleForm" onSubmit={onSubmit} className="p-5 sm:p-6 space-y-5 pb-48">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Data</label>
                <input
                  type="date"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={formData.data}
                  onChange={(e) => update({ data: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Cliente</label>
                <input
                  type="text"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Nome do cliente"
                  value={formData.cliente}
                  onChange={(e) => update({ cliente: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Produtos / Descrição</label>
              <textarea
                className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                rows={3}
                placeholder="Ex: Colchão Queen + box..."
                value={formData.produtos}
                onChange={(e) => update({ produtos: e.target.value })}
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Valor vendido</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.valor}
                    onChange={(e) => update({ valor: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Entrada</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.valorEntrada}
                    onChange={(e) => update({ valorEntrada: e.target.value })}
                    placeholder="Igual total"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Valor de tabela</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.valorTabela}
                    onChange={(e) => update({ valorTabela: e.target.value })}
                    placeholder="Referência"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Desconto aplicado</label>
                  <select
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.descontoAplicado}
                    onChange={(e) => update({ descontoAplicado: e.target.value })}
                  >
                    {descontoOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {faltaPagar > 0 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-sm font-bold flex justify-between">
                  <span>Pendência</span>
                  <span>{formatBRL(faltaPagar)}</span>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-sm font-bold">
                  Totalmente pago ✅
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Comissão</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[3, 4, 5, 6].map((n) => {
                    const selected = String(formData.percentual) === String(n);
                    return (
                      <button
                        type="button"
                        key={n}
                        onClick={() => update({ percentual: String(n) })}
                        className={
                          "h-11 rounded-xl border text-sm font-extrabold transition " +
                          (selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')
                        }
                      >
                        {n}%
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Pagamento</label>
                <select
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={formData.pagamentoDetalhe}
                  onChange={(e) => update({ pagamentoDetalhe: e.target.value })}
                >
                  {pagamentoOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {faltaPagar > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Motivo da pendência</label>
                  <select
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.motivoPendencia}
                    onChange={(e) => update({ motivoPendencia: e.target.value })}
                  >
                    {motivoPendenciaOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.motivoPendencia === 'outro' && (
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Descreva o motivo..."
                    value={formData.textoMotivo}
                    onChange={(e) => update({ textoMotivo: e.target.value })}
                  />
                )}
                <div>
                  <label className="text-xs font-bold text-slate-700">Previsão de pagamento</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.previsaoPagamento}
                    onChange={(e) => update({ previsaoPagamento: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Entrega</label>
                <select
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={formData.tipoEntrega}
                  onChange={(e) => onTipoEntregaChange(e.target.value)}
                >
                  <option value="Imediata">📦 Imediata</option>
                  <option value="Agendada">📅 Agendada</option>
                  <option value="Futura">🏭 Futura (produção)</option>
                </select>
              </div>

              {formData.tipoEntrega === 'Agendada' && (
                <div>
                  <label className="text-xs font-bold text-slate-700">Data da entrega</label>
                  <input
                    type="date"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.dataEntrega}
                    onChange={(e) => update({ dataEntrega: e.target.value })}
                    required
                  />
                </div>
              )}

              {formData.tipoEntrega === 'Futura' && (
                <div>
                  <label className="text-xs font-bold text-slate-700">Motivo (produção / espera)</label>
                  <input
                    type="text"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={formData.motivoEntrega}
                    onChange={(e) => update({ motivoEntrega: e.target.value })}
                    placeholder="Ex: Produção na fábrica / Cliente aguardando obra"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500">Comissão prevista</div>
                <div className="text-2xl font-extrabold text-emerald-700">{formatBRL(comissaoEstimada)}</div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Action Bar fixa premium */}
      <div className="fixed left-0 right-0 bottom-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-2xl rounded-2xl mb-4 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="sm:w-48 h-12 rounded-xl border border-slate-200 bg-white font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="saleForm"
                className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-extrabold text-base shadow-lg hover:bg-blue-700 active:scale-[0.99] transition"
              >
                {editingId ? 'Salvar alterações' : 'Confirmar venda'}
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex justify-between">
              <span>Total: <span className="font-semibold text-slate-700">{formatBRL(valorSeguro)}</span></span>
              <span>Restante: <span className="font-semibold text-slate-700">{formatBRL(Math.max(0, faltaPagar))}</span></span>
            </div>
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-transparent" />
      </div>
    </div>
  );
}
