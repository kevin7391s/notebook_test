import { registerPlugin } from '@capacitor/core';

export interface NativeLauncherPlugin {
  launchApp(options: { packageName: string }): Promise<void>;
}

const NativeLauncher = registerPlugin<NativeLauncherPlugin>('NativeLauncher');

export default NativeLauncher;
