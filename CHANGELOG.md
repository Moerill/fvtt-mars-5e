# v1.2.2

- *Fix* broken rolling.. sorry for that!


# v1.2.1

- *Fix* another attempt at fixing DAE ternaries!

# v1.2

- *New Feature* You can now hide the statistics app from your players.
  - you can still force show it like journals
- *New Feature* Reset statistics
- *Fix* Dynamic Active Effects compatibility issues
  - Ternary operations didn't work for DaE. Those and possibly more are (hopefully) fixed. I need user input here, since i don't use that module.
- *Fix* Tooltip placement in Tidy5e
- *Fix* now respects DsN "don't show for NPCs" setting.
- *Fix* Class features like sneak attack
  - the actual fix is nested rolls with flavor inside are fixed now.
- *Fix* rendering default dice messages not working on startup.

# v1.1

- *New Feature* Reapply without using resources button - which is useful for just rerolling an item for multiple targets, if basic automation/information is not available. (Like Magic Missile or Scorching Ray)
- *Fix* damage amount not updating, when not rolling main damage roll.

# v1.0.1

- *Fix* general rolls for players not working.

# v1.0

- *New Feature* Autoroll attack and dmg rolls!
  - Setting user based in the settings menu!
- *New Feature* Support for Calegos Confetti module!
  - throws confetti on crits/fumbles
  - Use at your own risk in combination with auto rolls!
- *New Feature* Apply damage to all targets buttons!
- *New Feature* Statistics! 
  - track a few of your players statistics, like damage done, damage taken, nat20s/1s, ...
  - Statistics are tracked over the whole worlds time and a session (session stats are reset if >= 6 hours are between updates)
  - Including a small overview window!
  - Future plans: 
    - provide awards and/or achievements
  	-	maybe add a few more statistics
- *New Setting* Added setting on whether to automatically hide gm rolls or not.
- Improved the AbilityTemplate code to copy less from the original DnD system.
- *Fix* apply damage buttons for area damage showing "NaN", when saving throw was rolled already
- Area dmg div now removed after it is rolled and applied to the targets
- Advantage is now reset after each throw
- *Fix* toggling successfull saves not modifying the applied resistance of damage rolls
- *Fix* some more bugfixes, that i noticed on the way

# v0.3.3

- Advantage selection now gets shown for hotbar items as well.
  - Right-click *will* toggle, but also show the context menu.. i wanted to quickly have something working there, cause it is a very valid request, but i couldn't think of something better for the time being. If you have an idea on how to tackle this better, please provide some feedback on github!

# v0.3.2

- *Fix* removed deprecated (and broken) function ``Mars5eActor#useSpell``

# v0.3.1

- *Fix* saving throws not working when no chat message exists
- *Fix* some rolling behaviours with +0 as modifiers (at least hopefully fixed!)
- *Fix* Darkmode invis target background...
- Removed popout functionality for the chat cards

# v0.3

- *New* Dice so Nice support!
- *Fix* weird css issues in the foundry app, resulting in a blur applied to chat cards when scrolling
- *Fix* Toolcheck not owrking
- *Fix* flavorformulas not working
- *Fix* Apply dmg not correctly updating for AoE spells when there was no target chosen.

# v0.2.3

- Fix styling error for "aoe type" spells

# v0.2.2

- accidently removed localization in last update, fixed this now

# v0.2.1

- Added DnD5e as system requirement.. sorry for that, i forgot to add it! This module is *not* compatible with other systems! 

# v0.2

- Tooltips for everything! (or at least *more* tooltips to help find what can actually be toggled using right-click)
- Faster animations, buttons inside the chat card are now visible when hovering it.
- Removed many unneeded files.

# v0.1.2

- *Fix* fumbles still being able to hit, although they shouldn't.
- *Fix* crits still being able to fail, although they shouldn't.

# v0.1.1

- Added missing description to module.json
- Added this file
- Updated gitignore to ignore .mp4 files for the future
- Fixed a few more module.json things..

# v0.1

- initial (beta) release
