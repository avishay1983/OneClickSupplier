-- Create app settings table for storing configuration values
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.app_settings
FOR SELECT USING (true);

-- Allow public update access
CREATE POLICY "Allow public update access" ON public.app_settings
FOR UPDATE USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert access" ON public.app_settings
FOR INSERT WITH CHECK (true);

-- Insert default master OTP code
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('master_otp_code', '11111');

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();