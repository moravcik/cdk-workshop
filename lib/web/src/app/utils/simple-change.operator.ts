import { SimpleChange } from '@angular/core';
import { Observable } from 'rxjs';
import { scan } from 'rxjs/operators';

export function simpleChange() {
  return (source: Observable<any>): Observable<SimpleChange> => {
    return source.pipe(
      scan((lastChange: any, val) => new SimpleChange(
        lastChange?.currentValue,
        val,
        !lastChange?.currentValue
      ), null)
    ) as Observable<SimpleChange>;
  }
}
