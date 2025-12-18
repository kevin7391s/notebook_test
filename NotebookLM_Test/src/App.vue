<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { FlowStep, currentStep, setStep, resetFlow } from './state/flow';
import { generateSessionId } from './utils/session';
import OperatorPanel from './components/OperatorPanel.vue';

// Constants
const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
const AUTO_RESET_DELAY = 5000;

// State
const sessionId = ref(generateSessionId());
const titleTapCount = ref(0);
const showOperator = ref(false);
const errorMessage = ref('');
let resetTimer: any = null;

// Computed
const stepLabel = computed(() => {
  switch (currentStep.value) {
    case FlowStep.WELCOME: return 'Step 1 of 3';
    case FlowStep.INSTRUCTIONS: return 'Step 2 of 3';
    case FlowStep.WAIT_RETURN: return 'Step 3 of 3';
    case FlowStep.THANK_YOU: return 'Complete';
    default: return '';
  }
});

// Methods
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
  try {
    await Browser.open({ url: NOTEBOOKLM_URL });
    // Advance flow to wait state after opening
    setStep(FlowStep.WAIT_RETURN);
  } catch (e: any) {
    console.error('Failed to open browser', e);
    errorMessage.value = 'Could not open NotebookLM. Please try again.';
  }
};

const handleReturn = () => {
  setStep(FlowStep.THANK_YOU);
  
  // Auto reset
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    resetToWelcome();
  }, AUTO_RESET_DELAY);
};

const resetToWelcome = () => {
  if (resetTimer) clearTimeout(resetTimer);
  sessionId.value = generateSessionId(); // New session
  resetFlow();
  errorMessage.value = '';
};

// Deep Link Handling
onMounted(() => {
  CapacitorApp.addListener('appUrlOpen', (event) => {
    if (event.url.startsWith('notebooklmbooth://return')) {
      // Close the browser if it's open
      Browser.close().catch(() => {}); 
      handleReturn();
    }
  });
});

onUnmounted(() => {
  CapacitorApp.removeAllListeners();
  if (resetTimer) clearTimeout(resetTimer);
});

// Operator Actions
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
      </div>

      <!-- WAIT_RETURN -->
      <div v-if="currentStep === FlowStep.WAIT_RETURN" class="screen wait">
        <h2>Explore NotebookLM</h2>
        <p>When you are finished exploring, tap the Return link or button below.</p>
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
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
