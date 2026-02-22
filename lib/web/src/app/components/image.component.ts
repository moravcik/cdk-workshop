import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { Image, SavedImage } from 'shared/types/pin.types';

@Component({
    selector: 'app-image',
    styles: [`
    .bottom {
        display: flex;
        justify-content: space-between;
        padding-top: 8px;
    }
    img {
        max-width: 100%;
        height: auto;
    }
  `],
    template: `
      @if (image && loading) {
        <mat-progress-bar mode="query" color="primary"></mat-progress-bar>
      }
      @if (image) {
        @if (image.url || image.dataUrl) {
          <div>
            <img [src]="image.url || image.dataUrl"
              [ngStyle]="{'display': loading ? 'none' : 'inline-block'}"
              (load)="loading = false">
          </div>
        }
        <div class="bottom">
          <div>{{ formatFileSize(image.size) }}</div>
          <div>{{ image.lastModified | date }}</div>
        </div>
      }
      `,
    standalone: false
})
export class ImageComponent implements OnChanges {

  @Input() image: Partial<SavedImage>;
  
  loading = true;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.image && this.image) {
      this.loading = true;
    }
  }
  
  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
}
