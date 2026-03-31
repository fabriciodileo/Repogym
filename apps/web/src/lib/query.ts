export const buildQueryString = (params: Record<string, string | number | boolean | undefined | null>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const openProxyCsv = (path: string) => {
  window.open(`/api/proxy/${path}`, '_blank', 'noopener,noreferrer');
};
