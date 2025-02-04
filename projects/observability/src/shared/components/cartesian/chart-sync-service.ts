import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Band, CartesianSelectedData, Series } from '../../../public-api';
import { MouseLocationData } from '../utils/mouse-tracking/mouse-tracking';
import { CartesianChartComponent } from './cartesian-chart.component';

@Injectable({ providedIn: 'root' })
export class ChartSyncService<TData> {
  private readonly locationChangeSubject: Subject<ChartHoverData<TData>> = new Subject();
  private readonly mouseLeaveSubject: Subject<ChartMouseLeaveData<TData>> = new Subject();

  public mouseLocationChange(
    data: MouseLocationData<TData, Series<TData> | Band<TData>>[] | CartesianSelectedData<TData>,
    groupId?: string,
    chartId?: CartesianChartComponent<TData>
  ): void {
    this.locationChangeSubject.next({
      groupId: groupId,
      locationData: data as MouseLocationData<TData, Series<TData> | Band<TData>>[],
      chartId: chartId
    });
  }

  public mouseLeave(groupId?: string, chartId?: CartesianChartComponent<TData>): void {
    this.mouseLeaveSubject.next({
      groupId: groupId,
      chartId: chartId
    });
  }

  public getLocationChangesForGroup(
    groupId: string,
    chartId: CartesianChartComponent<TData>
  ): Observable<MouseLocationData<TData, Series<TData> | Band<TData>>[]> {
    return this.locationChangeSubject.pipe(
      filter(data => data.chartId !== chartId && data.groupId === groupId),
      map(data => data.locationData)
    );
  }

  public getMouseLeave(
    groupId: string,
    chartId: CartesianChartComponent<TData>
  ): Observable<ChartMouseLeaveData<TData>> {
    return this.mouseLeaveSubject.pipe(
      filter(data => data.chartId !== chartId && data.groupId === groupId),
      map(data => data)
    );
  }
}

interface ChartHoverData<TData> {
  groupId?: string;
  locationData: MouseLocationData<TData, Series<TData> | Band<TData>>[];
  chartId?: CartesianChartComponent<TData>;
}

interface ChartMouseLeaveData<TData> {
  groupId?: string;
  chartId?: CartesianChartComponent<TData>;
}
