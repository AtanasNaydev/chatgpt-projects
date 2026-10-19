-- Дигитален екип 8. клас: допълнителен отборен режим.
-- Изпълнява се САМО в отделната база на играта за 8. клас.
-- Не изпълнявайте в база на "Мисия 404" за 10. клас.
BEGIN;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS team_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS team_name text;
ALTER TABLE public.participants DROP CONSTRAINT IF EXISTS participant_team_allowed;
ALTER TABLE public.participants ADD CONSTRAINT participant_team_allowed CHECK(team_name IS NULL OR team_name IN ('Пазители','Създатели','Изследователи','Медиатори'));
CREATE INDEX IF NOT EXISTS idx_participants_session_team ON public.participants(session_id,team_name);

CREATE TABLE IF NOT EXISTS public.team_votes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
 participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
 team_name text NOT NULL CHECK(team_name IN ('Пазители','Създатели','Изследователи','Медиатори')),
 mission smallint NOT NULL CHECK(mission BETWEEN 1 AND 5),
 choice_id text NOT NULL CHECK(choice_id IN ('A','B','C')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(participant_id,mission)
);
CREATE INDEX IF NOT EXISTS idx_team_votes_session ON public.team_votes(session_id,team_name,mission);
ALTER TABLE public.team_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_votes FROM anon,authenticated,public;
GRANT SELECT ON public.team_votes TO authenticated;
DROP POLICY IF EXISTS teacher_reads_team_votes ON public.team_votes;
CREATE POLICY teacher_reads_team_votes ON public.team_votes FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.game_sessions s WHERE s.id=team_votes.session_id AND s.teacher_id=auth.uid()));

