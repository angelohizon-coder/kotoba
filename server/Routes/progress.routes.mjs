// Wire these descriptors into Express (or another HTTP framework) when hosting a backend.
// No HTTP listener, database driver, endpoint URL or credentials ship with the browser app.
export function progressRoutes(controller) {
  return [
    { method: 'GET', path: '/v1/progress', authenticated: true, handler: controller.read },
    { method: 'PUT', path: '/v1/progress', authenticated: true, handler: controller.commit },
  ];
}
