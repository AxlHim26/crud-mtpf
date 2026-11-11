type ItemInput = { title: string; description: string };

export function validateItem(input: ItemInput): ItemInput {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 120) throw new Error('Tên cần có từ 1 đến 120 ký tự.');
  if (description.length > 2000) throw new Error('Mô tả tối đa 2000 ký tự.');
  return { title, description };
}

