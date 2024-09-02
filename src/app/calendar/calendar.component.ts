import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniqueColorPipe } from './unique-color.pipe';
import { TimeFormatPipe } from './time-format.pipe';
import { ColorNamePipe } from './color-name.pipe';
import { TimePickerComponent } from '../time-picker/time-picker.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, UniqueColorPipe, TimeFormatPipe, ColorNamePipe, TimePickerComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  currentDate: Date = new Date();
  days: Date[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  selectedDate: Date | null = null;
  tasks: any[] = [];
  newTask: any = {
    id: '',
    name: '',
    time: '',
    repeat: 'One Off',
    endDateChoice: '',
    endDate: '',
    endTime: '',
    color: '',
    selectedDays: [],
    interval: 1,
    intervalUnit: 'hours',
    activeHoursStart: '',
    activeHoursEnd: '',
    interruptType: 'Wait',
    multiplePlayType: 'interval',
    timeSlots: ['']
  };
  isEditing: boolean = false;
  editingTaskId: string = '';
  showEndDate: boolean = false;
  availableColors: string[] = [
    'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
    'brown', 'gray', 'cyan', 'magenta'
  ];

  ngOnInit() {
    this.generateCalendar();
    this.loadTasks();
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    this.days = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
      this.days.push(new Date(year, month, -i));
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      this.days.push(new Date(year, month, i));
    }
  }

  selectDate(date: Date) {
    if (this.isDateSelectable(date)) {
      this.selectedDate = date;
      if (!this.isEditing) {
        this.resetNewTask();
      }
    }
  }

  addOrUpdateTask() {
    if (this.selectedDate) {
      this.newTask.date = this.selectedDate;
      if (this.newTask.repeat === 'Multiple Plays') {
        if (this.newTask.multiplePlayType === 'interval' && (!this.newTask.activeHoursStart || !this.newTask.activeHoursEnd)) {
          alert('Please set active hours for multiple plays.');
          return;
        }
        if (this.newTask.multiplePlayType === 'timeSlots' && this.newTask.timeSlots.some((slot: string) => !slot)) {
          alert('Please fill all time slots or remove empty ones.');
          return;
        }
      }

      if (this.newTask.endDate && this.newTask.endTime) {
        const [hours, minutes] = this.newTask.endTime.split(':');
        const endDateTime = new Date(this.newTask.endDate);
        endDateTime.setHours(parseInt(hours), parseInt(minutes));
        this.newTask.endDate = endDateTime.toISOString();
      }

      if (this.isEditing) {
        const index = this.tasks.findIndex(t => t.id === this.editingTaskId);
        if (index !== -1) {
          this.tasks[index] = { ...this.newTask };
        }
      } else {
        this.newTask.id = Date.now().toString();
        this.tasks.push({ ...this.newTask });
      }
      this.saveTasks();
      this.resetNewTask();
      this.selectedDate = null;
    }
  }  editAnnouncement(task: any) {
    this.isEditing = true;
    this.editingTaskId = task.id;
    this.newTask = { ...task };
    this.selectedDate = new Date(task.date);
    this.showEndDate = !!task.endDate;
    if (task.endDate) {
      const endDate = new Date(task.endDate);
    this.newTask.endDate = this.formatDateForInput(endDate);
    this.newTask.endTime = this.formatTimeForInput(endDate);
    this.newTask.endDateChoice = 'Choose End Date';
    this.showEndDate = true;
  } else {
    this.newTask.endDate = '';
    this.newTask.endTime = '';
    this.newTask.endDateChoice = '';
    this.showEndDate = false;
    }
  }

  deleteAnnouncement() {
    if (this.isEditing && this.editingTaskId) {
      this.tasks = this.tasks.filter(task => task.id !== this.editingTaskId);
      this.saveTasks();
      this.resetNewTask();
      this.selectedDate = null;
    }
  }

  getTasksForDate(date: Date): any[] {
    return this.tasks.filter(task => {
      const taskDate = new Date(task.date);
      const endDate = task.endDate ? new Date(task.endDate) : null;
      
      if (task.repeat === 'One Off') {
        return date.toDateString() === taskDate.toDateString();
      } else {
        const dayName = this.weekDays[date.getDay()];
        return task.selectedDays.includes(dayName) &&
               date >= taskDate &&
               (!endDate || date <= endDate);
      }
    });
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  private saveTasks() {
    localStorage.setItem('calendarTasks', JSON.stringify(this.tasks));
  }

  loadTasks() {
    const savedTasks = localStorage.getItem('calendarTasks');
    if (savedTasks) {
      this.tasks = JSON.parse(savedTasks);
      this.tasks.forEach(task => {
        if (task.date) {
          task.date = new Date(task.date);
        }
        if (task.endDate) {
          task.endDate = new Date(task.endDate);
        }
      });
    }
  }

  onRepeatChange() {
    if (this.newTask.repeat === 'Multiple Plays') {
      this.newTask.selectedDays = [...this.weekDays];
    } else {
      this.newTask.selectedDays = [];
    }
    if (this.newTask.repeat === 'One Off') {
      this.newTask.endDateChoice = '';
      this.showEndDate = false;
    } else if (this.newTask.repeat === 'Daily') {
      this.newTask.selectedDays = [...this.weekDays];
    } else if (this.newTask.repeat === 'Multiple Plays') {
      this.newTask.interval = 1;
      this.newTask.intervalUnit = 'hours';
    }
  }
  onEndDateChoiceChange() {
    this.showEndDate = this.newTask.endDateChoice === 'Choose End Date';
  }

  toggleDaySelection(day: string) {
    const index = this.newTask.selectedDays.indexOf(day);
    if (index > -1) {
      this.newTask.selectedDays.splice(index, 1);
    } else {
      this.newTask.selectedDays.push(day);
    }
  }

  getSelectedDaysString(task: any): string {
    return task.selectedDays.join(', ');
  }

  isColorUsed(color: string): boolean {
    return this.tasks.some(task => task.color === color && task.id !== this.editingTaskId);
  }

  getContrastColor(hexcolor: string): string {
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
  }

  isDateSelectable(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }

  resetNewTask(): void {
    this.newTask = {
      id: '',
      name: '',
      time: '',
      repeat: 'One Off',
      endDateChoice: '',
      endDate: '',
      color: '',
      selectedDays: [],
      interval: 1,
      intervalUnit: 'hours',
      activeHoursStart: '',
      activeHoursEnd: '',
      interruptType: 'Wait',
      multiplePlayType: 'interval',
      timeSlots: ['']
    };
    this.showEndDate = false;
    this.isEditing = false;
    this.editingTaskId = '';
  }

  addTimeSlot() {
    this.newTask.timeSlots.push('');
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTimeForInput(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }
  
}


