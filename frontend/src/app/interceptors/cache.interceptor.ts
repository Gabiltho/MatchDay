import { HttpInterceptorFn } from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { HttpEvent } from '@angular/common/http';

const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);

  const key = req.urlWithParams;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const obs = next(req).pipe(
    finalize(() => inFlight.delete(key))
  );
  inFlight.set(key, obs);
  return obs;
};