import type { PostStage } from '../query/post-generator.query'

export const STAGE_LABEL: Record<PostStage, string> = {
  researching: 'Researching sources',
  planning: 'Planning the angle',
  writing: 'Writing the draft',
  reviewing: 'Reviewing the draft',
  revising: 'Applying edits',
}

/**
 * What each stage is actually spending the time on. The labels name the step;
 * these say why it is taking a minute, which is the question someone watching
 * an empty editor is really asking.
 */
export const STAGE_DETAIL: Record<PostStage, string> = {
  researching: 'Searching for facts worth citing',
  planning: 'Choosing the angle and the hook',
  writing: 'Drafting it in your voice',
  reviewing: 'A critic is reading the draft',
  revising: "Applying the critic's notes",
}

/** The order the generator moves through, for a progress list. */
export const STAGE_ORDER: PostStage[] = [
  'researching',
  'planning',
  'writing',
  'reviewing',
]

/**
 * `revising` is a loop back to writing rather than a step of its own, so it
 * shares the writing row instead of adding a fifth one that appears and
 * disappears as the critic sends drafts back.
 */
export function stageRow(stage: PostStage): PostStage {
  return stage === 'revising' ? 'writing' : stage
}
