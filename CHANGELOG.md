# v1.4.1

- **Fix** `Roll#toMessage` not returning anything
  - this resulted in e.g. initiative rolling being broken

# v1.4

- **New Feature** Utility actions and spells generate a roll in the chat window. Thanks to Github User @theMaster23 for implementing this!
- **New Setting** Setting to disable right click to toggle stuff inside the character sheet. Thanks to Github User @Grygon for implementin this!
- **Fix** Attributes used in some item fields like limited uses breaking stuff.
- **New Feature** Now all rolls use the Mars 5e chat card style
  - hidden rolls are really hidden now!
- **New** Bug Reporter support.
  - Use the Bug Reporter module to directly report bugs from inside FVTT!
- **New** Developer Mode Module support
  - Less stray debug logs ( i hope)
- **Fix** Dicepools not working for dmg rolls.
- Modified tooltip position for Tidy5e Sheets item/spellbook view, so it doesn't block vision on the nice "new" popup

# v1.3.1

- **Fix** speaker not being specified correctly, causing issues with other modules like Chat Portrait.
- **Fix** successful saves being stored as hit, which is unintented. Unsuccessful saves are stored as hit now.
- **Fix** Saving throws sometimes not respecting (dis-)advantage.
- **Fix** Now properly hides GM saving throws inside of player chat cards. (E.g. when saving throw gets substituted in)

# v1.3

- Added 2 new translations!
  - French thanks to GitHub user @Nildran
  - German
- _New Feature_ quickly roll (Dis-)Advantage using the modifier keys you may know and love from MidiQoL or BetterRolls!
  - Press Ctrl while clicking to automatically roll disadvantage
  - Press Shift or Alt while clicking to automatically roll advantag
- _Fix_ some more DaE compat fixes...

# v1.2.2

- _Fix_ broken rolling.. sorry for that!

# v1.2.1

- _Fix_ another attempt at fixing DAE ternaries!

# v1.2

- _New Feature_ You can now hide the statistics app from your players.
  - you can still force show it like journals
- _New Feature_ Reset statistics
- _Fix_ Dynamic Active Effects compatibility issues
  - Ternary operations didn't work for DaE. Those and possibly more are (hopefully) fixed. I need user input here, since i don't use that module.
- _Fix_ Tooltip placement in Tidy5e
- _Fix_ now respects DsN "don't show for NPCs" setting.
- _Fix_ Class features like sneak attack
  - the actual fix is nested rolls with flavor inside are fixed now.
- _Fix_ rendering default dice messages not working on startup.

# v1.1

- _New Feature_ Reapply without using resources button - which is useful for just rerolling an item for multiple targets, if basic automation/information is not available. (Like Magic Missile or Scorching Ray)
- _Fix_ damage amount not updating, when not rolling main damage roll.

# v1.0.1

- _Fix_ general rolls for players not working.

# v1.0

- _New Feature_ Autoroll attack and dmg rolls!
  - Setting user based in the settings menu!
- _New Feature_ Support for Calegos Confetti module!
  - throws confetti on crits/fumbles
  - Use at your own risk in combination with auto rolls!
- _New Feature_ Apply damage to all targets buttons!
- _New Feature_ Statistics!
  - track a few of your players statistics, like damage done, damage taken, nat20s/1s, ...
  - Statistics are tracked over the whole worlds time and a session (session stats are reset if >= 6 hours are between updates)
  - Including a small overview window!
  - Future plans:
    - provide awards and/or achievements
    - maybe add a few more statistics
- _New Setting_ Added setting on whether to automatically hide gm rolls or not.
- Improved the AbilityTemplate code to copy less from the original DnD system.
- _Fix_ apply damage buttons for area damage showing "NaN", when saving throw was rolled already
- Area dmg div now removed after it is rolled and applied to the targets
- Advantage is now reset after each throw
- _Fix_ toggling successfull saves not modifying the applied resistance of damage rolls
- _Fix_ some more bugfixes, that i noticed on the way

# v0.3.3

- Advantage selection now gets shown for hotbar items as well.
  - Right-click _will_ toggle, but also show the context menu.. i wanted to quickly have something working there, cause it is a very valid request, but i couldn't think of something better for the time being. If you have an idea on how to tackle this better, please provide some feedback on github!

# v0.3.2

- _Fix_ removed deprecated (and broken) function `Mars5eActor#useSpell`

# v0.3.1

- _Fix_ saving throws not working when no chat message exists
- _Fix_ some rolling behaviours with +0 as modifiers (at least hopefully fixed!)
- _Fix_ Darkmode invis target background...
- Removed popout functionality for the chat cards

# v0.3

- _New_ Dice so Nice support!
- _Fix_ weird css issues in the foundry app, resulting in a blur applied to chat cards when scrolling
- _Fix_ Toolcheck not owrking
- _Fix_ flavorformulas not working
- _Fix_ Apply dmg not correctly updating for AoE spells when there was no target chosen.

# v0.2.3

- Fix styling error for "aoe type" spells

# v0.2.2

- accidently removed localization in last update, fixed this now

# v0.2.1

- Added DnD5e as system requirement.. sorry for that, i forgot to add it! This module is _not_ compatible with other systems!

# v0.2

- Tooltips for everything! (or at least _more_ tooltips to help find what can actually be toggled using right-click)
- Faster animations, buttons inside the chat card are now visible when hovering it.
- Removed many unneeded files.

# v0.1.2

- _Fix_ fumbles still being able to hit, although they shouldn't.
- _Fix_ crits still being able to fail, although they shouldn't.

# v0.1.1

- Added missing description to module.json
- Added this file
- Updated gitignore to ignore .mp4 files for the future
- Fixed a few more module.json things..

# v0.1

- initial (beta) release
