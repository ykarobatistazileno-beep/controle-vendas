import { openDB } from 'idb';

const DB_NAME = 'vendas-db';
const STORE_NAME = 'vendas';
const DB_VERSION = 4; // bump to support migration markers (indexes remain compatible)

/**
 * IndexedDB init (idempotent)
 */
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      } else {
        store = transaction.objectStore(STORE_NAME);
      }

      // Indices (idempotent)
      const indices = [
        'data',
        'cliente',
        'statusPagamento',
        'tipoEntrega',
        'dataEntrega',
        'status',
        'pagamentoDetalhe',
      ];

      indices.forEach((idx) => {
        if (!store.indexNames.contains(idx)) store.createIndex(idx, idx);
      });
    },
  });
};

// CRUD
export const addVenda = async (venda) => {
  const db = await initDB();
  return db.add(STORE_NAME, venda);
};

export const getVendas = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const deleteVenda = async (id) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};

export const updateVenda = async (venda) => {
  const db = await initDB();
  return db.put(STORE_NAME, venda);
};

// Batch insert (single transaction) for restore/migration
export const addVendasBatch = async (vendas) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  for (const v of vendas) {
    store.add(v);
  }

  await tx.done;
};

// Replace-all helper (used by migration) - atomic transaction
export const putVendasBatch = async (vendas) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  try {
    // No IndexedDB, operações dentro da mesma transação são atómicas.
    // Se houver erro no loop, o clear() também sofre rollback.
    await store.clear();
    for (const v of vendas) {
      // Removemos o ID para garantir que o autoIncrement não conflite se necessário, 
      // ou mantemos se for uma migração de preservação de ID.
      await store.put(v);
    }
    await tx.done;
  } catch (error) {
    console.error("Erro no batch update, a transação será revertida:", error);
    tx.abort();
    throw error;
  }
};