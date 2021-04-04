export function initAutomatedAnimations() {
  if (!game.modules.get("automated-jb2a-animations")?.active) return;
  Hooks.on(
    "mars-5e.AtackRollComplete",
    ({ source, target = null, targets = [], item, success } = {}) => {
      if (target) targets = [{ target, success }];
      //targets = targets.filter((e) => e.success);
      AutoAnimations.playAnimation(
        source,
        targets.map((e) => e.target),
        item
      );
    }
  );
  Hooks.on(
    "mars-5e.DamageRollComplete",
    ({ source, target, targets = [], item } = {}) => {
      if (item.hasAttack) return;

      if (target) targets = [target];

      AutoAnimations.playAnimation(source, targets, item);
    }
  );
}
