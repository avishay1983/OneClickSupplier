
INSERT INTO public.user_roles (user_id, role)
VALUES ('4024c2d8-002b-4b7f-a31a-06a2d88ef324', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
