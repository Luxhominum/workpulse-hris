import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export class HapticFeedback {
  /**
   * Heartbeat / Hold pulse tick during button hold (light vibration)
   */
  public static async tick(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    }
  }

  /**
   * Distinct dual heartbeat pulse ("du-dum") on successful completion
   */
  public static async heartbeatSuccess(): Promise<void> {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 60, 80]);
      }
    }
  }

  /**
   * Medium impact when entering a mode or selecting an item
   */
  public static async tap(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    }
  }

  /**
   * Warning vibration when out of perimeter
   */
  public static async warning(): Promise<void> {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 50, 80]);
      }
    }
  }
}
