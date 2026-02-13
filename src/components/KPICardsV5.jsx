import React from 'react';
import { TrendingUp, Wallet, Tag, Target } from 'lucide-react';

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const KPICardsV5 = ({ metricas, goal, onChangeGoal, onPrevMonth, onNextMonth, monthLabel }) => {
  const vendido = metricas?.vendidoMes ?? 0;
  const pendencias = metricas?.pendenciasValor ?? 0;
  const comissao = metricas?.comissaoMes ?? 0;
  const descontos = metricas?.descontosMes ?? 0;
  const qtd = metricas?.contagemMes ?? 0;

  const meta = Number(goal) || 0;
  const falta = meta > 0 ? Math.max(0, meta - vendido) : 0;
  const percent = meta > 0 ? Math.min(100, (vendido / meta) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Navegação de mês (opcional) */}
      {(onPrevMonth || onNextMonth || monthLabel) && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mês</p>
            <p className="text-lg font-bold text-slate-900">{monthLabel || 'Atual'}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrevMonth}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition"
            >
              ←
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition"
            >
              →
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendido */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vendido no mês</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{formatBRL(vendido)}</p>
            <p className="text-xs text-slate-500 mt-2">{qtd} venda(s)</p>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Falta para meta</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{formatBRL(falta)}</p>

            <div className="mt-3">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Progresso</span>
                <span className="text-xs font-semibold text-slate-700">{percent.toFixed(0)}%</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-500">Meta do mês</label>
              <input
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                inputMode="numeric"
                value={meta ? String(meta) : ''}
                onChange={(e) => onChangeGoal?.(e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>
        </div>

        {/* Comissão */}
        <div className="rounded-2xl shadow-sm border border-indigo-700/20 p-6 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Comissão do mês</p>
            <p className="text-3xl font-extrabold mt-1">{formatBRL(comissao)}</p>
            <p className="text-xs text-white/80 mt-2">Estimativa</p>
          </div>
        </div>

        {/* Descontos + Pendências */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Tag className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descontos no mês</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatBRL(descontos)}</p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Valor em pendências</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatBRL(pendencias)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
