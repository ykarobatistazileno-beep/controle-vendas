import React from 'react';

const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const motivoLabel = (m) => {
  switch (m) {
    case 'aguardando_cartao': return '💳 Aguardando cartão virar';
    case 'pagamento_cliente': return '👤 Aguardando cliente';
    case 'parcelado': return '📅 Pagamento parcelado';
    case 'aprovacao': return '✅ Aguardando aprovação';
    case 'outro': return '🔹 Outro';
    default: return '⏳ Pendência';
  }
};

export const PendenciasTabV5 = ({ vendas, onReceberRestante, onEdit, onCancel, onDelete }) => {
  return (
    <div className="p-4 pb-24 space-y-3">
      {(!vendas || vendas.length === 0) && (
        <div className="bg-white border rounded-2xl p-4 text-center text-gray-500">Nenhuma pendência 🎉</div>
      )}

      {vendas?.map((v) => {
        const pct = (Number.isFinite(v.valor) && v.valor > 0 && Number.isFinite(v.valorEntrada)) ? Math.min(100, Math.max(0, (v.valorEntrada / v.valor) * 100)) : 0;
        return (
          <div key={v.id} className="bg-white border rounded-2xl p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-extrabold text-gray-900 truncate">{v.cliente}</div>
                <div className="text-xs text-gray-500 whitespace-pre-line">{v.produtos}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{v.data}</div>
                <div className="font-extrabold text-orange-600">{formatBRL(v.restante)}</div>
              </div>
            </div>

            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="flex justify-between text-sm">
                <span>Entrada: <b>{formatBRL(v.valorEntrada)}</b></span>
                <span>Total: <b>{formatBRL(v.valor)}</b></span>
              </div>
              <div className="mt-2 w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 h-2" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs text-gray-700">
                {motivoLabel(v.motivoPendencia)}{v.textoMotivo ? ` • ${v.textoMotivo}` : ''}
                {v.previsaoPagamento ? ` • Prev.: ${new Date(v.previsaoPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => onReceberRestante?.(v)} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold">Receber</button>
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