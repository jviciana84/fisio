-- Firma manuscrita capturada en el formulario web de bonos (PNG base64).

alter table public.clients
  add column if not exists bono_web_signature_png text;

comment on column public.clients.bono_web_signature_png is
  'Firma manuscrita capturada en la web al solicitar bono (data URL PNG o base64). Complementa el consentimiento por casilla.';
