import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { ButtonModule } from '../button/button.module';
import { EventBlockerModule } from '../event-blocker/event-blocker.module';
import { ExpanderToggleModule } from '../expander/expander-toggle.module';
import { LayoutChangeModule } from '../layout/layout-change.module';
import { PanelBodyComponent } from './body/panel-body.component';
import { PanelHeaderComponent } from './header/panel-header.component';
import { PanelTitleComponent } from './header/title/panel-title.component';
import { PanelComponent } from './panel.component';

@NgModule({
  imports: [
    CommonModule,
    MatExpansionModule,
    LayoutChangeModule,
    ExpanderToggleModule,
    EventBlockerModule,
    ButtonModule
  ],
  declarations: [PanelComponent, PanelHeaderComponent, PanelBodyComponent, PanelTitleComponent],
  exports: [PanelComponent, PanelHeaderComponent, PanelBodyComponent, PanelTitleComponent]
})
export class PanelModule {}
