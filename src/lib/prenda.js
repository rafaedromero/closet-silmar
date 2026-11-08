// Textos visibles de los datos de una prenda
export const ESTADOS = {
  nueva_con_etiqueta: 'Nueva con etiqueta',
  nueva_sin_etiqueta: 'Nueva sin etiqueta',
  usada_como_nueva: 'Usada como nueva',
  usada: 'Usada',
}

const MEDIDAS = {
  busto: 'Busto',
  cintura: 'Cintura',
  cadera: 'Cadera',
  largo: 'Largo',
  manga: 'Manga',
  tiro: 'Tiro',
  hombros: 'Hombros',
}

export function listaMedidas(medidas) {
  return Object.entries(medidas || {})
    .filter(([, v]) => v !== null && v !== '')
    .map(([clave, v]) => ({ nombre: MEDIDAS[clave] || clave, valor: `${v} cm` }))
}
