export async function rollDsN(dsnRolldata, actor) {
  if (!game.dice3d) return;

  if (
    !actor.hasPlayerOwner &&
    game.settings.get("dice-so-nice", "hideNpcRolls")
  )
    return;
  return game.dice3d.showForRoll(...dsnRolldata);
}
