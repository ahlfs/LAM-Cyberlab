import type { LinkuView } from '@/server/linku-db'

export type LinkuMode =
  | { kind: 'folders' }
  | { kind: 'folder'; folderId: number }
  | { kind: 'view'; view: LinkuView }
