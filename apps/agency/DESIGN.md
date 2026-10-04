---
name: Beacon & Bold agency catalog
description: Flat catalog desk for operators. Bone ground, ink type, one signal mark, square corners.
colors:
  signal: "#FF5A1F"
  ink: "#0E0E0D"
  bone: "#F1EEE7"
typography:
  display:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.04em"
rounded:
  none: "0px"
spacing:
  field: "6px"
  tight: "8px"
  stack: "12px"
  card: "16px"
  band: "20px"
  gutter: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Design System: Beacon & Bold agency catalog

## Overview

**Creative North Star: "The proof sheet"**

This records the catalog shell that is already on screen. It is a flat proof sheet: bone paper, ink rules, and one signal mark. The sheet is a working surface for operators, not a marketing page. Density stays high enough to edit every offer and package without a second visual language.

Corners are square. Depth comes from a 1px ink rule, not from shadow. Signal is the publish button, the featured package mark, the error rule, and the text selection. It is not a second theme.

**Key Characteristics:**

- Bone is the page color. The name stays bone.
- Ink is the text and the hairline rule.
- Signal sits on ink for the primary button, including hover.
- Bricolage Grotesque carries the titles. JetBrains Mono carries labels, prices, and buttons.
- Radius is 0 everywhere.

## Colors

Three flat colors. No gray ramp and no dark theme.

### Primary

- **Signal** (#FF5A1F): The publish button fill, the featured package outline, the error and unsaved rule, and the text selection. Text on signal is ink.

### Neutral

- **Bone** (#F1EEE7): The page, the fields, and the secondary button. This is the brand color. Do not rename it cream.
- **Ink** (#0E0E0D): Text, borders, and the keyboard focus ring.

### Named Rules

**The Signal on Ink Rule.** The primary button, at rest and on hover, is signal fill with ink text. It does not switch to an ink fill.

**The Bone Rule.** The ground is bone. A detector that calls it cream is still looking at bone. Do not recolor the page to satisfy that name.

## Typography

**Display Font:** Bricolage Grotesque (with sans-serif)
**Body Font:** Bricolage Grotesque (with sans-serif)
**Label/Mono Font:** JetBrains Mono (with monospace)

**Character:** The grotesque is the voice of the titles. The mono is the voice of the catalog data: labels, prices, origins, and button names. Weights in use are 400 and 600, which are the faces the app loads.

### Hierarchy

- **Display** (600, 40px, line-height 0.95): The Beacon & Bold name.
- **Headline** (600, 28px): Section titles and the large price figure.
- **Title** (600, 22px): Offer and package titles.
- **Body** (400, 18px, line-height 1.45): Summaries and the pricing note.
- **Label** (400, 13px, letter-spacing 0.04em, uppercase on buttons): Field names, meta lines, and actions.

### Named Rules

**The Loaded Weight Rule.** Headings use 600. The app does not ask the browser to fake a heavier weight.

## Layout

The sheet is a centered column (max 1180px) with 24px side padding. The editor and the preview sit in two columns with a 28px gap. Below 860px those columns, the top bar, and the price pair each become one column. Spacing on the page is 6px inside a field, 8px between buttons, 12px between stacked cards, 16px inside a card, and 28px between the editor and the preview.

## Elevation & Depth

The sheet is flat. There is no shadow vocabulary. A 1px ink border separates the editor, the preview, and each card. The featured package adds a 2px signal outline inside its ink border.

### Named Rules

**The Flat Sheet Rule.** Do not add a drop shadow, a glow, or a blurred panel. State is a color already in the sheet: signal for the mark, ink for the focus ring.

## Shapes

Every corner is square (0px). Borders are 1px solid ink, except the primary button, whose border is signal so it matches the fill.

## Components

### Buttons

- **Shape:** Square (0px).
- **Primary:** Signal fill, ink text, 12px 16px padding, at least 44px tall. The label is JetBrains Mono, 13px, uppercase.
- **Hover / Focus:** Hover stays signal on ink. Focus is a 2px ink outline, 2px outside the control. Ink is the ring because a signal ring on bone does not clear 3:1.
- **Secondary:** Bone fill, ink text, ink border. Hover keeps bone and ink, and turns the border signal.
- **Disabled:** The same fills as the enabled button. The cursor waits, and the label changes to Saving... or Publishing... Opacity is not used, because fading ink and signal together drops the text under 4.5:1.

### Cards / Containers

- **Corner Style:** Square (0px).
- **Background:** Bone.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** 1px ink. The featured package also has a 2px signal outline.
- **Internal Padding:** 16px.

### Inputs / Fields

- **Style:** Bone fill, 1px ink border, square corners, at least 44px tall. The caret is ink.
- **Focus:** The same 2px ink outline as every other control.
- **Error:** The preview failure and the unsaved line use a signal border. The text stays ink on bone.

### Navigation

The top bar is the name, the origin, and the two actions. It is not a marketing navigation. There is no second menu.

## Do's and Don'ts

### Do:

- **Do** keep primary hover as signal fill with ink text.
- **Do** call the ground bone.
- **Do** keep radius at 0.
- **Do** use Bricolage Grotesque for titles and JetBrains Mono for labels, prices, and buttons.
- **Do** keep text and controls at least 44px tall, and keep disabled buttons at full ink-on-signal or ink-on-bone contrast.

### Don't:

- **Don't** invent a fourth color, a dark theme, or a cream rename for bone.
- **Don't** turn the primary hover into ink on ink.
- **Don't** round a corner or add a shadow to make the sheet look softer.
- **Don't** publish from this document. It records the shell. It does not change the catalog.
