import React from 'react';

const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const daysDiff = (iso) => {
  const d = new Date(iso + 'T00:00:00').getTime();
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export const EntregasTabV5 = ({ vendas, onMarcarEntregue, onEdit, onCancel, onDelete }) => {
  return (
    <div className="p-4 pb-24 space-y-3">
      {(!vendas || vendas.length === 0) && (
        <div className="bg-white border rounded-2xl p-4 text-center text-gray-500">Nenhuma entrega futura</div>
      )}

      {vendas?.map((v) => {
        const label = v.tipoEntrega === 'Agendada' && v.dataEntrega ? `📅 ${new Date(v.dataEntrega + 'T00:00:00').toLocaleDateString('pt-BR')}` : '🏭 Produção / Futura';
        const d = (v.tipoEntrega === 'Agendada' && v.dataEntrega) ? daysDiff(v.dataEntrega) : null;
        const urgency = d !== null ? (d < 0 ? 'border-red-400 bg-red-50' : d <= 7 ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50') : 'border-blue-200 bg-blue-50';

        return (
          <div key={v.id} className={`border rounded-2xl p-4 bg-white`}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-extrabold text-gray-900 truncate">{v.cliente}</div>
                <div className="text-xs text-gray-500 whitespace-pre-line">{v.produtos}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{v.data}</div>
                <div className="font-extrabold">{formatBRL(v.valor)}</div>
              </div>
            </div>

            <div className={`mt-3 ${urgency} border rounded-xl p-3 text-sm`}>
              <div className="flex justify-between">
                <span className="font-bold">{label}</span>
                {d !== null && <span className="text-xs font-bold">{d < 0 ? `Atrasada ${Math.abs(d)}d` : `${d}d`}</span>}
              </div>
              {v.motivoEntrega && <div className="text-xs text-gray-700 mt-1">Motivo: {v.motivoEntrega}</div>}
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => onMarcarEntregue?.(v)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold">Marcar entregue</button>
              <button onClick={() => onEdit?.(v)} className="px-3 py-2 rounded-xl border bg-white font-bold">Editar</button>
              <button onClick={() => onCancel?.(v)} className="px-3 py-2 rounded-xl border bg-white font-bold text-orange-600">Cancelar</button>
              <button onClick={() => onDelete?.(v.id)} className="px-3 py-2 rounded-xl border bg-white font-bold text-red-600">Apagar</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};