import { bootstrapApplication } from '@angular/platform-browser';
import { CalendarComponent } from './app/calendar/calendar.component';

bootstrapApplication(CalendarComponent)
  .catch((err: unknown) => console.error(err));
