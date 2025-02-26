import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeFormatPipe } from './time-format.pipe';
import { TimePickerComponent } from '../time-picker/time-picker.component';
import * as XLSX from 'xlsx';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeFormatPipe, TimePickerComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  spreadsheetName: string = 'Name Your Spreadsheet';
  currentDate: Date = new Date();
  days: Date[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  selectedDate: Date | null = null;
  tasks: any[] = [];
  expandedGroupId: string | null = null;
  showColorDropdown = false;
  selectedColor = '';

  // Add method to toggle group expansion
  toggleGroup(taskId: string) {
    this.expandedGroupId = this.expandedGroupId === taskId ? null : taskId;
  }

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('filesInput') filesInput!: ElementRef;

  // New properties for Grouped Promos
  playNumberOptions: number[] = [];
  offsetOptions: number[] = [];

  // Update newTask with promoType and new fields
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
    timeSlots: [''],
    systems: '',
    promoType: 'single', // 'single' or 'grouped'
    assets: [],          // For storing multiple assets
    playOrder: 'Ordered',
    playNumber: 1,
    offset: 1,
    assetShuffleSeed: 1
  };
  isEditing: boolean = false;
  editingTaskId: string = '';
  showEndDate: boolean = false;
  availableColors: string[] = [];

  ngOnInit() {
    this.generateCalendar();
    this.loadTasks();
    this.availableColors = this.generateDistinctColors(30);
  }

  private generateDistinctColors(count: number): string[] {
    const colors: string[] = [];
    const hueStep = 360 / count;
    for (let i = 0; i < count; i++) {
      const hue = Math.floor(i * hueStep);
      // using 70% saturation and 50% lightness for vibrant colors
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  }

  isFormValid(): boolean {
    return (
      this.newTask.name.trim() !== '' &&
      this.newTask.systems.trim() !== '' &&
      this.newTask.color.trim() !== ''
    );
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    this.days = [];
    // Calculate padding days correctly
    for (let i = firstDay.getDay(); i > 0; i--) {
      const paddingDate = new Date(year, month, 1 - i);
      this.days.push(paddingDate);
    }
    // Add the days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      this.days.push(new Date(year, month, i));
    }
  }

  exportToExcel(): void {
    const exportData = this.tasks.flatMap(task => {
      // Prepare the assets string
      let assetsString = '';
      if (task.promoType === 'grouped' && task.assets) {
        assetsString = task.assets.join(',');
      } else if (task.promoType === 'single' && task.name) {
        assetsString = task.name;
      }

      // Existing logic to prepare other fields
      const endDate = task.endDate
        ? new Date(task.endDate).toLocaleDateString('en-GB')
        : task.repeat === 'One Off'
          ? new Date(new Date(task.date).setDate(new Date(task.date).getDate() + 1)).toLocaleDateString('en-GB')
          : '31/12/2099';
      // Default time value when not provided.
      const defaultTime = '12:00 AM';
      const normalTime = task.time && task.time !== defaultTime
        ? task.time
        : '0:00';
      // Process selected days as lowercase three letters
      const days = task.repeat === 'One Off'
        ? this.weekDays[new Date(task.date).getDay()].toLowerCase().substring(0, 3)
        : task.selectedDays
            .map((day: string) => day.toLowerCase().substring(0, 3))
            .join(',');

      // Check if we are using time slots. If so, build one export row per time slot.
      if (task.repeat === 'Multiple Plays' && task.multiplePlayType === 'timeSlots') {
        // For time slots mimic the Daily columns:
        const period = '1d';
        const hours = '0-23';
        const ranges = '0:00;23:59';
      
        // Return one export object per non-empty time slot.
        return (task.timeSlots || [])
          .filter((slot: string) => slot.trim() !== '')
          .map((slot: string) => {
            const timeslot = slot;
            const exportObj: any = {
              'assets': assetsString,
              'start': new Date(task.date).toLocaleDateString('en-GB'),
              'end': endDate,
              'time': timeslot, // Use the time slot value here instead of task.time.
              'days': days,
              'period': period,
              'hours': hours,
              'ranges': ranges,
              'interrupt': task.interruptType,
              'systems': task.systems
            };

            // Add new columns for Grouped Promos
            if (task.promoType === 'grouped') {
              exportObj['play_order'] = task.playOrder === 'Ordered' ? 'ordered_continue' : 'shuffle_continue';
              exportObj['max_play_assets'] = task.playNumber;
              exportObj['asset_play_offset'] = task.offset;
              if (task.playOrder === 'Shuffled') {
                exportObj['asset_shuffle_seed'] = task.assetShuffleSeed;
              }
            }
            return exportObj;
          });
      } else {
        // For Daily, One Off, or Multiple Plays using interval.
        let period = '';
        if (task.repeat === 'Daily') {
          period = '1d';
        } else if (task.repeat === 'Multiple Plays' && task.multiplePlayType === 'interval') {
          period = task.intervalUnit === 'hours' ? `${task.interval}h` : `${task.interval}`;
        } else if (task.repeat === 'One Off') {
          period = '1d';
        }

        let hours = '';
        let ranges = '';
        if (task.repeat === 'Daily' || task.repeat === 'One Off') {
          hours = '0-23';
          ranges = '0:00;23:59';
        } else if (task.repeat === 'Multiple Plays' && task.multiplePlayType === 'interval') {
          if (task.activeHoursStart && task.activeHoursEnd) {
            const formattedStart = this.convertTimeFormat(task.activeHoursStart);
            const formattedEnd = this.convertTimeFormat(task.activeHoursEnd);
            
            const startHour = parseInt(formattedStart.split(':')[0]);
            const endHour = parseInt(formattedEnd.split(':')[0]);
            
            hours = `${startHour}-${endHour}`;
            ranges = `${formattedStart};${formattedEnd}`;
          }
        }

        const exportObj: any = {
          'assets': assetsString,
          'start': new Date(task.date).toLocaleDateString('en-GB'),
          'end': endDate,
          'time': normalTime,
          'days': days,
          'period': period,
          'hours': hours,
          'ranges': ranges,
          'interrupt': task.interruptType,
          'systems': task.systems
        };

        if (task.promoType === 'grouped') {
          exportObj['play_order'] = task.playOrder === 'Ordered' ? 'ordered_continue' : 'shuffle_continue';
          exportObj['max_play_assets'] = task.playNumber;
          exportObj['asset_play_offset'] = task.offset;
          if (task.playOrder === 'Shuffled') {
            exportObj['asset_shuffle_seed'] = task.assetShuffleSeed;
          }
        }
        return [exportObj];
      }
    });

    // Update column widths to include new columns
    const columnWidths = [
      { wch: 30 }, // assets
      { wch: 10 }, // start
      { wch: 10 }, // end
      { wch: 8 },  // time
      { wch: 15 }, // days
      { wch: 8 },  // period
      { wch: 10 }, // hours
      { wch: 15 }, // ranges
      { wch: 10 }, // interrupt
      { wch: 20 }, // systems
      { wch: 20 }, // play_order
      { wch: 15 }, // max_play_assets
      { wch: 15 }, // asset_play_offset
      { wch: 15 }  // asset_shuffle_seed
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Announcements');

    const fileName = `${this.spreadsheetName || 'announcements_schedule'}.csv`;
    XLSX.writeFile(workbook, fileName);
  }
  selectDate(date: Date) {
    if (this.isDateSelectable(date)) {
      this.selectedDate = date;
      if (!this.isEditing) {
        this.resetNewTask();
      }
    }
  }

  // Add these methods to the CalendarComponent class
  toggleColorDropdown() {
    this.showColorDropdown = !this.showColorDropdown;
  }

  selectColor(color: string) {
    this.newTask.color = color;
    this.selectedColor = color;
    this.showColorDropdown = false;
  }

  addOrUpdateTask() {
    if (this.selectedDate) {
      this.newTask.date = this.selectedDate;

      // Handle Grouped Promos assets
      if (this.newTask.promoType === 'grouped' && this.newTask.assets.length > 0) {
        this.newTask.assetList = [...this.newTask.assets];
      } else if (this.newTask.promoType === 'single' && this.newTask.name) {
        this.newTask.assetList = [this.newTask.name];
      } else {
        alert('Please select at least one asset.');
        return;
      }

      if (this.newTask.repeat === 'Multiple Plays') {
        if (this.newTask.multiplePlayType === 'interval') {
          // Set default 24-hour period if active hours are emptys
          if (!this.newTask.activeHoursStart && !this.newTask.activeHoursEnd) {
            this.newTask.activeHoursStart = '0:00';
            this.newTask.activeHoursEnd = '23:59';
          }
        }
        if (!this.newTask.time) {
          this.newTask.time = '12:00 AM';
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
  }
    editAnnouncement(task: any) {
      this.isEditing = true;
      this.editingTaskId = task.id;
      this.newTask = { ...task };
      this.selectedDate = new Date(task.date);
      this.showEndDate = !!task.endDate;
    
      // Handle end date formatting
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
    
      // Ensure active hours are properly set for the edit form
      if (task.activeHoursStart) {
        this.newTask.activeHoursStart = task.activeHoursStart;
      }
    
      if (task.activeHoursEnd) {
        this.newTask.activeHoursEnd = task.activeHoursEnd;
      }
    
      // Update play number and offset options based on assets
      if (this.newTask.promoType === 'grouped' && this.newTask.assets.length > 0) {
        const totalAssets = this.newTask.assets.length;
        this.playNumberOptions = Array.from({ length: totalAssets }, (_, i) => i + 1);
        this.offsetOptions = Array.from({ length: totalAssets - 1 }, (_, i) => i + 1);
      }
    
      // Force change detection
      this.detectChanges();
    }

    detectChanges() {
      // This is a placeholder for your change detection implementation
      // If you're using a ChangeDetectorRef, you would call detectChanges()
      // If not, you might need to add it to your component
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

  resetCalendar(): void {
    // Clear all tasks array
    this.tasks = [];

    // Clear localStorage
    localStorage.removeItem('calendarTasks');

    // Reset selected date
    this.selectedDate = null;

    // Reset new task form
    this.resetNewTask();

    this.spreadsheetName = 'Name Your Spreadsheet';

    // Reset to current month view
    this.currentDate = new Date();
    this.generateCalendar();
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

  onPromoClick(task: any): void {
    if (task.promoType === 'grouped') {
      // Toggle assets expand/collapse
      this.toggleGroup(task.id);
    }
    // In both cases, open editing panel
    this.editAnnouncement(task);
  }

  onPromoTypeChange(): void {
    if (this.newTask.promoType === 'single') {
      // Reset grouped promos fields
      this.newTask.assets = [];
      this.newTask.playOrder = 'Ordered';
      this.newTask.playNumber = 1;
      this.newTask.offset = 1;
      this.newTask.assetShuffleSeed = 1;
      this.playNumberOptions = [];
      this.offsetOptions = [];
      // Clear multiple files input
      if (this.filesInput) {
        this.filesInput.nativeElement.value = '';
      }
    } else {
      // Clear single file input
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    }
  }

  onMultipleFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newTask.assets = Array.from(input.files).map(file => file.name);
      
      this.newTask.name = this.newTask.assets.join(',');
  
      const totalAssets = this.newTask.assets.length;
      this.playNumberOptions = Array.from({ length: totalAssets }, (_, i) => i + 1);
      this.offsetOptions = Array.from({ length: totalAssets - 1 }, (_, i) => i + 1);

      this.newTask.playNumber = 1;
      this.newTask.offset = 1;
    } else {
      this.newTask.assets = [];
      this.newTask.name = '';
      this.playNumberOptions = [];
      this.offsetOptions = [];
      this.newTask.playNumber = 1;
      this.newTask.offset = 1;
    }
  }

  onPlayOrderChange(): void {
    if (this.newTask.playOrder === 'Shuffled') {
      this.newTask.assetShuffleSeed = 1;
    } else {
      this.newTask.assetShuffleSeed = null;
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

  isDateSelectable(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }

  // Add this helper method
  convertTimeFormat(timeString: string): string {
    if (!timeString) return '';
    
    // Check if time already has AM/PM
    if (timeString.includes('AM') || timeString.includes('PM')) {
      // Convert from 12-hour to 24-hour format
      const [timePart, ampm] = timeString.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return timeString; // Already in 24-hour format
  }


  resetNewTask(): void {
    this.newTask = {
      id: '',
      name: '',
      repeat: 'One Off',
      endDateChoice: '',
      endDate: '',
      color: '',
      selectedDays: [],
      interval: 1,
      intervalUnit: 'hours',
      activeHoursStart: '',
      activeHoursEnd: '23:59', // Set default to 23:59
      interruptType: 'Wait',
      multiplePlayType: 'interval',
      timeSlots: [''],
      promoType: 'single',
      assets: [],
      playOrder: 'Ordered',
      playNumber: 1,
      offset: 1,
      assetShuffleSeed: 1
    };
    this.showEndDate = false;
    this.isEditing = false;
    this.editingTaskId = '';
    this.playNumberOptions = [];
    this.offsetOptions = [];
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filename = input.files[0].name;
      this.newTask.name = filename;
    }
  }
}

