/**
 * The coach and buddy a child is treated as having chosen before they choose.
 *
 * The settings screen has always shown Melissa pre-selected when the profile is
 * empty, but that fallback lived only inside the component. The robot read the
 * raw database value, found null, and introduced itself as a neutral "Buddy" —
 * so the child saw one thing on screen and heard another on the desk. Both
 * surfaces now resolve the same default from here.
 */
export const DEFAULT_COACH_ID = 'melissa' as const;
export const DEFAULT_BUDDY_ID = 'mario' as const;
