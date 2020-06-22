import { BehaviorSubject, Subject, combineLatest, Observable, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { useObservable } from 'react-use';


export class ObservableSet<T> extends Set<T> {
  public add$: Subject<T>;
  public delete$: Subject<T>;

  constructor(values?: T[]) {
    super(values);
    this.add$ = new Subject();
    this.delete$ = new Subject();
  }

  add(value: T) {
    if (!this.has(value)) {
      this.add$.next(value);
    }
    super.add(value);
    return this;
  }

  delete(value: T) {
    this.delete$.next(value);
    return super.delete(value);
  }

  get list$(): Observable<T[]> {
    return merge(this.add$, this.delete$).pipe(map((latest) => {
      return Array.from(this);
    }))
  }
}

export function useObservableSet<T>(observableSet: ObservableSet<T>) {
  return useObservable<T[]>(
    observableSet.list$,
    Array.from(observableSet),
  );
}