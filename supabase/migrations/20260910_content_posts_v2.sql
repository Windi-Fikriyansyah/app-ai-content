-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: Content Posts V2 — Enhanced Planner Columns
-- Adds: angle, audience_stage, product_reference, content_goal, data_sources
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS angle TEXT,
  ADD COLUMN IF NOT EXISTS audience_stage TEXT,
  ADD COLUMN IF NOT EXISTS product_reference TEXT,
  ADD COLUMN IF NOT EXISTS content_goal TEXT,
  ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '[]'::jsonb;

-- Add comment documentation
COMMENT ON COLUMN public.content_posts.angle IS 'Content angle: common_mistake, how_to, checklist, comparison, myth_vs_fact, faq, beginner_guide, expert_tip, behind_the_scenes, product_education, product_benefit, use_case, seasonal, story, promotion, offer, problem_pain_point, community_question';
COMMENT ON COLUMN public.content_posts.audience_stage IS 'Audience funnel stage: awareness, consideration, conversion, retention';
COMMENT ON COLUMN public.content_posts.product_reference IS 'Name of the referenced product/service from the database, or null';
COMMENT ON COLUMN public.content_posts.content_goal IS 'Content goal: educate, entertain, inspire, convert, engage, inform';
COMMENT ON COLUMN public.content_posts.data_sources IS 'Array of data sources used to generate this content, e.g. ["business_profile", "product:AC Split 1PK"]';
