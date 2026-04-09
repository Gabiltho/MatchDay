import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(err => {
      console.error(`[HTTP ${err.status}] ${req.method} ${req.url}`, err.message);
      return throwError(() => err);
    })
  );
};