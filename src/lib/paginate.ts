export async function paginate<T>(
  fetchPage: (
    offset: number,
    size: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  size = 500,
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += size) {
    const { data, error } = await fetchPage(offset, size);
    if (error) throw new Error(error.message);
    if (!data)
      throw new Error("No result returned while loading journal records.");
    all.push(...data);
    if (data.length < size) break;
  }
  return all;
}
