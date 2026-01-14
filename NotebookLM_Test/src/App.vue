<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FlowStep, currentStep, setStep, resetFlow } from './state/flow';
import { generateSessionId } from './utils/session';
import OperatorPanel from './components/OperatorPanel.vue';

// --------------------
// Constants
// --------------------

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
let inAppBrowserRef: any = null;

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

  const platform = Capacitor.getPlatform();

  if (platform === 'web' || platform === 'ios' || platform === 'android') {
    // Use Cordova InAppBrowser to open with hidden URL bar
    // location=no hides the address bar
    // toolbar=no hides the toolbar (if possible on specific OS versions)
    // fullscreen=yes attempts to enter fullscreen
    inAppBrowserRef = (window as any).cordova?.InAppBrowser?.open(
      NOTEBOOKLM_URL, 
      '_blank', 
      'location=no,toolbar=no,zoom=no,presentationstyle=fullscreen,clearcache=no,clearsessioncache=no'
    );
    const ref = inAppBrowserRef;

    // Listen for custom exit signal (intercept dummy URL to avoid unknown scheme error)
    ref.addEventListener('loadstart', (event: any) => {
        if (event.url && event.url.includes('exit-booth-signal')) {
            handleReturn();
        }
    });

     // If InAppBrowser is not available (e.g. strict web dev mode without simulation), fallback:
    if (!ref) {
       window.open(NOTEBOOKLM_URL, '_blank');
    } else {
       // --- Key Feature: Inject CSS to hide elements ---
       // We listen for the 'loadstop' event, which fires when the page finishes loading.
       ref.addEventListener('loadstop', () => {
          console.log("NotebookLM loaded - Attempting to inject CSS...");

          // 1. DEBUG: Red Border. If you see this, injection IS working.
          // 2. We use 'executeScript' creating a <style> tag which is often more reliable than insertCSS.
          const cssToInject = `
            /* Settings */
            [role="button"][aria-label*="Settings" i],
            button[aria-label*="Settings" i]{
            display:none !important;
            pointer-events:none !important;
            opacity:0 !important;
            }

            /* Google apps launcher */
            [role="button"][aria-label*="Google apps" i]{
            display:none !important;
            pointer-events:none !important;
            opacity:0 !important;
            }

            /* Account avatar */
            [role="button"][aria-label^="Google Account:"],
            [role="button"][aria-label*="Google Account" i],
            a[href*="accounts.google.com"],
            /* Extra robust selectors based on your screenshot structure */
            #gb .gb_Cd,
            .gb_Cd,
            .gb_A, 
            header img {
            display:none !important;
            pointer-events:none !important;
            opacity:0 !important;
            }
          `;

          // Inject via JS Script -> Style Tag (More Robust)
          ref.executeScript({ 
            code: `
              (function() {
                // 1. Inject Styles
                var style = document.createElement('style');
                style.textContent = ${JSON.stringify(cssToInject)};
                document.head.appendChild(style);
                console.log("BOOTH: Styles Injected");

                // 2. Auto-Click "Interactive mode"
                var attempts = 0;
                var maxAttempts = 10; // Try for ~60 seconds
                
                function maintainBoothState() {
                    // Hijack Restart Audio Button
                    var restartBtn = document.querySelector('button[aria-label="Restart audio"]');
                    
                    if (restartBtn) {
                         // 1. Behavior Hijack
                         if (!restartBtn.hasAttribute('data-booth-hijack')) {
                             console.log("BOOTH: Found Restart audio button. Adding hijack listener.");
                             restartBtn.setAttribute('data-booth-hijack', 'true');
                             restartBtn.addEventListener('click', function(e) {
                                 console.log("BOOTH: User clicked Restart -> Exiting");
                                 // Navigate to a safe HTTPS URL that we intercept
                                 window.location.href = 'https://notebooklm.google.com/exit-booth-signal';
                             }, true);
                         }
                         
                         // 2. Visual Hijack (Change UI to "END")
                         // We continuously enforce this in case the SPA re-renders the button content
                         if (restartBtn.textContent !== 'END') {
                             restartBtn.textContent = 'END';
                             // Apply forceful styling to ensure it looks like an exit button
                             // We use !important to override Google's Material Design styles
                             restartBtn.setAttribute('style', \`
                               background-color: #ff4444 !important;
                               color: white !important;
                               border-radius: 24px !important;
                               padding: 0 20px !important;
                               font-family: sans-serif !important;
                               font-weight: bold !important;
                               font-size: 14px !important;
                               text-transform: uppercase !important;
                               min-width: 80px !important;
                               height: 48px !important;
                               display: flex !important;
                               align-items: center !important;
                               justify-content: center !important;
                               box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                               z-index: 9999 !important;
                             \`);
                         }
                    }
                }

                // CHECK STATE: If we find our session flag, restore active state immediately
                if (sessionStorage.getItem('booth_interactive_active') === 'true') {
                     console.log("BOOTH: Interactive state active (from session storage). Restoring maintenance.");
                     maintainBoothState();
                     setInterval(maintainBoothState, 1000);
                }

                // Auto-Clicker Logic
                var attempts = 0;
                var maxAttempts = 10; // Try for ~60 seconds

                var intervalId = setInterval(function() {
                  attempts++;
                  var btn = document.querySelector('button[aria-label="Interactive mode"]');
                  
                  if (btn) {
                    console.log("BOOTH: Found 'Interactive mode' button. Clicking...");
                    
                    // SAVE STATE: Mark that we have clicked it
                    sessionStorage.setItem('booth_interactive_active', 'true');
                    
                    btn.click();
                    clearInterval(intervalId);

                    // 3. Inject and Maintain Booth State (Exit Btn + Hijack)
                    maintainBoothState();
                    setInterval(maintainBoothState, 1000);
                    
                  } else if (attempts >= maxAttempts) {
                    // If we time out, we might ALREADY be in the view (if session storage didn't work?)
                    // But if session storage works, the check at the top handles it.
                    console.log("BOOTH: 'Interactive mode' button not found after timeout.");
                    clearInterval(intervalId);
                  }
                }, 1000);
              })();
            `
          });
       });
    }

    setStep(FlowStep.WAIT_RETURN);
    return;
  }
};

const handleReturn = () => {
  setStep(FlowStep.THANK_YOU);

  if (inAppBrowserRef) {
    inAppBrowserRef.close();
    inAppBrowserRef = null;
  }

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