CREATE OR REPLACE FUNCTION public.session_preview(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public,extensions,pg_temp AS $fn$
DECLARE s public.game_sessions%ROWTYPE; counts jsonb;
BEGIN
 IF upper(btrim(coalesce(p_code,''))) !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' THEN
   RAISE EXCEPTION 'Невалиден код';
 END IF;
 SELECT * INTO s FROM public.game_sessions WHERE code=upper(btrim(p_code));
 IF NOT FOUND OR s.status='ended' THEN RAISE EXCEPTION 'Няма активна игра с този код'; END IF;
 SELECT jsonb_object_agg(team_name,n) INTO counts FROM
 (SELECT team_name,count(*)::int AS n FROM public.participants WHERE session_id=s.id AND team_name IS NOT NULL GROUP BY team_name) t;
 RETURN jsonb_build_object('status',s.status,'team_mode',s.team_mode,'title',s.title,'team_counts',coalesce(counts,'{}'::jsonb));
END $fn$;
REVOKE ALL ON FUNCTION public.session_preview(text) FROM public;
GRANT EXECUTE ON FUNCTION public.session_preview(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.student_join_v2(p_code text,p_nickname text,p_token text,p_team text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public,extensions,pg_temp AS $fn$
DECLARE s public.game_sessions%ROWTYPE; pid uuid; nn text; th text; normalized_team text;
BEGIN
 nn:=btrim(coalesce(p_nickname,'')); th:=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
 IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{32,150}$' THEN RAISE EXCEPTION 'Невалиден ученически токен'; END IF;
 IF char_length(nn)<2 OR char_length(nn)>22 OR nn ~ '[@<>]' OR nn ~ '[0-9]{5}' THEN RAISE EXCEPTION 'Използвай псевдоним без лични данни'; END IF;
 SELECT * INTO s FROM public.game_sessions WHERE code=upper(btrim(coalesce(p_code,''))) FOR UPDATE;
 IF NOT FOUND OR s.status='ended' THEN RAISE EXCEPTION 'Сесията не е налична'; END IF;
 IF (SELECT count(*) FROM public.participants WHERE session_id=s.id)>=40 THEN RAISE EXCEPTION 'Сесията е запълнена'; END IF;
 IF EXISTS(SELECT 1 FROM public.participant_secrets WHERE token_hash=th) THEN RAISE EXCEPTION 'Вече има участник от това устройство'; END IF;
 IF s.team_mode THEN
   normalized_team:=btrim(coalesce(p_team,''));
   IF normalized_team NOT IN ('Пазители','Създатели','Изследователи','Медиатори') THEN
     RAISE EXCEPTION 'Избери един от четирите отбора';
   END IF;
 ELSE normalized_team:=NULL;
 END IF;
 INSERT INTO public.participants(session_id,nickname,team_name) VALUES(s.id,nn,normalized_team) RETURNING id INTO pid;
 INSERT INTO public.participant_secrets(participant_id,token_hash) VALUES(pid,th);
 RETURN jsonb_build_object('ok',true,'status',s.status,'nickname',nn,'team_name',normalized_team,'team_mode',s.team_mode);
END $fn$;
REVOKE ALL ON FUNCTION public.student_join_v2(text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.student_join_v2(text,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.team_vote(p_token text,p_mission int,p_choice text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public,extensions,pg_temp AS $fn$
DECLARE pid uuid; sid uuid; team text; mode boolean; status text; solved_count int; actual text;
BEGIN
 SELECT p.id,p.session_id,p.team_name,s.team_mode,s.status INTO pid,sid,team,mode,status
 FROM public.participant_secrets ps JOIN public.participants p ON p.id=ps.participant_id
 JOIN public.game_sessions s ON s.id=p.session_id
 WHERE ps.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Невалиден ученически достъп'; END IF;
 IF NOT mode OR team IS NULL THEN RAISE EXCEPTION 'Тази игра не използва отбори'; END IF;
 IF status <> 'active' THEN RAISE EXCEPTION 'Играта трябва да е активна'; END IF;
 IF p_mission NOT BETWEEN 1 AND 5 OR p_choice NOT IN ('A','B','C') THEN RAISE EXCEPTION 'Невалиден избор'; END IF;
 SELECT count(*) INTO solved_count FROM public.answers WHERE participant_id=pid AND mission=p_mission AND solved;
 IF solved_count<>4 THEN RAISE EXCEPTION 'Завърши четирите индивидуални задачи преди отборното решение'; END IF;
 INSERT INTO public.team_votes(session_id,participant_id,team_name,mission,choice_id)
 VALUES(sid,pid,team,p_mission,p_choice)
 ON CONFLICT(participant_id,mission) DO NOTHING;
 SELECT choice_id INTO actual FROM public.team_votes WHERE participant_id=pid AND mission=p_mission;
 RETURN jsonb_build_object('ok',true,'choice_id',actual,'already_voted',(actual<>p_choice));
END $fn$;
REVOKE ALL ON FUNCTION public.team_vote(text,int,text) FROM public;
GRANT EXECUTE ON FUNCTION public.team_vote(text,int,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.student_state(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public,extensions,pg_temp AS $fn$
DECLARE pid uuid; sid uuid; nn text; team text; refl text; st text; sc text; title text; mode boolean;
        rows_json jsonb; own_votes jsonb; tallies jsonb; members int; cnt int; total int;
BEGIN
 SELECT p.id,p.session_id,p.nickname,p.team_name,p.reflection INTO pid,sid,nn,team,refl
 FROM public.participant_secrets ps JOIN public.participants p ON p.id=ps.participant_id
 WHERE ps.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
 IF NOT FOUND THEN RAISE EXCEPTION 'Невалидна ученическа сесия'; END IF;
 SELECT status,code,title,team_mode INTO st,sc,title,mode FROM public.game_sessions WHERE id=sid;
 SELECT count(*) FILTER(WHERE solved),coalesce(sum(points),0),coalesce(jsonb_agg(
 jsonb_build_object('mission',mission,'step',step,'solved',solved,'points',points,'attempts',attempts,'hint_used',hint_used,'skipped',skipped,'wrong_choices',wrong_choices)
 ORDER BY mission,step),'[]'::jsonb)
 INTO cnt,total,rows_json FROM public.answers WHERE participant_id=pid;
 SELECT coalesce(jsonb_agg(jsonb_build_object('mission',mission,'choice_id',choice_id) ORDER BY mission),'[]'::jsonb)
 INTO own_votes FROM public.team_votes WHERE participant_id=pid;
 IF mode AND team IS NOT NULL THEN
   SELECT count(*) INTO members FROM public.participants WHERE session_id=sid AND team_name=team;
   SELECT coalesce(jsonb_agg(jsonb_build_object('mission',v.mission,'choice_id',v.choice_id,'votes',v.cnt)),'[]'::jsonb)
   INTO tallies FROM (SELECT mission,choice_id,count(*)::int cnt FROM public.team_votes
     WHERE session_id=sid AND team_name=team GROUP BY mission,choice_id ORDER BY mission,choice_id) v;
 ELSE
   members:=0;tallies:='[]'::jsonb;
 END IF;
 UPDATE public.participants SET last_seen_at=now() WHERE id=pid AND last_seen_at<now()-interval '45 seconds';
 RETURN jsonb_build_object('status',st,'code',sc,'title',title,'nickname',nn,'completed',cnt,'total',total,
   'answers',rows_json,'reflection',refl,'team_mode',mode,'team_name',team,
   'team_votes',own_votes,'team_tallies',tallies,'team_members',members);
END $fn$;
REVOKE ALL ON FUNCTION public.student_state(text) FROM public;
GRANT EXECUTE ON FUNCTION public.student_state(text) TO anon,authenticated;
COMMIT;