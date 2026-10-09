// Framework-neutral controllers: the future auth middleware supplies subjectId.
export function createProgressController(service) {
  const authorized = context => typeof context?.subjectId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(context.subjectId);
  return {
    async read(context) {
      if (!authorized(context)) return { statusCode: 401, body: { error: true, message: 'Sign in to access synced progress.' } };
      try { return { statusCode: 200, body: await service.read(context.subjectId) }; }
      catch { return { statusCode: 503, body: { error: true, message: 'Progress storage is unavailable.' } }; }
    },
    async commit(context, body) {
      if (!authorized(context)) return { statusCode: 401, body: { error: true, message: 'Sign in to access synced progress.' } };
      const result = await service.commit(context.subjectId, body);
      const statusCode = { committed: 200, conflict: 409, invalid: 422, unavailable: 503 }[result.status] || 503;
      return { statusCode, body: result };
    },
  };
}
