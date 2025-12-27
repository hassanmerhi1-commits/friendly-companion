// Device Security - Locks the app when transferred to a new computer
// Developer: Hassan Merhi

// Master activation password - only the developer knows this
const MASTER_ACTIVATION_PASSWORD = 'HM@PayrollSec2024!';

// Generate a unique device fingerprint based on browser/system characteristics
export function generateDeviceFingerprint(): string {
  try {
    const components = [
      navigator?.userAgent || 'unknown',
      navigator?.language || 'unknown',
      navigator?.hardwareConcurrency?.toString() || 'unknown',
      screen?.width?.toString() || 'unknown',
      screen?.height?.toString() || 'unknown',
      screen?.colorDepth?.toString() || 'unknown',
      new Date().getTimezoneOffset().toString(),
      navigator?.platform || 'unknown',
    ];
    
    // Create a hash from the components
    const fingerprint = components.join('|');
    return btoa(fingerprint).substring(0, 32);
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    return 'fallback-device-id';
  }
}

// Validate the master password
export function validateMasterPassword(password: string): boolean {
  return password === MASTER_ACTIVATION_PASSWORD;
}

// Get stored device ID
export function getStoredDeviceId(): string | null {
  try {
    return localStorage.getItem('payroll_device_id');
  } catch {
    return null;
  }
}

// Store the activated device ID
export function storeDeviceId(deviceId: string): void {
  try {
    localStorage.setItem('payroll_device_id', deviceId);
    localStorage.setItem('payroll_activation_date', new Date().toISOString());
  } catch {
    console.error('Failed to store device ID');
  }
}

// Check if the current device is activated
export function isDeviceActivated(): boolean {
  try {
    const storedId = getStoredDeviceId();
    const currentId = generateDeviceFingerprint();
    
    // If no stored ID, device is not activated
    if (!storedId) {
      return false;
    }
    
    // Compare stored ID with current device fingerprint
    return storedId === currentId;
  } catch (error) {
    console.error('Error checking device activation:', error);
    return false;
  }
}

// Activate the current device
export function activateDevice(): void {
  const currentId = generateDeviceFingerprint();
  storeDeviceId(currentId);
}

// Get activation info
export function getActivationInfo(): { 
  isActivated: boolean; 
  activationDate: string | null;
  deviceId: string;
} {
  return {
    isActivated: isDeviceActivated(),
    activationDate: localStorage.getItem('payroll_activation_date'),
    deviceId: generateDeviceFingerprint(),
  };
}
