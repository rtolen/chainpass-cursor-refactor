-- Create admin performance scores table
CREATE TABLE public.admin_performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  total_actions INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  efficiency_score NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  rank INTEGER,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_user_id)
);

-- Create admin badges table
CREATE TABLE public.admin_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin earned badges junction table
CREATE TABLE public.admin_earned_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.admin_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_user_id, badge_id)
);

-- Create indexes
CREATE INDEX idx_performance_scores_admin ON public.admin_performance_scores(admin_user_id);
CREATE INDEX idx_performance_scores_rank ON public.admin_performance_scores(rank);
CREATE INDEX idx_performance_scores_score ON public.admin_performance_scores(overall_score DESC);
CREATE INDEX idx_earned_badges_admin ON public.admin_earned_badges(admin_user_id);
CREATE INDEX idx_earned_badges_badge ON public.admin_earned_badges(badge_id);

-- Enable RLS
ALTER TABLE public.admin_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_earned_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance scores
CREATE POLICY "Admins can view all performance scores"
ON public.admin_performance_scores
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage performance scores"
ON public.admin_performance_scores
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for badges
CREATE POLICY "Admins can view badges"
ON public.admin_badges
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage badges"
ON public.admin_badges
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for earned badges
CREATE POLICY "Admins can view all earned badges"
ON public.admin_earned_badges
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage earned badges"
ON public.admin_earned_badges
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_performance_scores_updated_at
BEFORE UPDATE ON public.admin_performance_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default badges
INSERT INTO public.admin_badges (badge_code, name, description, icon, tier, requirement_type, requirement_value) VALUES
('first_action', 'First Steps', 'Completed your first admin action', '👶', 'bronze', 'total_actions', 1),
('action_master_100', 'Action Master', 'Completed 100 admin actions', '⚡', 'silver', 'total_actions', 100),
('action_legend_500', 'Action Legend', 'Completed 500 admin actions', '🌟', 'gold', 'total_actions', 500),
('action_titan_1000', 'Action Titan', 'Completed 1000 admin actions', '👑', 'platinum', 'total_actions', 1000),
('speedster', 'Speedster', 'Average response time under 5 minutes', '🚀', 'gold', 'avg_response_time', 5),
('quality_expert', 'Quality Expert', 'Quality score above 90', '💎', 'gold', 'quality_score', 90),
('efficiency_pro', 'Efficiency Pro', 'Efficiency score above 85', '⚙️', 'silver', 'efficiency_score', 85),
('week_warrior', 'Week Warrior', '7 day activity streak', '🔥', 'silver', 'streak_days', 7),
('month_champion', 'Month Champion', '30 day activity streak', '🏆', 'gold', 'streak_days', 30),
('elite_performer', 'Elite Performer', 'Overall score above 95', '🌠', 'diamond', 'overall_score', 95);