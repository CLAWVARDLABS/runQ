export async function pageLang(searchParams) {
  const params = await searchParams;
  return params?.lang === 'en' ? 'en' : 'zh';
}

