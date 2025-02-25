import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat',
  standalone: true
})
export class TimeFormatPipe implements PipeTransform {
  transform(time: string): string {
    if (!time) return '12:00 AM';
    
    // Check if time is already in AM/PM format
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }
    
    const [hourString, minute] = time.split(':');
    const hour = parseInt(hourString, 10);
    
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute} ${ampm}`;
  }
}
