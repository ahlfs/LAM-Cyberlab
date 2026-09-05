export interface HierarchicalModelItem {
  id: string
  name: string
  provider: string
  isLocal?: boolean
  isGroup?: false
  [key: string]: unknown
}

export interface HierarchicalModelGroup {
  name: string
  fullPath: string
  isGroup: true
  children: HierarchicalModelNode[]
  totalModels: number
}

export type HierarchicalModelNode = HierarchicalModelItem | HierarchicalModelGroup

export function isGroupNode(node: HierarchicalModelNode): node is HierarchicalModelGroup {
  return Boolean(node && typeof node === 'object' && 'isGroup' in node && node.isGroup === true)
}

/**
 * Builds a nested tree from a list of model items based on slash '/' prefix segments.
 * Example:
 * - "vps/ag/gemini-2.5-flash" -> Group "vps" -> Group "ag" -> Item "gemini-2.5-flash" (id: "vps/ag/gemini-2.5-flash")
 * - "gpt-4o" -> Item "gpt-4o" (id: "gpt-4o") at root
 */
export function buildModelHierarchy(models: HierarchicalModelItem[]): HierarchicalModelNode[] {
  interface InternalGroup {
    name: string
    fullPath: string
    groups: Map<string, InternalGroup>
    items: HierarchicalModelItem[]
  }

  const rootGroups = new Map<string, InternalGroup>()
  const rootItems: HierarchicalModelItem[] = []

  function getOrCreateGroup(parentMap: Map<string, InternalGroup>, name: string, fullPath: string): InternalGroup {
    let group = parentMap.get(name)
    if (!group) {
      group = {
        name,
        fullPath,
        groups: new Map(),
        items: [],
      }
      parentMap.set(name, group)
    }
    return group
  }

  for (const model of models) {
    const rawId = model.id || ''
    const parts = rawId.split('/').filter(Boolean)

    if (parts.length <= 1) {
      // No prefix / bare model
      rootItems.push({
        ...model,
        isGroup: false,
      })
      continue
    }

    // Has prefixes: e.g. ['vps', 'ag', 'gemini-2.5-flash']
    const prefixes = parts.slice(0, -1)
    const modelLeafName = parts[parts.length - 1]

    let currentParentMap = rootGroups
    let currentPath = ''

    for (let i = 0; i < prefixes.length; i++) {
      const prefix = prefixes[i]
      currentPath = currentPath ? `${currentPath}/${prefix}` : prefix
      const group = getOrCreateGroup(currentParentMap, prefix, currentPath)
      if (i === prefixes.length - 1) {
        // Last group level: add item here
        group.items.push({
          ...model,
          isGroup: false,
          name: model.name && model.name !== model.id ? model.name : modelLeafName,
        })
      } else {
        currentParentMap = group.groups
      }
    }
  }

  function convertInternalGroup(group: InternalGroup): HierarchicalModelGroup {
    const subGroups = Array.from(group.groups.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(convertInternalGroup)

    const items = [...group.items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({ ...item, isGroup: false as const }))

    const children: HierarchicalModelNode[] = [...subGroups, ...items]
    const totalModels = items.length + subGroups.reduce((acc, g) => acc + g.totalModels, 0)

    return {
      name: group.name,
      fullPath: group.fullPath,
      isGroup: true,
      children,
      totalModels,
    }
  }

  const sortedRootGroups = Array.from(rootGroups.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(convertInternalGroup)

  const sortedRootItems = [...rootItems].sort((a, b) => a.name.localeCompare(b.name))

  return [...sortedRootGroups, ...sortedRootItems]
}

/**
 * Filter tree nodes by a search query. Matches if query is in node name, id, fullPath, or matches any children.
 */
export function filterModelHierarchy(nodes: HierarchicalModelNode[], query: string): HierarchicalModelNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes

  const result: HierarchicalModelNode[] = []

  for (const node of nodes) {
    if (isGroupNode(node)) {
      const groupMatches = node.name.toLowerCase().includes(q) || node.fullPath.toLowerCase().includes(q)
      if (groupMatches) {
        // Entire group matches name/path, keep all its children
        result.push(node)
      } else {
        // Check if any children match
        const filteredChildren = filterModelHierarchy(node.children, q)
        if (filteredChildren.length > 0) {
          const totalModels = filteredChildren.reduce((acc, c) => acc + (isGroupNode(c) ? c.totalModels : 1), 0)
          result.push({
            ...node,
            children: filteredChildren,
            totalModels,
          })
        }
      }
    } else {
      const itemMatches =
        node.id.toLowerCase().includes(q) ||
        node.name.toLowerCase().includes(q) ||
        (typeof node.provider === 'string' && node.provider.toLowerCase().includes(q))

      if (itemMatches) {
        result.push(node)
      }
    }
  }

  return result
}

/**
 * Collects all group paths that contain the given model ID.
 * Useful for auto-expanding folders that contain the active model.
 */
export function getAncestorGroupPaths(modelId: string): string[] {
  const parts = (modelId || '').split('/').filter(Boolean)
  if (parts.length <= 1) return []

  const prefixes = parts.slice(0, -1)
  const paths: string[] = []
  let current = ''
  for (const prefix of prefixes) {
    current = current ? `${current}/${prefix}` : prefix
    paths.push(current)
  }
  return paths
}
