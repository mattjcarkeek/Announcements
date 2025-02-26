import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="time-picker">
      <select [(ngModel)]="hours" (ngModelChange)="updateTime()">
        <option *ngFor="let hour of hourOptions" [value]="hour">{{hour}}</option>
      </select>
      :
      <select [(ngModel)]="minutes" (ngModelChange)="updateTime()">
        <option *ngFor="let minute of minuteOptions" [value]="minute">{{minute}}</option>
      </select>
      <select [(ngModel)]="ampm" (ngModelChange)="updateTime()">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  `,
  styles: [`
    .time-picker {
      display: flex;
      align-items: center;
    }
    select {
      margin: 0 5px;
    }
  `]
})
export class TimePickerComponent implements OnInit {
  @Input() time: string = '';
  @Input() isEndTime: boolean = false; // Flag to identify if this is an end time picker
  @Output() timeChange = new EventEmitter<string>();

  hours: string = '12';
  minutes: string = '00';
  ampm: string = 'AM';

  hourOptions: string[] = Array.from({length: 12}, (_, i) => (i + 1).toString());
  minuteOptions: string[] = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));

  ngOnInit() {
    // Set default for end time to 11:59 PM if empty
    if (this.isEndTime && !this.time) {
      this.hours = '11';
      this.minutes = '59';
      this.ampm = 'PM';
      this.updateTime();
    } else {
      this.parseTime();
    }
  }

  parseTime() {
    if (this.time) {
      const [hours, minutes] = this.time.split(':');
      const hour = parseInt(hours);
      this.hours = (hour % 12 || 12).toString();
      this.minutes = minutes;
      this.ampm = hour >= 12 ? 'PM' : 'AM';
    }
  }

  updateTime() {
    let hour = parseInt(this.hours);
    if (this.ampm === 'PM' && hour !== 12) hour += 12;
    if (this.ampm === 'AM' && hour === 12) hour = 0;
    
    // Enforce maximum time of 23:59 for end time pickers
    if (this.isEndTime && hour === 23 && parseInt(this.minutes) > 59) {
      this.minutes = '59';
    }
    
    this.time = `${hour}:${this.minutes}`;
    this.timeChange.emit(this.time);
  }  
}