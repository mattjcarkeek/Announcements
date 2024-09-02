import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'colorName',
  standalone: true
})
export class ColorNamePipe implements PipeTransform {
  private colorMap: { [key: string]: string } = {
    '#FF0000': 'Red',
    '#00FF00': 'Green',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
    '#FFA500': 'Orange',
    '#800080': 'Purple'
  };

  transform(value: string): string {
    return this.colorMap[value.toUpperCase()] || value;
  }
}
