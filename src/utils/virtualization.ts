

export interface VirtualizedItem {
  id: string;
  height: number;
  data: any;
}

export interface VirtualizedViewport {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  viewportHeight: number;
}

export class VirtualizedList {
  private items: VirtualizedItem[] = [];
  private viewportHeight: number = 0;
  private itemHeight: number = 50; 

  constructor(itemHeight: number = 50) {
    this.itemHeight = itemHeight;
  }

  setItems(items: VirtualizedItem[]): void {
    this.items = items;
  }

  setViewportHeight(height: number): void {
    this.viewportHeight = height;
  }

  getVisibleRange(scrollTop: number): VirtualizedViewport {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.viewportHeight / this.itemHeight) + 1,
      this.items.length - 1
    );

    return {
      startIndex,
      endIndex,
      scrollTop,
      viewportHeight: this.viewportHeight
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  getVisibleItems(scrollTop: number): VirtualizedItem[] {
    const range = this.getVisibleRange(scrollTop);
    return this.items.slice(range.startIndex, range.endIndex + 1);
  }
}

export {};
