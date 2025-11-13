class NetworkService {
  private listeners = new Set<(isOnline: boolean) => void>();
  private isOnline = true;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly pingUrl = 'https://www.gstatic.com/generate_204';
  private readonly intervalMs = 15000;

  start() {
    if (this.intervalId) {
      return;
    }
    this.checkConnectivity();
    this.intervalId = setInterval(() => {
      this.checkConnectivity();
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(listener: (isOnline: boolean) => void) {
    this.listeners.add(listener);
    listener(this.isOnline);
    this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  private async checkConnectivity() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(this.pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const online = response.ok;
      this.updateStatus(online);
    } catch (error) {
      this.updateStatus(false);
    }
  }

  private updateStatus(status: boolean) {
    if (this.isOnline === status) return;
    this.isOnline = status;
    this.listeners.forEach(listener => listener(this.isOnline));
  }
}

export const networkService = new NetworkService();
