<script setup lang="ts">
import { FlowStep } from '../state/flow';

defineProps<{
  sessionId: string;
  currentStep: FlowStep;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'reset'): void;
  (e: 'jumpToInstructions'): void;
  (e: 'openNotebook'): void;
  (e: 'simulateReturn'): void;
}>();
</script>

<template>
  <div v-if="isVisible" class="operator-overlay">
    <div class="operator-panel">
      <h2>Operator Panel</h2>
      <div class="status">
        <p><strong>Session ID:</strong> {{ sessionId }}</p>
        <p><strong>Current Step:</strong> {{ currentStep }}</p>
      </div>
      
      <div class="actions">
        <button @click="emit('reset')">Reset to Welcome</button>
        <button @click="emit('jumpToInstructions')">Jump to Instructions</button>
        <button @click="emit('openNotebook')">Open NotebookLM</button>
        <button @click="emit('simulateReturn')">Simulate Return</button>
        <button class="close-btn" @click="emit('close')">Close Operator</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.operator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.operator-panel {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  color: #333;
}

.status {
  margin-bottom: 20px;
  font-size: 0.9em;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  text-align: left;
}

.status p {
  margin: 5px 0;
  word-break: break-all;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

button {
  padding: 10px;
  background: #eee;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
}

button.close-btn {
  background: #ffdddd;
  margin-top: 10px;
}
</style>
