# Connection feature

Iframe bridge + manual JSON import. Modal mở từ Header button.

Spec: [../../../../docs/features/connection.md](../../../../docs/features/connection.md)

## Files (sẽ build dần)
- `ConnectionModal.tsx` — Dialog 2 tab (Auto / Manual)
- `IframeBridge.tsx` — render iframe + bind `useDataBridge`
- `ManualImport.tsx` — textarea + Import button → `normalizeImported`
