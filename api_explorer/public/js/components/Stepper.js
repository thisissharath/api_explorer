const Stepper = {
  props: ['steps'],
  template: `
    <div class="stepper">
      <div 
        v-for="step in steps" 
        :key="step.id"
        class="step"
        :class="step.state"
      >
        <div class="step-circle">
          <div v-if="step.state === 'processing'" class="step-inner"></div>
          <div v-if="step.state === 'completed' || step.state === 'failed'" class="step-icon"></div>
        </div>
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>
  `
};

export default Stepper;