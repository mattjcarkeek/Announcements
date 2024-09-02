import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'uniqueColor',
  standalone: true
})
export class UniqueColorPipe implements PipeTransform {
  transform(tasks: any[]): any[] {
    const uniqueColors = new Map();
    for (const task of tasks) {
      if (!uniqueColors.has(task.color)) {
        uniqueColors.set(task.color, task);
      }
    }
    return Array.from(uniqueColors.values());
  }
}
