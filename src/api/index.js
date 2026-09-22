const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const BACKEND_ORIGIN = API_BASE.startsWith('http') ? new URL(API_BASE).origin : '';

function resolvePaths(obj) {
  if (typeof obj === 'string') {
    return obj.startsWith('/uploads/') ? BACKEND_ORIGIN + obj : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(resolvePaths);
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      obj[key] = resolvePaths(obj[key]);
    }
    return obj;
  }
  return obj;
}

let serverOnline = true;
const serverListeners = new Set();

export const isServerOnline = () => serverOnline;

export const onServerStatusChange = (cb) => {
  serverListeners.add(cb);
  cb(serverOnline);
  return () => serverListeners.delete(cb);
};

let consecutiveFailures = 0;

export const checkServer = async () => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/shop-info`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      consecutiveFailures = 0;
      serverOnline = true;
    } else {
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        serverOnline = false;
      }
    }
  } catch {
    consecutiveFailures++;
    if (consecutiveFailures >= 3) {
      serverOnline = false;
    }
  }
  serverListeners.forEach(cb => cb(serverOnline));
  return serverOnline;
};

const headers = () => ({
  'Content-Type': 'application/json'
});

async function handleResponse(res) {
  if (!res.ok) {
    let msg = `Xatolik (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return resolvePaths(await res.json());
}

