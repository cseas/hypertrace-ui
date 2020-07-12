import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReplayObservable } from '@hypertrace/common';
import { NavigableDashboardFilterConfig } from '@hypertrace/distributed-tracing';
import { map } from 'rxjs/operators';
import { ObservabilityTraceType } from '../../../../shared/graphql/model/schema/observability-traces';
import { BackendDetailService } from '../backend-detail.service';
import { backendMetricsDashboard } from './backend-metrics.dashboard';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <htc-navigable-dashboard
      *htcLoadAsync="this.filterConfig$ as filterConfig"
      class="dashboard-content"
      navLocation="${backendMetricsDashboard.location}"
      [filterConfig]="filterConfig"
    >
    </htc-navigable-dashboard>
  `
})
export class BackendMetricsComponent {
  public readonly filterConfig$: ReplayObservable<NavigableDashboardFilterConfig>;
  public constructor(backendDetailService: BackendDetailService) {
    this.filterConfig$ = backendDetailService.entityFilter$.pipe(
      map(filter => ({
        scope: ObservabilityTraceType.Backend,
        implicitFilters: [filter],
        hideFilterBar: true
      }))
    );
  }
}
