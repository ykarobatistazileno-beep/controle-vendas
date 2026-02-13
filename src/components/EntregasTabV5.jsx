import React from 'react';
import { PackageCheck, Edit, Trash2, XCircle, CalendarClock } from 'lucide-react';

const formatBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const urgencyStyle = (dias) => {
  if (dias < 0) return "bg-rose-50 border-rose-200 text-rose-700";
  if (dias <= 3) return "bg-amber-50 border-amber-200 text-amber-800";
  return "bg-emerald-50 border-emerald-200 text-emerald-700";
};

export const EntregasTabV5 = ({ vendas, onMarcarEntregue, onEdit, onCancel, onDelete }) => {
  const entregas = (vendas || []).filter((v) => v.entregaFutura === true || v.dataEntrega);

  const hoje = new Date();
  const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-28">
      <div className="space-y-3">
        {entregas.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm">
            Nenhuma entrega futura neste filtro.
          </div>
        )}

        {entregas.map((v) => {
          const d = parseDate(v.dataEntrega);
          const dias = d ? Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const urgency = dias === null ? "bg-slate-50 border-slate-200 text-slate-700" : urgencyStyle(dias);

          return (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold">
                      Entrega
                    </span>
                    <p className="font-extrabold text-slate-900 truncate">{v.cliente || 'Cliente'}</p>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{v.produtos || ''}</p>

                  {(v.entregaMotivo || v.entregaObs) && (
                    <p className="text-xs text-slate-500 mt-2">
                      Motivo: <span className="font-semibold text-slate-700">{v.entregaMotivo || '—'}</span>
                      {v.entregaObs ? <span className="text-slate-500"> • {v.entregaObs}</span> : null}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className={"inline-flex items-center gap-2 rounded-2xl border px-3 py-2 " + urgency}>
                    <CalendarClock size={16} />
                    <span className="text-xs font-bold">
                      {d ? `Entrega: ${d.toLocaleDateString('pt-BR')}` : 'Entrega futura'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Valor: <span className="font-semibold text-slate-700">{formatBRL(v.valor || 0)}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onMarcarEntregue?.(v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-extrabold shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition"
                >
                  <PackageCheck size={18} />
                  Marcar entregue
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
          );
        })}
      </div>
    </div>
  );
};
