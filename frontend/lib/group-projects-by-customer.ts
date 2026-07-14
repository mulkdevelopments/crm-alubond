export type CustomerProjectGroup<T extends { developer: string }> = {
  customer: string;
  projects: T[];
};

export function groupProjectsByCustomer<T extends { developer: string }>(
  projects: T[],
): CustomerProjectGroup<T>[] {
  const map = new Map<string, T[]>();

  for (const project of projects) {
    const customer = project.developer.trim() || 'Unknown customer';
    const key = customer.toLowerCase();
    const list = map.get(key);
    if (list) {
      list.push(project);
    } else {
      map.set(key, [project]);
    }
  }

  return [...map.values()]
    .map((groupProjects) => ({
      customer: groupProjects[0]!.developer.trim() || 'Unknown customer',
      projects: [...groupProjects].sort((a, b) => {
        const nameA = 'name' in a && typeof a.name === 'string' ? a.name : '';
        const nameB = 'name' in b && typeof b.name === 'string' ? b.name : '';
        return nameA.localeCompare(nameB);
      }),
    }))
    .sort((a, b) => a.customer.localeCompare(b.customer));
}
