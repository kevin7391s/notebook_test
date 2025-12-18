import { ref } from 'vue';

export enum FlowStep {
  WELCOME = 'WELCOME',
  INSTRUCTIONS = 'INSTRUCTIONS',
  WAIT_RETURN = 'WAIT_RETURN',
  THANK_YOU = 'THANK_YOU'
}

export const currentStep = ref<FlowStep>(FlowStep.WELCOME);

export function setStep(step: FlowStep) {
  currentStep.value = step;
}

export function resetFlow() {
  currentStep.value = FlowStep.WELCOME;
}
