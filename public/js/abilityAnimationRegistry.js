// =====================
// FILE: public/js/abilityAnimationRegistry.js
// Ability-triggered animation registry + helpers.
// =====================

const ABILITY_EVENT_TYPES = Object.freeze({
  dash: "anim:dash",
  phase: "anim:phase",
  teleport: "anim:teleport",
  explode: "anim:explode"
});

const EVENT_TO_ABILITY = Object.freeze(Object.entries(ABILITY_EVENT_TYPES)
  .reduce((acc, [skillId, eventType]) => {
    acc[eventType] = skillId;
    return acc;
  }, {}));

const DEFAULT_TRIGGER_TARGET = "effects[].params.progress";

function cloneValue(value) {
  if (!value || typeof value !== "object") return value;
  return structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function resolveAbilityEffectForEvent(eventType, config = {}) {
  if (!eventType || typeof eventType !== "string") return null;
  const skillId = EVENT_TO_ABILITY[eventType];
  if (!skillId) return null;
  const abilityEffects = config.abilityEffects || {};
  if (Object.prototype.hasOwnProperty.call(abilityEffects, skillId)) {
    return abilityEffects[skillId] ?? null;
  }
  return config.defaultAbilityEffect ?? null;
}

function buildAbilityEffectRegistry(config = {}) {
  const registry = {};
  Object.values(ABILITY_EVENT_TYPES).forEach((eventType) => {
    const definition = resolveAbilityEffectForEvent(eventType, config);
    if (!definition) return;
    registry[eventType] = definition;
  });
  return registry;
}

function resolveTriggeredTarget(target, effectIndex) {
  if (!target) {
    if (effectIndex === null || effectIndex === undefined) return null;
    return DEFAULT_TRIGGER_TARGET.replace("effects[]", `effects[${effectIndex}]`);
  }
  if (target.includes("effects[]")) {
    if (effectIndex === null || effectIndex === undefined) return null;
    return target.replace("effects[]", `effects[${effectIndex}]`);
  }
  return target;
}

function buildTriggeredAnimationLayer(registry = {}) {
  const effects = [];
  const animations = [];

  Object.entries(registry).forEach(([eventType, definition]) => {
    if (!definition || typeof definition !== "object") return;
    const effect = definition.effect ? cloneValue(definition.effect) : null;
    const animation = definition.animation ? cloneValue(definition.animation) : null;
    let effectIndex = null;

    if (effect) {
      effectIndex = effects.length;
      effects.push(effect);
    }

    if (animation) {
      const resolvedTarget = resolveTriggeredTarget(animation.target, effectIndex);
      if (!resolvedTarget) return;
      const params = { ...(animation.params || {}) };
      if (!params.eventType) params.eventType = eventType;
      animations.push({
        ...animation,
        target: resolvedTarget,
        params,
        triggeredBy: animation.triggeredBy || eventType
      });
    }
  });

  return { effects, animations };
}

function mergeTriggeredAnimationLayer(style = {}, layer = {}) {
  if (!layer || (!layer.effects?.length && !layer.animations?.length)) return style;
  const baseEffects = Array.isArray(style.effects) ? style.effects : [];
  const baseAnimations = Array.isArray(style.animations) ? style.animations : [];
  return {
    ...style,
    effects: baseEffects.concat(layer.effects || []),
    animations: baseAnimations.concat(layer.animations || [])
  };
}

export {
  ABILITY_EVENT_TYPES,
  resolveAbilityEffectForEvent,
  buildAbilityEffectRegistry,
  buildTriggeredAnimationLayer,
  mergeTriggeredAnimationLayer
};
