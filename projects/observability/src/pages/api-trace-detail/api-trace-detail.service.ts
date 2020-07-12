import { Injectable, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DateFormatMode, DateFormatter, ReplayObservable, TimeRange, TimeRangeService } from '@hypertrace/common';
import {
  AttributeMetadata,
  GraphQlTimeRange,
  MetadataService,
  SpecificationBuilder,
  Trace,
  TRACE_GQL_REQUEST,
  TraceGraphQlQueryHandlerService,
  traceIdKey,
  TraceType,
  traceTypeKey
} from '@hypertrace/distributed-tracing';
import { GraphQlRequestService } from '@hypertrace/graphql-client';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, shareReplay, switchMap, takeUntil } from 'rxjs/operators';
import { ObservabilityTraceType } from '../../shared/graphql/model/schema/observability-traces';

@Injectable()
export class ApiTraceDetailService implements OnDestroy {
  public static readonly TRACE_ID_PARAM_NAME: string = 'id';

  private readonly specificationBuilder: SpecificationBuilder = new SpecificationBuilder();

  private readonly traceId$: ReplayObservable<string>;
  private readonly destroyed$: Subject<void> = new Subject();

  public constructor(
    route: ActivatedRoute,
    private readonly timeRangeService: TimeRangeService,
    private readonly metadataService: MetadataService,
    private readonly graphQlQueryService: GraphQlRequestService
  ) {
    this.traceId$ = route.paramMap.pipe(
      map(paramMap => paramMap.get(ApiTraceDetailService.TRACE_ID_PARAM_NAME)!),
      takeUntil(this.destroyed$),
      shareReplay(1)
    );
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  protected getAttributes(): string[] {
    return ['serviceName', 'protocol', 'apiName', 'startTime', 'duration'];
  }

  public fetchTraceDetails(): Observable<ApiTraceDetails> {
    return combineLatest([this.timeRangeService.getTimeRangeAndChanges(), this.traceId$]).pipe(
      switchMap(([timeRange, traceId]) => this.getGqlResponse(traceId, timeRange)),
      switchMap(trace =>
        this.metadataService
          .getAttribute(trace[traceTypeKey], 'duration')
          .pipe(map(durationAttribute => this.constructTraceDetails(trace, durationAttribute)))
      ),
      takeUntil(this.destroyed$),
      shareReplay(1)
    );
  }

  protected constructTraceDetails(trace: Trace, durationAttribute: AttributeMetadata): ApiTraceDetails {
    return {
      id: trace[traceIdKey],
      type: ObservabilityTraceType.Api,
      timeString: this.buildTimeString(trace, durationAttribute.units),
      titleString: this.buildTitleString(trace)
    };
  }

  protected getGqlResponse(traceId: string, timeRange: TimeRange): Observable<Trace> {
    return this.graphQlQueryService.queryDebounced<TraceGraphQlQueryHandlerService, Trace>({
      requestType: TRACE_GQL_REQUEST,
      traceType: ObservabilityTraceType.Api,
      traceId: traceId,
      timeRange: new GraphQlTimeRange(timeRange.startTime, timeRange.endTime),
      traceProperties: this.getAttributes().map(key => this.specificationBuilder.attributeSpecificationForKey(key)),
      spanProperties: [],
      spanLimit: 1
    });
  }

  protected buildTimeString(trace: Trace, units: string): string {
    const formattedStartTime = new DateFormatter({ mode: DateFormatMode.DateAndTimeWithSeconds }).format(
      trace.startTime as number
    );

    return `${formattedStartTime} for ${trace.duration as string} ${units}`;
  }

  protected buildTitleString(trace: Trace): string {
    return `${trace.serviceName as string} ${trace.protocol as string} ${trace.apiName as string}`;
  }
}

export interface ApiTraceDetails {
  id: string;
  type: TraceType;
  timeString: string;
  titleString: string;
}
