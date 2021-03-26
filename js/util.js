let allowConfetti = {
  success: true,
  fail: true,
};

export function markSuccess(resultDiv = null) {
  resultDiv?.classList.add("critical");
  if (allowConfetti.success && mars5e.confetti?.crit && window.confetti) {
    shootConfetti(window.confetti.confettiStrength.high);
    allowConfetti.success = false;
    setTimeout(() => {
      allowConfetti.success = true;
    }, 600);
  }
}

export function markFail(resultDiv = null) {
  resultDiv?.classList.add("fumble");
  if (allowConfetti.fail && mars5e.confetti?.crit && window.confetti) {
    shootConfetti(window.confetti.confettiStrength.low);
    allowConfetti.fail = false;
    setTimeout(() => {
      allowConfetti.fail = true;
    }, 600);
  }
}

function shootConfetti(strength) {
  const shootConfettiProps = window.confetti.getShootConfettiProps(strength);
  window.confetti.shootConfetti(shootConfettiProps);
}

export function initConfetti() {
  if (!window.confetti) return;
  game.settings.register("mars-5e", "crit-confetti", {
    name: "MARS5E.settings.confetti.crit.name",
    hint: "MARS5E.settings.confetti.crit.hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: (data) => {
      window.mars5e.confetti.crit = data;
    },
  });
  mars5e.confetti = {
    crit: game.settings.get("mars-5e", "crit-confetti") && !!window.confetti,
  };
}

export function log(data = [], force = false) {
  try {
    const isDebugging = window.DEV?.getPackageDebugValue("mars-5e");

    if (force || isDebugging) {
      if (Array.isArray(data)) console.log("Mars 5e | ", ...data);
      else console.log("Mars 5e | ", data);
    }
  } catch (e) {}
}
