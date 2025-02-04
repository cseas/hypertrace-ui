import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { TextareaComponent } from './textarea.component';

@NgModule({
  imports: [CommonModule, FormsModule, MatInputModule],
  declarations: [TextareaComponent],
  exports: [TextareaComponent]
})
export class TraceTextareaModule {}
