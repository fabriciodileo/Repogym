export const normalizePageParams = (page?: number, pageSize?: number) => {
  const safePage = Math.max(page ?? 1, 1);
  const safePageSize = Math.min(Math.max(pageSize ?? 20, 1), 100);

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
};
