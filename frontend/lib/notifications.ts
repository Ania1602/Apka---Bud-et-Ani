import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { recurringDB, getNextDueDates } from './database';

const CHANNEL_ID = 'payment-reminders';
const REMINDER_KIND = 'recurring-reminder';
// Reminders are rescheduled on every app start, so a few ahead cover months without opening the app
const OCCURRENCES_AHEAD = 3;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ensurePermission = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

// Replaces all scheduled recurring-payment reminders with ones matching the current list (use rescheduleRecurringReminders)
const doReschedule = async () => {
  if (Platform.OS === 'web') return;
  try {
    const items = (await recurringDB.getAll()).filter((r: any) => r.is_active !== false);

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content.data?.kind === REMINDER_KIND)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
    if (items.length === 0) return;
    if (!(await ensurePermission())) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Przypomnienia o płatnościach',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    for (const item of items) {
      for (const date of getNextDueDates(item, OCCURRENCES_AHEAD)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: item.type === 'income' ? 'Spodziewany wpływ' : 'Termin płatności',
            body: `${item.name}: ${(item.amount || 0).toFixed(2)} PLN`,
            data: { kind: REMINDER_KIND, recurringId: item.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
        });
      }
    }
  } catch (e) {
    console.log('Reminder scheduling error:', e);
  }
};

// Calls are chained so overlapping reschedules (app start + screen focus) can't create duplicates
let pending: Promise<void> = Promise.resolve();
export const rescheduleRecurringReminders = () => {
  pending = pending.then(doReschedule);
  return pending;
};
