/**
 * Audio Unlock Utility
 *
 * Handles browser autoplay policies by ensuring user interaction
 * before attempting to play audio through YouTube iframe API
 */

class AudioUnlockService {
  private isUnlocked = false;
  private unlockPromise: Promise<void> | null = null;
  private unlockHandlers: (() => void)[] = [];

  constructor() {
    this.setupUnlockListeners();
  }

  private setupUnlockListeners() {
    const unlockAudio = () => {
      if (this.isUnlocked) return;

      // Test if we can play audio by creating a silent audio context
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            this.markAsUnlocked();
          }).catch((error) => {
            console.warn('Failed to resume AudioContext:', error);
            // Still mark as unlocked since user interacted
            this.markAsUnlocked();
          });
        } else {
          this.markAsUnlocked();
        }
      } catch (error) {
        console.warn('AudioContext not available:', error);
        // Mark as unlocked anyway since user interacted
        this.markAsUnlocked();
      }
    };

    // Listen for various user interaction events
    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });
  }

  private markAsUnlocked() {
    if (this.isUnlocked) return;

    this.isUnlocked = true;
    console.log('Audio unlocked for playback');

    // Resolve any pending unlock promises
    this.unlockHandlers.forEach(handler => handler());
    this.unlockHandlers = [];
  }

  /**
   * Check if audio is unlocked for playback
   */
  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Wait for user interaction if audio is not yet unlocked
   */
  public async waitForUnlock(): Promise<void> {
    if (this.isUnlocked) {
      return Promise.resolve();
    }

    if (!this.unlockPromise) {
      this.unlockPromise = new Promise<void>((resolve) => {
        this.unlockHandlers.push(resolve);
      });
    }

    return this.unlockPromise;
  }

  /**
   * Show user notification if interaction is required
   */
  public showInteractionPrompt(): void {
    if (this.isUnlocked) return;

    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      cursor: pointer;
      transition: opacity 0.3s ease;
    `;
    notification.textContent = 'Click anywhere to enable audio playback';

    document.body.appendChild(notification);

    // Auto-remove after interaction or timeout
    const removeNotification = () => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    };

    notification.addEventListener('click', removeNotification);
    setTimeout(removeNotification, 5000); // Remove after 5 seconds

    // Remove when audio is unlocked
    this.unlockHandlers.push(removeNotification);
  }
}

// Export singleton instance
export const audioUnlockService = new AudioUnlockService();