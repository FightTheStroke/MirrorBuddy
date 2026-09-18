import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { authorizeMindmap, withMindmapErrors } from '@/lib/mindmap/http';
import { initializeMindmap, modifyMindmap, readMindmap } from '@/lib/mindmap/service';

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/tools/mindmap'),
  withMindmapErrors,
)(async ({ req }) => {
  const access = await authorizeMindmap(req);
  const snapshot = await readMindmap(
    access.owner,
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
});

export const POST = pipe(
  withSentry('/api/tools/mindmap'),
  withCSRF,
  withMindmapErrors,
)(async ({ req }) => {
  const access = await authorizeMindmap(req);
  const snapshot = await initializeMindmap(access.owner, await req.json());
  return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
});

export const PATCH = pipe(
  withSentry('/api/tools/mindmap'),
  withCSRF,
  withMindmapErrors,
)(async ({ req }) => {
  const access = await authorizeMindmap(req);
  return Response.json(await modifyMindmap(access.owner, await req.json()));
});
