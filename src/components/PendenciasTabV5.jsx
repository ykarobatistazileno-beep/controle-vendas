import React from 'react';
import { DollarSign, Edit, Trash2, XCircle } from 'lucide-react';

const formatBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PendenciasTabV5 = ({ vendas, onReceberRestante, onEdit, onCancel, onDelete }) => {
  const pendencias = (vendas || []).filter((v) => (Number(v.restante) || 0) > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-28">
      <div className="space-y-3">
        {pendencias.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm">
            Nenhuma pendência neste filtro.
          </div>
        )}

        {pendencias.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">
                    Pendente
                  </span>
                  <p className="font-extrabold text-slate-900 truncate">{v.cliente || 'Cliente'}</p>
                </div>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{v.produtos || ''}</p>
                {v.pendenciaMotivo && (
                  <p className="text-xs text-slate-500 mt-2">
                    Motivo: <span className="font-semibold text-slate-700">{v.pendenciaMotivo}</span>
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Falta</p>
                <p className="text-2xl font-extrabold text-amber-700">{formatBRL(v.restante)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Pago: <span className="font-semibold text-slate-700">{formatBRL(v.valorEntrada || 0)}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Total: <span className="font-semibold text-slate-700">{formatBRL(v.valor || 0)}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onReceberRestante?.(v)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-extrabold shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition"
              >
                <DollarSign size={18} />
                Receber restante
              </button>

              <button
                type="button"
                onClick={() => onEdit?.(v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition"
              >
                <Edit size={18} />
                Editar
              </button>

              <button
                type="button"
                onClick={() => onCancel?.(v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition"
              >
                <XCircle size={18} />
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => onDelete?.(v.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-extrabold shadow-sm hover:bg-rose-700 active:scale-[0.98] transition"
              >
                <Trash2 size={18} />
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
