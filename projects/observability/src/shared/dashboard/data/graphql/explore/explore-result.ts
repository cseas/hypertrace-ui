import { TimeDuration } from '@hypertrace/common';
import { groupBy } from 'lodash-es';
import { AttributeExpression } from '../../../../graphql/model/attribute/attribute-expression';
import {
  getZeroFilledMetricTimeseriesIntervals,
  MetricTimeseriesInterval
} from '../../../../graphql/model/metric/metric-timeseries';
import { MetricAggregationType } from '../../../../graphql/model/metrics/metric-aggregation';
import { ExploreSpecification } from '../../../../graphql/model/schema/specifications/explore-specification';
import { GraphQlTimeRange } from '../../../../graphql/model/schema/timerange/graphql-time-range';
import { ExploreSpecificationBuilder } from '../../../../graphql/request/builders/specification/explore/explore-specification-builder';
import {
  GQL_EXPLORE_RESULT_INTERVAL_KEY,
  GraphQlExploreResponse,
  GraphQlExploreResult
} from '../../../../graphql/request/handlers/explore/explore-query';

export class ExploreResult {
  private static readonly OTHER_SERVER_GROUP_NAME: string = '__Other';
  public static readonly OTHER_UI_GROUP_NAME: string = 'Others';

  private readonly specBuilder: ExploreSpecificationBuilder = new ExploreSpecificationBuilder();

  public constructor(
    private readonly response: GraphQlExploreResponse,
    private readonly interval?: TimeDuration,
    private readonly timeRange?: GraphQlTimeRange
  ) {}

  public getTimeSeriesData(metricKey: string, aggregation: MetricAggregationType): MetricTimeseriesInterval[] {
    return this.extractTimeseriesForSpec(this.specBuilder.exploreSpecificationForKey(metricKey, aggregation));
  }

  public getGroupedSeriesData(
    groupExpressions: AttributeExpression[],
    metricKey: string,
    aggregation: MetricAggregationType
  ): GroupData[] {
    return this.extractGroupSeriesForSpec(
      groupExpressions.map(expression => this.specBuilder.exploreSpecificationForAttributeExpression(expression)),
      this.specBuilder.exploreSpecificationForKey(metricKey, aggregation)
    );
  }

  public getGroupedTimeSeriesData(
    groupExpressions: AttributeExpression[],
    metricKey: string,
    aggregation: MetricAggregationType
  ): Map<string[], MetricTimeseriesInterval[]> {
    const groupSpecs = groupExpressions.map(expression =>
      this.specBuilder.exploreSpecificationForAttributeExpression(expression)
    );
    const spec = this.specBuilder.exploreSpecificationForKey(metricKey, aggregation);
    const groupedResults = groupBy(this.response.results, result =>
      this.getGroupNamesFromResult(result, groupSpecs).join(',')
    );

    return new Map(
      Object.entries(groupedResults).map(([concatenatedGroupNames, results]) => [
        concatenatedGroupNames.split(','),
        this.resultsToTimeseriesIntervals(results, spec)
      ])
    );
  }

  private extractGroupSeriesForSpec(groupBySpecs: ExploreSpecification[], spec: ExploreSpecification): GroupData[] {
    return this.resultsContainingSpec(spec).map(result => this.resultToGroupData(result, groupBySpecs, spec));
  }

  private extractTimeseriesForSpec(spec: ExploreSpecification): MetricTimeseriesInterval[] {
    return this.resultsToTimeseriesIntervals(this.resultsContainingSpec(spec), spec);
  }

  private resultToGroupData(
    result: GraphQlExploreResult,
    groupBySpecs: ExploreSpecification[],
    spec: ExploreSpecification
  ): GroupData {
    return {
      keys: this.getGroupNamesFromResult(result, groupBySpecs),
      value: result[spec.resultAlias()].value as number
    };
  }

  private getGroupNamesFromResult(result: GraphQlExploreResult, groupBySpecs: ExploreSpecification[]): string[] {
    return groupBySpecs
      .map(spec => result[spec.resultAlias()].value as string)
      .map(name => (name === ExploreResult.OTHER_SERVER_GROUP_NAME ? ExploreResult.OTHER_UI_GROUP_NAME : name));
  }

  private resultsToTimeseriesIntervals(
    results: GraphQlExploreResult[],
    spec: ExploreSpecification
  ): MetricTimeseriesInterval[] {
    const metrics = results.map(result => this.resultToTimeseriesInterval(result, spec));

    if (this.interval !== undefined && this.timeRange !== undefined) {
      return getZeroFilledMetricTimeseriesIntervals(metrics, this.interval, this.timeRange);
    }

    return metrics;
  }

  private resultToTimeseriesInterval(
    result: GraphQlExploreResult,
    spec: ExploreSpecification
  ): MetricTimeseriesInterval {
    return {
      value: result[spec.resultAlias()].value as number,
      timestamp: result[GQL_EXPLORE_RESULT_INTERVAL_KEY]!
    };
  }

  private resultsContainingSpec(spec: ExploreSpecification): GraphQlExploreResult[] {
    const key = spec.resultAlias();

    return this.response.results.filter(result => key in result);
  }
}

interface GroupData {
  keys: string[];
  value: number;
}
