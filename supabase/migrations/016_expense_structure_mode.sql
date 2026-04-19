-- Modo de estructura (predecible vs variable) persistido; el simulador puede seguir usando categoría como respaldo.

alter table public.expenses
  add column if not exists structure_mode text;

alter table public.expenses
  drop constraint if exists expenses_structure_mode_check;

alter table public.expenses
  add constraint expenses_structure_mode_check check (
    structure_mode is null or structure_mode in ('strict', 'variable')
  );

comment on column public.expenses.structure_mode is
  'strict = fijo predecible (sin margen 10 % en estructura), variable = colchón 10 %; null = puntual o legado sin dato.';

-- Heurística inicial por categoría (misma lógica que classifyCategory en app)
update public.expenses e
set structure_mode = case
  when e.recurrence = 'none' then null
  when e.category ~* 'alquiler|seguro|aut[oó]nom|gestor|software|licencia|amort|sueldo|n[oó]mina|cuota|asesor|contabil|mutua|ibi|basuras'
    then 'strict'
  else 'variable'
end
where e.structure_mode is null and e.recurrence <> 'none';
