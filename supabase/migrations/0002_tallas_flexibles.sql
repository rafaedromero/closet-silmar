-- Las etiquetas reales mezclan sistemas: pantalones en M o L, chaquetas en 8.
-- Se permite cualquier talla de la lista en cualquier tipo; "otro" sigue siendo libre.
alter table public.prendas drop constraint talla_valida;

alter table public.prendas add constraint talla_valida check (
  case
    when tipo = 'otro' then length(trim(talla)) > 0
    else talla in ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'Única',
                   '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20')
  end
);
