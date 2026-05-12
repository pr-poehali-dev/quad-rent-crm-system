const BASE = 'https://functions.poehali.dev/5d75bdb9-edda-4422-995f-ba98d98b5d7c';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function request(resource: string, method = 'GET', body?: object, params?: Record<string, string>, retries = 3): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const url = new URL(BASE);
  url.searchParams.set('resource', resource);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await withTimeout(fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), 30000);

    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return request(resource, method, body, params, retries - 1);
    }
    throw e;
  }
}

export const api = {
  dashboard: () => request('dashboard'),

  quads: {
    list: () => request('quads'),
    create: (data: object) => request('quads', 'POST', data),
    update: (id: number, data: object) => request('quads', 'PUT', data, { id: String(id) }),
    remove: (id: number) => request('quads', 'DELETE', undefined, { id: String(id) }),
  },

  clients: {
    list: (search?: string) => request('clients', 'GET', undefined, search ? { search } : undefined),
    create: (data: object) => request('clients', 'POST', data),
    update: (id: number, data: object) => request('clients', 'PUT', data, { id: String(id) }),
    remove: (id: number) => request('clients', 'DELETE', undefined, { id: String(id) }),
  },

  bookings: {
    list: (params?: Record<string, string>) => request('bookings', 'GET', undefined, params),
    create: (data: object) => request('bookings', 'POST', data),
    update: (id: number, data: object) => request('bookings', 'PUT', data, { id: String(id) }),
    remove: (id: number) => request('bookings', 'DELETE', undefined, { id: String(id) }),
  },

  transactions: {
    list: (params?: Record<string, string>) => request('transactions', 'GET', undefined, params),
    create: (data: object) => request('transactions', 'POST', data),
    remove: (id: number) => request('transactions', 'DELETE', undefined, { id: String(id) }),
  },

  daily_reports: {
    list: () => request('daily_reports'),
    get: (id: number) => request('daily_reports', 'GET', undefined, { id: String(id) }),
    create: (data: object) => request('daily_reports', 'POST', data),
    remove: (id: number) => request('daily_reports', 'DELETE', undefined, { id: String(id) }),
  },

  employees: {
    list: () => request('employees'),
    create: (data: object) => request('employees', 'POST', data),
    update: (id: number, data: object) => request('employees', 'PUT', data, { id: String(id) }),
    remove: (id: number) => request('employees', 'DELETE', undefined, { id: String(id) }),
  },

  reports: () => request('reports'),
};
