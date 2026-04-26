export type RouteClass = 'streaming' | 'interactive' | 'background';
export type RateLimitMode = 'sync' | 'async';

export function getRateLimitMode(routeClass: RouteClass): RateLimitMode {
  if (routeClass === 'streaming') return 'async';
  return 'sync';
}
