import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { XMoreDisplay } from '../../../../x-more/x-more.component';
import { TableColumnConfig, TableRow } from '../../../table-api';
import {
  TABLE_CELL_DATA,
  TABLE_COLUMN_CONFIG,
  TABLE_COLUMN_INDEX,
  TABLE_DATA_PARSER,
  TABLE_ROW_DATA
} from '../../table-cell-injection';
import { TableCellParserBase } from '../../table-cell-parser-base';
import { TableCellRenderer } from '../../table-cell-renderer';
import { TableCellRendererBase } from '../../table-cell-renderer-base';
import { CoreTableCellParserType } from '../../types/core-table-cell-parser-type';
import { CoreTableCellRendererType } from '../../types/core-table-cell-renderer-type';
import { TableCellAlignmentType } from '../../types/table-cell-alignment-type';

@Component({
  selector: 'ht-string-array-table-cell-renderer',
  styleUrls: ['./string-array-table-cell-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="string-array-cell" [htTooltip]="this.value?.length > 0 ? summaryTooltip : undefined">
      <ng-container *ngIf="this.value?.length > 0; else emptyValueTemplate">
        <span class="first-item">{{ this.value[0] | htDisplayString }}</span>
        <ht-x-more [count]="(this.value | slice: 1).length" displayStyle="${XMoreDisplay.Gray}"></ht-x-more>
      </ng-container>

      <ng-template #summaryTooltip>
        <div *ngFor="let value of this.value | slice: 0:this.maxItemsInTooltip">{{ value }}</div>
        <ht-label
          *ngIf="this.value.length > this.maxItemsInTooltip"
          [label]="this.getOffsetLabel | htMemoize: this.value.length - this.maxItemsInTooltip"
        ></ht-label>
      </ng-template>

      <ng-template #emptyValueTemplate>-</ng-template>
    </div>
  `
})
@TableCellRenderer({
  type: CoreTableCellRendererType.StringArray,
  alignment: TableCellAlignmentType.Left,
  parser: CoreTableCellParserType.NoOp
})
export class StringArrayTableCellRendererComponent extends TableCellRendererBase<string[]> implements OnInit {
  public maxItemsInTooltip: number = 50;

  public constructor(
    @Inject(TABLE_COLUMN_CONFIG) columnConfig: TableColumnConfig,
    @Inject(TABLE_COLUMN_INDEX) index: number,
    @Inject(TABLE_DATA_PARSER) parser: TableCellParserBase<string[], string[], boolean>,
    @Inject(TABLE_CELL_DATA) cellData: string[],
    @Inject(TABLE_ROW_DATA) rowData: TableRow
  ) {
    super(columnConfig, index, parser, cellData, rowData);
  }

  public getOffsetLabel(count: number): string {
    return count === 1 ? '+1 other' : `+${count} others`;
  }
}