export const api = {
  getShopInfo: async () => {
    const res = await fetch(`${API_BASE}/shop-info`);
    return handleResponse(res);
  },

  getProducts: async () => {
    const res = await fetch(`${API_BASE}/products`);
    return handleResponse(res);
  },

  getProductByBarcode: async (barcode) => {
    const res = await fetch(`${API_BASE}/products/barcode/${barcode}`);
    return handleResponse(res);
  },

  getProductsByCode: async (code) => {
    const res = await fetch(`${API_BASE}/products/code/${code}`);
    return handleResponse(res);
  },

  searchProducts: async (query) => {
    const res = await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(query)}`);
    return handleResponse(res);
  },

  getProduct: async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`);
    return handleResponse(res);
  },

  createSale: async (data) => {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  getSales: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/sales?${query}`);
    return handleResponse(res);
  },

  getDailyStats: async () => {
    const res = await fetch(`${API_BASE}/stats/daily`);
    return handleResponse(res);
  },

  getMonthlyStats: async (month) => {
    const res = await fetch(`${API_BASE}/stats/monthly?month=${month}`);
    return handleResponse(res);
  },

  getNasiya: async () => {
    const res = await fetch(`${API_BASE}/nasiya`);
    return handleResponse(res);
  },

  getActiveNasiya: async () => {
    const res = await fetch(`${API_BASE}/nasiya/active`);
    return handleResponse(res);
  },

  createNasiya: async (data) => {
    const res = await fetch(`${API_BASE}/nasiya`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateNasiya: async (id, data) => {
    const res = await fetch(`${API_BASE}/nasiya/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteNasiya: async (id) => {
    const res = await fetch(`${API_BASE}/nasiya/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  payNasiya: async (id, data) => {
    const res = await fetch(`${API_BASE}/nasiya/${id}/pay`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  getNasiyaPayments: async (id) => {
    const res = await fetch(`${API_BASE}/nasiya/${id}/payments`);
    return handleResponse(res);
  },

  getNasiyaSales: async (id) => {
    const res = await fetch(`${API_BASE}/nasiya/${id}/sales`);
    return handleResponse(res);
  },

  addNasiyaSale: async (id, data) => {
    const res = await fetch(`${API_BASE}/nasiya/${id}/sale`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  getAdminSettings: async () => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: headers()
    });
    return handleResponse(res);
  },

  updateAdminSetting: async (key, value) => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ key, value })
    });
    return handleResponse(res);
  },

  getAdminStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: headers()
    });
    return handleResponse(res);
  },

  getLowStock: async () => {
    const res = await fetch(`${API_BASE}/admin/low-stock`, {
      headers: headers()
    });
    return handleResponse(res);
  },

  downloadBackup: async () => {
    const res = await fetch(`${API_BASE}/admin/backup`, {
      headers: headers()
    });
    if (!res.ok) throw new Error('Backup olishda xatolik');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  createProduct: async (data) => {
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateProduct: async (id, data) => {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteProduct: async (id) => {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  aiChat: async (message) => {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return handleResponse(res);
  },

  getAiHistory: async () => {
    const res = await fetch(`${API_BASE}/ai/history`);
    return handleResponse(res);
  },

  clearAiHistory: async () => {
    const res = await fetch(`${API_BASE}/ai/clear`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  bulkDelete: async (tables) => {
    const res = await fetch(`${API_BASE}/admin/bulk-delete`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ tables })
    });
    return handleResponse(res);
  },

  getArchive: async () => {
    const res = await fetch(`${API_BASE}/admin/archive`, {
      headers: headers()
    });
    return handleResponse(res);
  },

  getArchiveStats: async () => {
    const res = await fetch(`${API_BASE}/admin/archive/stats`, {
      headers: headers()
    });
    return handleResponse(res);
  },

  deleteArchiveItem: async (id) => {
    const res = await fetch(`${API_BASE}/admin/archive/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  restoreArchive: async (id) => {
    const res = await fetch(`${API_BASE}/admin/restore/${id}`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(res);
  },

  clearArchive: async () => {
    const res = await fetch(`${API_BASE}/admin/archive`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  getDistributions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/distributions?${query}`);
    return handleResponse(res);
  },

  getDistributionStats: async () => {
    const res = await fetch(`${API_BASE}/distributions/stats`);
    return handleResponse(res);
  },

  getDistributionClients: async () => {
    const res = await fetch(`${API_BASE}/distributions/clients`);
    return handleResponse(res);
  },

  createDistribution: async (data) => {
    const res = await fetch(`${API_BASE}/distributions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateDistribution: async (id, data) => {
    const res = await fetch(`${API_BASE}/distributions/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteDistribution: async (id) => {
    const res = await fetch(`${API_BASE}/distributions/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  clearDistributions: async () => {
    const res = await fetch(`${API_BASE}/distributions`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  uploadImage: async (base64, filename) => {
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ image: base64, filename })
    });
    return handleResponse(res);
  },

  archiveSales: async (ids) => {
    const res = await fetch(`${API_BASE}/admin/archive-sale`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids })
    });
    return handleResponse(res);
  },

  deleteSale: async (id) => {
    const res = await fetch(`${API_BASE}/admin/sales/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    return handleResponse(res);
  },

  autoArchive: async () => {
    const res = await fetch(`${API_BASE}/admin/auto-archive`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(res);
  },

  cleanAll: async () => {
    const res = await fetch(`${API_BASE}/admin/clean-all`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(res);
  },

  cleanDaily: async () => {
    const res = await fetch(`${API_BASE}/admin/clean-daily`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(res);
  },

  archiveDailySale: async (ids) => {
    const res = await fetch(`${API_BASE}/admin/archive-daily-sale`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids })
    });
    return handleResponse(res);
  },

  cleanMonthly: async () => {
    const res = await fetch(`${API_BASE}/admin/clean-monthly`, {
      method: 'POST',
      headers: headers()
    });
    return handleResponse(res);
  },

  getKassaShifts: async () => {
    const res = await fetch(`${API_BASE}/kassa`);
    return handleResponse(res);
  },

  getCurrentKassa: async () => {
    const res = await fetch(`${API_BASE}/kassa/current`);
    return handleResponse(res);
  },

  openKassa: async (data) => {
    const res = await fetch(`${API_BASE}/kassa/open`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  closeKassa: async (data) => {
    const res = await fetch(`${API_BASE}/kassa/close`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  }
};
