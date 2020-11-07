import { ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges } from '@angular/core';
import { Color, fromDomResize, Point } from '@hypertrace/common';
import { Arc, arc, DefaultArcObject } from 'd3-shape';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';

@Component({
  selector: 'ht-gauge',
  template: `
    <svg class="gauge" *ngIf="this.gaugeRendererData$ | async as rendererData">
      <g attr.transform="translate({{ rendererData.origin.x }}, {{ rendererData.origin.y }})">
        <path class="gauge-ring" [attr.d]="rendererData.backgroundArc" />
        <g
          class="input-data"
          *ngIf="rendererData.data"
          htTooltip="{{ rendererData.data.value }} of {{ rendererData.data.maxValue }}"
        >
          <path
            class="value-ring"
            [attr.d]="rendererData.data.valueArc"
            [attr.fill]="rendererData.data.threshold.color"
          />
          <text x="0" y="0" class="value-display" [attr.fill]="rendererData.data.threshold.color">
            {{ rendererData.data.value }}
          </text>
          <text x="0" y="24" class="label-display">{{ rendererData.data.threshold.label }}</text>
        </g>
      </g>
    </svg>
  `,
  styleUrls: ['./gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GaugeComponent implements OnChanges {
  private static readonly GAUGE_RING_WIDTH: number = 20;
  private static readonly GAUGE_ARC_CORNER_RADIUS: number = 10;
  private static readonly GAUGE_AXIS_PADDING: number = 30;

  @Input()
  public value?: number;

  @Input()
  public maxValue?: number;

  @Input()
  public thresholds: GaugeThreshold[] = [];

  public readonly gaugeRendererData$: Observable<GaugeSvgRendererData>;
  private readonly inputDataSubject: Subject<GaugeInputData | undefined> = new BehaviorSubject<
    GaugeInputData | undefined
  >(undefined);
  private readonly inputData$: Observable<GaugeInputData | undefined> = this.inputDataSubject.asObservable();

  public constructor(public readonly elementRef: ElementRef) {
    this.gaugeRendererData$ = this.buildGaugeRendererDataObservable();
  }

  public ngOnChanges(): void {
    this.emitInputData();
  }

  private buildGaugeRendererDataObservable(): Observable<GaugeSvgRendererData> {
    return combineLatest([this.buildDomResizeObservable(), this.inputData$]).pipe(
      map(([boundingBox, inputData]) => {
        const radius = this.buildRadius(boundingBox);

        return {
          origin: this.buildOrigin(boundingBox, radius),
          backgroundArc: this.buildBackgroundArc(radius),
          data: this.buildGaugeData(radius, inputData)
        };
      })
    );
  }

  private buildDomResizeObservable(): Observable<ClientRect> {
    const element = this.elementRef.nativeElement as HTMLElement;

    return fromDomResize(element).pipe(debounceTime(200));
  }

  private buildBackgroundArc(radius: number): string {
    return this.buildArcGenerator()({
      innerRadius: radius - GaugeComponent.GAUGE_RING_WIDTH,
      outerRadius: radius,
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 2
    })!;
  }

  private buildGaugeData(radius: number, inputData?: GaugeInputData): GaugeData | undefined {
    if (inputData === undefined) {
      return undefined;
    }

    return {
      valueArc: this.buildValueArc(radius, inputData),
      ...inputData
    };
  }

  private buildValueArc(radius: number, inputData: GaugeInputData): string {
    return this.buildArcGenerator()({
      innerRadius: radius - GaugeComponent.GAUGE_RING_WIDTH,
      outerRadius: radius,
      startAngle: -Math.PI / 2,
      endAngle: -Math.PI / 2 + (inputData.value / inputData.maxValue) * Math.PI
    })!;
  }

  private buildArcGenerator(): Arc<unknown, DefaultArcObject> {
    return arc().cornerRadius(GaugeComponent.GAUGE_ARC_CORNER_RADIUS);
  }

  private buildRadius(boundingBox: ClientRect): number {
    return Math.min(boundingBox.height, boundingBox.width) - GaugeComponent.GAUGE_AXIS_PADDING;
  }

  private buildOrigin(boundingBox: ClientRect, _: number): Point {
    return {
      x: boundingBox.width / 2,
      y: boundingBox.height - GaugeComponent.GAUGE_AXIS_PADDING
    };
  }

  private emitInputData(): void {
    let inputData;
    if (this.value !== undefined && this.maxValue !== undefined && this.maxValue > 0 && this.thresholds.length > 0) {
      const currentThreshold = this.thresholds.find(
        threshold => this.value! >= threshold.start && this.value! < threshold.end
      );

      if (currentThreshold) {
        inputData = {
          value: this.value,
          maxValue: this.maxValue,
          threshold: currentThreshold
        };
      }
    }
    this.inputDataSubject.next(inputData);
  }
}

export interface GaugeThreshold {
  label: string;
  start: number;
  end: number;
  color: Color;
}

interface GaugeSvgRendererData {
  origin: Point;
  backgroundArc: string;
  data?: GaugeData;
}

interface GaugeData {
  valueArc: string;
  value: number;
  maxValue: number;
  threshold: GaugeThreshold;
}

interface GaugeInputData {
  value: number;
  maxValue: number;
  threshold: GaugeThreshold;
}