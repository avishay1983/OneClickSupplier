-- Insert default values for approval emails if they don't exist
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
  ('car_manager_email', ''),
  ('vp_email', '')
ON CONFLICT (setting_key) DO NOTHING;