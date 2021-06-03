export default function templateAutotargeting() {
  /**
   * This code is heavily based (mostly copied) on https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
   * licensed unter LGPLv3 https://gitlab.com/foundrynet/dnd5e/-/blob/master/LICENSE.txt
   */
  class AbilityTemplate extends game.dnd5e.canvas.AbilityTemplate {
    constructor(...args) {
      super(...args);

      this._updateTargets = (child, layer, idx) => {
        if (child !== this) return;
        this.layer.preview.off("childRemoved", this._updateTargets);
        this.item.updateTargets();
      };
    }
    static fromItem(item) {
      const template = super.fromItem(item);
      template.item = item;
      return template;
    }
    refresh() {
      super.refresh();
      this.getTargets();
    }

    isTokenInside(token) {
      const grid = canvas.scene.data.grid,
        templatePos = { x: this.data.x, y: this.data.y };
      // Check for center of  each square the token uses.
      // e.g. for large tokens all 4 squares
      const startX = token.width >= 1 ? 0.5 : token.width / 2;
      const startY = token.height >= 1 ? 0.5 : token.height / 2;
      for (let x = startX; x < token.width; x++) {
        for (let y = startY; y < token.height; y++) {
          const currGrid = {
            x: token.x + x * grid - templatePos.x,
            y: token.y + y * grid - templatePos.y,
          };
          const contains = this.shape.contains(currGrid.x, currGrid.y);
          if (contains) return true;
        }
      }
      return false;
    }

    getTargets() {
      const tokens = canvas.scene.getEmbeddedCollection("Token");
      let targets = [];

      for (const token of tokens)
        if (this.isTokenInside(token.data)) {
          targets.push(token.id);
        }
      game.user.updateTokenTargets(targets);
    }
    activatePreviewListeners(initialLayer) {
      this.layer.preview.on("childRemoved", this._updateTargets);
      super.activatePreviewListeners(initialLayer);
    }

    destroy(...args) {
      this.item.updateTargets();
      super.destroy(args);
    }
  }

  game.dnd5e.canvas.AbilityTemplate = AbilityTemplate;
}
