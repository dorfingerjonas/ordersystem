import { CanDeactivateFn } from '@angular/router';

/** asks before unsaved group changes get lost (back button, other product in the list, sidebar …) */
export const groupLeaveGuard: CanDeactivateFn<{ canLeave(): boolean | Promise<boolean> }> = component => component.canLeave();
