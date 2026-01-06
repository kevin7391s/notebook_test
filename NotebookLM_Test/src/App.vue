<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { App as CapacitorApp } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import NativeLauncher from './plugins/NativeLauncher';
import { FlowStep, currentStep, setStep, resetFlow } from './state/flow';
import { generateSessionId } from './utils/session';
import OperatorPanel from './components/OperatorPanel.vue';

// --------------------
// Constants
// --------------------
// NotebookLM package name
// NOTE: Must also be added to AndroidManifest.xml <queries>
const NOTEBOOKLM_PACKAGE = 'com.google.android.apps.labs.language.tailwind'; 
// TEST WITH: com.android.chrome or com.google.android.youtube (if added to queries)

// Fallback App Link (may open browser if NotebookLM doesn't claim links)
const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';

const AUTO_RESET_DELAY = 5000;

// --------------------
// State
// --------------------
const sessionId = ref(generateSessionId());
const titleTapCount = ref(0);
const showOperator = ref(false);
const errorMessage = ref('');
let resetTimer: any = null;

// --------------------
// Computed
// --------------------
const stepLabel = computed(() => {
  switch (currentStep.value) {
    case FlowStep.WELCOME:
      return 'Step 1 of 3';
    case FlowStep.INSTRUCTIONS:
      return 'Step 2 of 3';
    case FlowStep.WAIT_RETURN:
      return 'Step 3 of 3';
    case FlowStep.THANK_YOU:
      return 'Complete';
    default:
      return '';
  }
});

// --------------------
// Methods
// --------------------
const handleTitleTap = () => {
  titleTapCount.value++;
  if (titleTapCount.value >= 5) {
    showOperator.value = true;
    titleTapCount.value = 0;
  }
};

const startFlow = () => {
  setStep(FlowStep.INSTRUCTIONS);
};

const openNotebookLM = async () => {
  errorMessage.value = '';

  // This launcher approach is Android-only
  if (Capacitor.getPlatform() !== 'android') {
    errorMessage.value = 'NotebookLM native launching is only supported on Android for this booth.';
    return;
  }

  // 1. Native Plugin Launch (Most reliable "Tap Icon" simulation)
  try {
    await NativeLauncher.launchApp({ packageName: NOTEBOOKLM_PACKAGE });
    setStep(FlowStep.WAIT_RETURN);
    return;
  } catch (e) {
    console.warn('NativeLauncher failed', e);
  }

  // 2. Fallback: App Link (Intent Filter)
  try {
    await AppLauncher.openUrl({ url: NOTEBOOKLM_URL });
    setStep(FlowStep.WAIT_RETURN);
    return; 
  } catch (e) {
    console.error('Failed to open NotebookLM via app link', e);
  }

  errorMessage.value = `Could not launch app (${NOTEBOOKLM_PACKAGE}). Verify it is installed.`;
};

const handleReturn = () => {
  setStep(FlowStep.THANK_YOU);

  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    resetToWelcome();
  }, AUTO_RESET_DELAY);
};

const resetToWelcome = () => {
  if (resetTimer) clearTimeout(resetTimer);
  sessionId.value = generateSessionId();
  resetFlow();
  errorMessage.value = '';
};

// --------------------
// Lifecycle / listeners
// --------------------
onMounted(() => {
  // If you ever deep-link BACK into your booth app from something you control
  CapacitorApp.addListener('appUrlOpen', (event) => {
    if (event.url?.startsWith('notebooklmbooth://return')) {
      handleReturn();
    }
  });

  // Reliable kiosk return: if we were waiting and the booth app becomes active again, finish/reset
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive && currentStep.value === FlowStep.WAIT_RETURN) {
      handleReturn();
    }
  });
});

onUnmounted(() => {
  CapacitorApp.removeAllListeners();
  if (resetTimer) clearTimeout(resetTimer);
});

// --------------------
// Operator Actions
// --------------------
const opReset = () => {
  resetToWelcome();
  showOperator.value = false;
};

const opJumpInstructions = () => {
  setStep(FlowStep.INSTRUCTIONS);
  showOperator.value = false;
};

const opOpenNotebook = () => {
  openNotebookLM();
  showOperator.value = false;
};

const opSimulateReturn = () => {
  handleReturn();
  showOperator.value = false;
};
</script>

<template>
  <div class="app-container">
    <header>
      <h1 @click="handleTitleTap">NotebookLM Booth</h1>
      <div class="progress" v-if="currentStep !== FlowStep.WELCOME">{{ stepLabel }}</div>
    </header>

    <main>
      <!-- WELCOME -->
      <div v-if="currentStep === FlowStep.WELCOME" class="screen welcome">
        <h2>Welcome</h2>
        <p>Experience the power of NotebookLM.</p>
        <button class="primary-btn" @click="startFlow">Start</button>
      </div>

      <!-- INSTRUCTIONS -->
      <div v-if="currentStep === FlowStep.INSTRUCTIONS" class="screen instructions">
        <h2>Instructions</h2>
        <ul>
          <li>Tap "Audio Overview"</li>
          <li>Tap "Generate"</li>
          <li>Tap "Play"</li>
        </ul>

        <button class="primary-btn" @click="openNotebookLM">Open NotebookLM</button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <p class="hint" v-if="errorMessage">
          If NotebookLM still won’t open: this device may restrict launching other apps from a kiosk app.
          If you want to guarantee native launch, the most reliable solution is a tiny Android plugin that calls
          PackageManager.getLaunchIntentForPackage().
        </p>
      </div>

      <!-- WAIT_RETURN -->
      <div v-if="currentStep === FlowStep.WAIT_RETURN" class="screen wait">
        <h2>Explore NotebookLM</h2>
        <p>
          When you return to this booth app, it will automatically finish and reset.
          If needed, use the manual return button below.
        </p>
        <button class="secondary-btn" @click="handleReturn">I'm Finished (Manual Return)</button>
      </div>

      <!-- THANK_YOU -->
      <div v-if="currentStep === FlowStep.THANK_YOU" class="screen thank-you">
        <h2>Thanks!</h2>
        <p>Resetting in a few seconds...</p>
      </div>
    </main>

    <OperatorPanel
      :is-visible="showOperator"
      :session-id="sessionId"
      :current-step="currentStep"
      @close="showOperator = false"
      @reset="opReset"
      @jump-to-instructions="opJumpInstructions"
      @open-notebook="opOpenNotebook"
      @simulate-return="opSimulateReturn"
    />
  </div>
</template>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  max-width: 100%;
  padding: 20px;
  box-sizing: border-box;
}

header {
  margin-bottom: 40px;
}

h1 {
  user-select: none;
  cursor: pointer;
}

.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  animation: fadeIn 0.5s ease;
}

ul {
  text-align: left;
  margin-bottom: 20px;
  padding-left: 20px;
}

li {
  margin-bottom: 10px;
  font-size: 1.2em;
}

button.primary-btn {
  font-size: 1.5em;
  padding: 15px 40px;
  background-color: #646cff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button.primary-btn:hover {
  background-color: #535bf2;
}

button.secondary-btn {
  font-size: 1em;
  padding: 10px 20px;
  background-color: #444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.error {
  color: #ff6b6b;
  text-align: center;
}

.hint {
  max-width: 640px;
  font-size: 0.95em;
  opacity: 0.85;
  text-align: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
