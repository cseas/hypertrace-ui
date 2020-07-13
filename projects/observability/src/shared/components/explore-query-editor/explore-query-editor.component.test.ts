import { HttpClientTestingModule } from '@angular/common/http/testing';
import { discardPeriodicTasks, fakeAsync, flush } from '@angular/core/testing';
import { IconLibraryTestingModule } from '@hypertrace/assets-library';
import {
  FixedTimeRange,
  IntervalDurationService,
  NavigationService,
  TimeDuration,
  TimeRangeService,
  TimeUnit
} from '@hypertrace/common';
import { AttributeMetadata, AttributeMetadataType, MetricAggregationType } from '@hypertrace/distributed-tracing';
import { GraphQlRequestService } from '@hypertrace/graphql-client';
import { createHostFactory, mockProvider } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { ObservabilityTraceType } from '../../graphql/model/schema/observability-traces';
import { ExploreQueryEditorComponent } from './explore-query-editor.component';
import { ExploreQueryEditorModule } from './explore-query-editor.module';
import { ExploreVisualizationRequest } from './explore-visualization-builder';

describe('Explore query editor', () => {
  const defaultTimeRange = new FixedTimeRange(
    new Date('2019-11-08T22:18:31.159Z'),
    new Date('2019-11-08T23:18:31.159Z')
  );
  const metadata: AttributeMetadata[] = [
    {
      name: 'first',
      scope: ObservabilityTraceType.Api,
      displayName: 'First',
      units: 'ms',
      type: AttributeMetadataType.Number,
      requiresAggregation: false,
      allowedAggregations: [MetricAggregationType.Average, MetricAggregationType.Sum]
    },
    {
      name: 'second',
      scope: ObservabilityTraceType.Api,
      displayName: 'Second',
      units: 'ms',
      type: AttributeMetadataType.Number,
      requiresAggregation: false,
      allowedAggregations: [MetricAggregationType.Average, MetricAggregationType.Sum]
    },
    {
      name: 'first groupable',
      scope: ObservabilityTraceType.Api,
      displayName: 'First Groupable',
      units: 'ms',
      type: AttributeMetadataType.String,
      requiresAggregation: false,
      allowedAggregations: []
    },
    {
      name: 'second groupable',
      scope: ObservabilityTraceType.Api,
      displayName: 'Second Groupable',
      units: 'ms',
      type: AttributeMetadataType.String,
      requiresAggregation: false,
      allowedAggregations: []
    }
  ];

  const hostBuilder = createHostFactory({
    component: ExploreQueryEditorComponent,
    imports: [ExploreQueryEditorModule, HttpClientTestingModule, IconLibraryTestingModule],
    providers: [
      mockProvider(TimeRangeService, {
        getTimeRangeAndChanges: () => of(defaultTimeRange),
        getCurrentTimeRange: () => defaultTimeRange
      }),
      mockProvider(GraphQlRequestService, {
        queryImmediately: jest.fn(() => of(metadata))
      }),
      mockProvider(IntervalDurationService, {
        availableIntervals$: of('AUTO'),
        getAutoDuration: () => new TimeDuration(15, TimeUnit.Second)
      }),
      mockProvider(NavigationService)
    ],
    declareComponent: false
  });

  const matchSeriesWithName = (name: string) =>
    expect.objectContaining({
      specification: expect.objectContaining({
        name: name
      })
    });
  const defaultSeries = matchSeriesWithName('calls');

  const expectedDefaultQuery = (): ExploreVisualizationRequest =>
    expect.objectContaining({
      interval: new TimeDuration(15, TimeUnit.Second),
      series: [defaultSeries]
    });

  test('defaults query', fakeAsync(() => {
    const onRequestChange = jest.fn();
    const spectator = hostBuilder(
      `<ht-explore-query-editor (visualizationRequestChange)="onRequestChange($event)">
    </ht-explore-query-editor>`,
      {
        hostProps: {
          onRequestChange: onRequestChange
        }
      }
    );

    spectator.tick();

    expect(onRequestChange).toHaveBeenCalledWith(expectedDefaultQuery());

    // Select group is async in styling, but we don't care for this test
    discardPeriodicTasks();
  }));

  test('onRequestChange emits the new query on series group change', fakeAsync(() => {
    const onRequestChange = jest.fn();

    const spectator = hostBuilder(
      `<ht-explore-query-editor (visualizationRequestChange)="onRequestChange($event)">
    </ht-explore-query-editor>`,
      {
        hostProps: {
          onRequestChange: onRequestChange
        }
      }
    );
    spectator.tick();

    spectator.click('.add-series-button');
    spectator.tick();

    expect(onRequestChange).toHaveBeenCalledWith(
      expect.objectContaining({
        series: [defaultSeries, defaultSeries]
      })
    );
  }));

  test('emits changes to the query on group by change', fakeAsync(() => {
    const onRequestChange = jest.fn();

    const spectator = hostBuilder(
      `<ht-explore-query-editor (visualizationRequestChange)="onRequestChange($event)">
    </ht-explore-query-editor>`,
      {
        hostProps: {
          onRequestChange: onRequestChange
        }
      }
    );
    spectator.tick();

    spectator.click(spectator.query('.group-by .trigger-content')!);
    const options = spectator.queryAll('.select-option', { root: true });
    spectator.click(options[1]);

    spectator.tick();

    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        series: [defaultSeries],
        groupByLimit: 5, // Default group by limit
        groupBy: {
          key: 'first groupable'
        }
      })
    );

    flush(); // Option overlay detaches asyncs
  }));

  test('emits changes to the query on limit change', fakeAsync(() => {
    const onQueryChange = jest.fn();

    const spectator = hostBuilder(
      `<ht-explore-query-editor (visualizationRequestChange)="onQueryChange($event)">
    </ht-explore-query-editor>`,
      {
        hostProps: {
          onQueryChange: onQueryChange
        }
      }
    );
    spectator.tick();

    // First pick a group by to enable limit selection
    spectator.click(spectator.query('.group-by .trigger-content')!);
    const options = spectator.queryAll('.select-option', { root: true });
    spectator.click(options[1]);

    spectator.tick();

    const limitInputEl = spectator.query('ht-explore-query-limit-editor input') as HTMLInputElement;
    limitInputEl.value = '6';
    spectator.dispatchFakeEvent(limitInputEl, 'input');
    spectator.tick();

    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        series: [defaultSeries],
        groupByLimit: 6,
        groupBy: {
          key: 'first groupable'
        }
      })
    );
    flush(); // Option overlay detaches async
  }));

  test('emits changes to the query on interval change', fakeAsync(() => {
    const onRequestChange = jest.fn();

    const spectator = hostBuilder(
      `<ht-explore-query-editor (visualizationRequestChange)="onRequestChange($event)">
    </ht-explore-query-editor>`,
      {
        hostProps: {
          onRequestChange: onRequestChange
        }
      }
    );
    spectator.tick();

    spectator.click(spectator.query('.interval .trigger-content')!);
    const options = spectator.queryAll('.select-option', { root: true });
    spectator.click(options[0]);

    spectator.tick();

    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        interval: undefined
      })
    );

    flush(); // Option overlay detaches async
  }));

  test('emits changes to the query on include other change', fakeAsync(() => {
    const onRequestChange = jest.fn();

    const spectator = hostBuilder(
      `<ht-explore-query-editor (visualizationRequestChange)="onRequestChange($event)">
    </ht-explore-query-editor>`,
      {
        hostProps: {
          onRequestChange: onRequestChange
        }
      }
    );
    spectator.tick();

    // First pick a group by to enable limit selection
    spectator.click(spectator.query('.group-by .trigger-content')!);
    const options = spectator.queryAll('.select-option', { root: true });
    spectator.click(options[1]);

    spectator.tick();

    spectator.click('.limit-include-rest-container input[type="checkbox"]');

    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        groupBy: expect.objectContaining({
          includeRest: true
        })
      })
    );

    flush(); // Option overlay detaches async
  }));
});
