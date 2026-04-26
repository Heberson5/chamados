-- Fix security warning for mutable function search path
ALTER FUNCTION generate_os_number() SET search_path = public;
