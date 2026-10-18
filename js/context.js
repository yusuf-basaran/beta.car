export const params = new URLSearchParams(location.search);
const category = { '/kullanilmis': 'kullanilmis', '/sifir': 'sifir', '/parca': 'parca' }[
  location.pathname
];
if (category && !params.has('kategori')) params.set('kategori', category);
