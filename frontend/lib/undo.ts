// Hands a just-deleted set of transactions from one screen to another (e.g. from the edit modal
// back to the list), so the list can offer "Cofnij" after the modal has closed.
let pending: { message: string; records: any[] } | null = null;

export const setPendingUndo = (message: string, records: any[]) => {
  pending = records.length > 0 ? { message, records } : null;
};

export const takePendingUndo = () => {
  const p = pending;
  pending = null;
  return p;
};
