// Device Security - One-time activation on first install
// Developer: Hassan Merhi

// Master activation password - only the developer knows this
const MASTER_ACTIVATION_PASSWORD = 'HM@PayrollSec2024!';

// Check if we're in Electron environment
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

// Validate the master password
export function validateMasterPassword(password: string): boolean {
  return password === MASTER_ACTIVATION_PASSWORD;
}

// Check if the app is activated (one-time, permanent)
export async function isDeviceActivated(): Promise<boolean> {
  try {
    if (isElectron()) {
      // Use Electron's file-based activation
      const result = await (window as any).electronAPI.activation.check();
      return result?.isActivated === true;
    }
    
    // Fallback for non-Electron (development preview)
    const activated = localStorage.getItem('payroll_activated');
    return activated === 'true';
  } catch (error) {
    console.error('Error checking device activation:', error);
    return false;
  }
}

// Synchronous version for initial check (uses cached value)
let cachedActivationStatus: boolean | null = null;

export function isDeviceActivatedSync(): boolean {
  if (cachedActivationStatus !== null) {
    return cachedActivationStatus;
  }
  
  // For initial sync check, use localStorage as cache
  try {
    const cached = localStorage.getItem('payroll_activation_cached');
    return cached === 'true';
  } catch {
    return false;
  }
}

// Activate the device (one-time, permanent)
export async function activateDevice(): Promise<boolean> {
  try {
    if (isElectron()) {
      // Use Electron's file-based activation
      const result = await (window as any).electronAPI.activation.activate();
      if (result?.success) {
        cachedActivationStatus = true;
        localStorage.setItem('payroll_activation_cached', 'true');
        return true;
      }
      return false;
    }
    
    // Fallback for non-Electron
    localStorage.setItem('payroll_activated', 'true');
    localStorage.setItem('payroll_activation_cached', 'true');
    cachedActivationStatus = true;
    return true;
  } catch (error) {
    console.error('Error activating device:', error);
    return false;
  }
}

// Initialize activation status (call on app startup)
export async function initActivationStatus(): Promise<boolean> {
  try {
    const activated = await isDeviceActivated();
    cachedActivationStatus = activated;
    if (activated) {
      localStorage.setItem('payroll_activation_cached', 'true');
    }
    return activated;
  } catch (error) {
    console.error('Error initializing activation status:', error);
    return false;
  }
}

// Get activation info (for debugging)
export function getActivationInfo(): { 
  isActivated: boolean; 
  isElectron: boolean;
} {
  return {
    isActivated: cachedActivationStatus ?? false,
    isElectron: isElectron(),
  };
}

// Legacy functions for backward compatibility
export function generateDeviceFingerprint(): string {
  return 'legacy-not-used';
}

export function getStoredDeviceId(): string | null {
  return null;
}

export function storeDeviceId(deviceId: string): void {
  // No longer used
}
