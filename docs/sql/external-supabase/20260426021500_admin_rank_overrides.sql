CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_rank_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL CHECK (total_xp >= 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_rank_overrides ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.user_rank_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_rank_overrides TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_rank_overrides'
      AND policyname = 'Public rank overrides are viewable by everyone'
  ) THEN
    CREATE POLICY "Public rank overrides are viewable by everyone"
    ON public.user_rank_overrides
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_rank_overrides'
      AND policyname = 'Admins can insert rank overrides'
  ) THEN
    CREATE POLICY "Admins can insert rank overrides"
    ON public.user_rank_overrides
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_current_user_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_rank_overrides'
      AND policyname = 'Admins can update rank overrides'
  ) THEN
    CREATE POLICY "Admins can update rank overrides"
    ON public.user_rank_overrides
    FOR UPDATE
    TO authenticated
    USING (public.is_current_user_admin())
    WITH CHECK (public.is_current_user_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_rank_overrides'
      AND policyname = 'Admins can delete rank overrides'
  ) THEN
    CREATE POLICY "Admins can delete rank overrides"
    ON public.user_rank_overrides
    FOR DELETE
    TO authenticated
    USING (public.is_current_user_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_user_rank_overrides_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_rank_overrides_updated_at ON public.user_rank_overrides;

CREATE TRIGGER update_user_rank_overrides_updated_at
BEFORE UPDATE ON public.user_rank_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_user_rank_overrides_updated_at();

CREATE OR REPLACE FUNCTION public.admin_list_users_for_rank_management(
  search_input text DEFAULT NULL,
  result_limit integer DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  email text,
  display_name text,
  total_xp integer,
  override_total_xp integer,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_search text := NULLIF(trim(search_input), '');
  capped_limit integer := LEAST(GREATEST(COALESCE(result_limit, 50), 1), 200);
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can manage rank overrides';
  END IF;

  RETURN QUERY
  SELECT
    auth_user.id,
    COALESCE(auth_user.email, ''),
    COALESCE(
      NULLIF(rank_snapshot.display_name, ''),
      NULLIF(auth_user.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(auth_user.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(auth_user.email, ''), '@', 1),
      'Student'
    ) AS display_name,
    COALESCE(rank_override.total_xp, rank_snapshot.total_xp, 0)::integer AS total_xp,
    rank_override.total_xp::integer AS override_total_xp,
    COALESCE(rank_override.updated_at, rank_snapshot.updated_at, auth_user.created_at) AS updated_at
  FROM auth.users AS auth_user
  LEFT JOIN public.user_rank_snapshots AS rank_snapshot
    ON rank_snapshot.user_id = auth_user.id
  LEFT JOIN public.user_rank_overrides AS rank_override
    ON rank_override.user_id = auth_user.id
  WHERE
    normalized_search IS NULL
    OR auth_user.email ILIKE '%' || normalized_search || '%'
    OR COALESCE(rank_snapshot.display_name, '') ILIKE '%' || normalized_search || '%'
    OR COALESCE(auth_user.raw_user_meta_data ->> 'full_name', '') ILIKE '%' || normalized_search || '%'
    OR COALESCE(auth_user.raw_user_meta_data ->> 'name', '') ILIKE '%' || normalized_search || '%'
  ORDER BY COALESCE(rank_override.updated_at, rank_snapshot.updated_at, auth_user.created_at) DESC NULLS LAST,
           auth_user.email ASC
  LIMIT capped_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users_for_rank_management(text, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_set_user_rank_override(UUID, integer);

CREATE OR REPLACE FUNCTION public.admin_set_user_rank_override(
  target_user_id UUID,
  total_xp_input integer
)
RETURNS SETOF public.user_rank_overrides
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can manage rank overrides';
  END IF;

  -- NOTE: returning SETOF user_rank_overrides (rather than RETURNS TABLE
  -- with named columns) avoids an "ambiguous user_id" error caused by
  -- OUT parameter names shadowing column references in the INSERT body.
  RETURN QUERY
  INSERT INTO public.user_rank_overrides (
    user_id,
    total_xp,
    updated_by
  )
  VALUES (
    target_user_id,
    GREATEST(COALESCE(total_xp_input, 0), 0),
    auth.uid()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = EXCLUDED.total_xp,
    updated_by = auth.uid(),
    updated_at = now()
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_rank_override(UUID, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_user_rank_override(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can manage rank overrides';
  END IF;

  DELETE FROM public.user_rank_overrides
  WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_user_rank_override(UUID) TO authenticated;
