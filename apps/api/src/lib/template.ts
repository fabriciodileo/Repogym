export const renderTemplate = (template: string, context?: Record<string, unknown>) =>
  template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const value = key.split('.').reduce((current: unknown, segment: string) => {
      if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
        return (current as Record<string, unknown>)[segment];
      }

      return undefined;
    }, context ?? {});

    return value === null || value === undefined ? '' : String(value);
  });
